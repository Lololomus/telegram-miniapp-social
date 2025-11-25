// react/feed/FeedApp.js
import React, { useState, useEffect, useRef, Suspense, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

import {
    t, postJSON, useDebounce, POPULAR_SKILLS, isIOS, QuickFilterTags, ProfileFallback, PhoneShell, EmptyState, TopSpacer
} from './feed_utils.js';

// Убедись, что путь правильный относительно этого файла
import { SkeletonList } from '../posts/Skeleton.js'; 
import FeedList from './FeedList.js';

const quickFiltersHost = document.getElementById('feed-quick-filters');

function App({ mountInto, overlayHost }) {
  const [cfg, setCfg] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [allSkills] = useState(POPULAR_SKILLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const listContainerRef = useRef(null);

  // --- 1. ИНИЦИАЛИЗАЦИЯ КОНФИГА (ИСПРАВЛЕНО) ---
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    
    const checkConfig = () => {
        if (cancelled) return;
        
        // Если конфиг уже есть в window
        if (window.__CONFIG && window.__CONFIG.backendUrl) {
            console.log("✅ FeedApp: Config found:", window.__CONFIG);
            setCfg(window.__CONFIG);
            return;
        }

        // Если нет, пробуем еще раз через 100мс (до 20 раз)
        pollCount++;
        if (pollCount < 20) {
            setTimeout(checkConfig, 100);
        } else {
            console.error("❌ FeedApp: Config timeout. Backend URL not found.");
            setIsLoading(false); // Останавливаем вечную загрузку
        }
    };

    checkConfig();
    return () => { cancelled = true; };
  }, []);

  // --- 2. ЗАГРУЗКА ДАННЫХ ---
  useEffect(() => {
    if (!cfg || !cfg.backendUrl) return;
    
    console.log("📡 FeedApp: Fetching profiles...");
    setIsLoading(true);
    
    const fetchProfiles = async () => {
      try {
        // Используем endpoint /get-all-profiles
        const resp = await postJSON(`${cfg.backendUrl}/get-all-profiles`, { initData: tg?.initData });
        if (resp?.ok) {
            const loadedProfiles = resp.profiles || [];
            console.log(`✅ FeedApp: Loaded ${loadedProfiles.length} profiles`);
            setProfiles(loadedProfiles);
            // Сразу ставим filtered, чтобы не было мигания пустотой
            setFiltered(loadedProfiles);
        } else {
            console.warn("⚠️ FeedApp: Response not ok", resp);
            setProfiles([]);
        }
      } catch (e) {
        console.error("❌ FeedApp: Fetch error", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, [cfg]);

  // --- 3. ФИЛЬТРАЦИЯ ---
  useEffect(() => {
    const qLower = debouncedSearchQuery.trim().toLowerCase();
    
    // Если нет фильтров - показываем всё
    if (!qLower && selectedSkills.length === 0) {
      setFiltered(profiles);
      return;
    }

    const next = profiles.filter((p) => {
      let skillsArray = [];
      try { skillsArray = JSON.parse(p.skills || '[]'); } catch (e) {}
      if (!Array.isArray(skillsArray)) skillsArray = [];

      // Фильтр по навыкам (ВСЕ выбранные должны присутствовать)
      const matchesSkills = selectedSkills.length === 0 || selectedSkills.every(s => 
          skillsArray.some(userSkill => userSkill.toLowerCase() === s.toLowerCase())
      );
      
      if (!matchesSkills) return false;
      if (!qLower) return true;

      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const about = (p.bio || '').toLowerCase();
      const skillsText = skillsArray.join(' ').toLowerCase();

      return fullName.includes(qLower) || about.includes(qLower) || skillsText.includes(qLower);
    });

    setFiltered(next);
  }, [profiles, debouncedSearchQuery, selectedSkills]);

  // --- UI BINDINGS ---
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;
    
    // Синхронизация ввода
    const onInput = () => setSearchQuery(input.value || '');
    input.addEventListener('input', onInput);
    
    // Инициализация значения (если перешли с другой вкладки)
    if (input.value !== searchQuery) setSearchQuery(input.value);

    return () => input.removeEventListener('input', onInput);
  }, []);

  // Слушаем внешние изменения режима (например, сброс)
  useEffect(() => {
    const handleSetMode = (event) => {
      if (event.detail && Array.isArray(event.detail.skills)) {
        setSelectedSkills(event.detail.skills);
      }
    };
    document.addEventListener('set-feed-mode', handleSetMode);
    return () => document.removeEventListener('set-feed-mode', handleSetMode);
  }, []);

  const onToggleSkill = useCallback((skill) => {
      if (skill === null) { setSelectedSkills([]); return; }
      setSelectedSkills(prev => {
          if (prev.includes(skill)) return prev.filter(s => s !== skill);
          return [...prev, skill];
      });
  }, []);

  const onOpen = useCallback(async (user) => {
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
      
      // Optimistic update
      setSelected(user);
      
      if (!cfg?.backendUrl) return;
      try {
          const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: user.user_id });
          if (resp?.ok && resp.profile) {
              setSelected(curr => (curr && curr.user_id === user.user_id) ? resp.profile : curr);
          }
      } catch(e) {}
  }, [cfg]);

  const onClose = useCallback(() => setSelected(null), []);
  
  const handleResetFilters = () => {
      setSearchQuery('');
      setSelectedSkills([]);
      const input = document.getElementById('feed-search-input');
      if (input) input.value = '';
  };

  // Уникальный ключ для сброса скролла списка при смене фильтров
  const filterKey = JSON.stringify({ s: debouncedSearchQuery, k: selectedSkills.length });

  return h('div', { style: { padding: '0 12px 12px', position: 'relative', minHeight: '200px' } },
    h(TopSpacer),

    h(AnimatePresence, { mode: 'wait' },
        (isLoading)
            ? h(motion.div, {
                key: 'skeleton',
                initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
                style: { position: 'absolute', top: 0, left: '12px', width: 'calc(100% - 24px)', pointerEvents: 'none' }
              }, h(SkeletonList, null))
            
            : h(FeedList, {
                key: `feed-list-${filterKey}`,
                profiles: filtered,
                onOpen: onOpen,
                containerRef: listContainerRef
              })
    ),

    h(EmptyState, { 
        text: t('feed_empty'), 
        visible: !isLoading && filtered.length === 0,
        onReset: handleResetFilters
    }),

    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, null, selected && h(ProfileSheet, { user: selected, onClose }))
    ),

    quickFiltersHost && createPortal(
        h(QuickFilterTags, { skills: allSkills, selected: selectedSkills, onToggle: onToggleSkill }),
        quickFiltersHost
    )
  );
}

function mountReactFeed() {
  if (!window.REACT_FEED) return;
  const host = document.getElementById('feed-list');
  const overlay = document.getElementById('feed-container');
  if (!host) return;
  
  const root = createRoot(host);
  root.render(h(PhoneShell, null, h(App, { mountInto: host, overlayHost: overlay })));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountReactFeed);
else mountReactFeed();