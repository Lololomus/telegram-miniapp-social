// react/feed/FeedApp.js
import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

import {
    t, postJSON, useDebounce, 
    POPULAR_SKILLS, ALL_RECOGNIZED_SKILLS, // 🔥 Импорт
    isIOS, QuickFilterTags, ProfileFallback, PhoneShell, EmptyState, TopSpacer
} from './feed_utils.js';

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
  
  // Стейты
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const listContainerRef = useRef(null);

  // ✅ Объединенный список
  const visibleQuickTags = useMemo(() => {
      const combined = [...selectedSkills, ...POPULAR_SKILLS];
      return Array.from(new Set(combined));
  }, [selectedSkills]);

  // --- ХЕЛПЕР ---
  const syncInputs = useCallback((value) => {
      setSearchQuery(value);
      const inputs = [
          document.getElementById('feed-search-input'),
          document.getElementById('global-search-input')
      ];
      inputs.forEach(input => {
          if (input && input.value !== value) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
          }
      });
  }, []);

  // --- ИНИЦИАЛИЗАЦИЯ ---
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    const checkConfig = () => {
        if (cancelled) return;
        if (window.__CONFIG && window.__CONFIG.backendUrl) {
            setCfg(window.__CONFIG);
            return;
        }
        pollCount++;
        if (pollCount < 20) setTimeout(checkConfig, 100);
        else setIsLoading(false);
    };
    checkConfig();
    return () => { cancelled = true; };
  }, []);

  // --- ЗАГРУЗКА ---
  useEffect(() => {
    if (!cfg || !cfg.backendUrl) return;
    setIsLoading(true);
    const fetchProfiles = async () => {
      try {
        const resp = await postJSON(`${cfg.backendUrl}/get-all-profiles`, { initData: tg?.initData });
        if (resp?.ok) {
            const loadedProfiles = resp.profiles || [];
            setProfiles(loadedProfiles);
            setFiltered(loadedProfiles);
        } else {
            setProfiles([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, [cfg]);

  // --- УМНЫЙ ПОИСК ---
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;
    
    const onInput = (e) => { 
        const val = e.target.value || '';
        setSearchQuery(val); 

        const terms = val.split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);

        const detectedSkills = ALL_RECOGNIZED_SKILLS.filter(skill => 
            terms.includes(skill.toLowerCase())
        );

        const currentStr = selectedSkills.slice().sort().join('|');
        const newStr = detectedSkills.slice().sort().join('|');

        if (currentStr !== newStr) {
            setSelectedSkills(detectedSkills);
        }
    };
    
    input.addEventListener('input', onInput); 
    return () => { input.removeEventListener('input', onInput); };
  }, [selectedSkills]);

  // --- ВНЕШНИЕ СОБЫТИЯ ---
  useEffect(() => {
    const handleSetMode = (event) => {
        if (!event.detail) return;

        if (Array.isArray(event.detail.skills)) {
            setSelectedSkills(event.detail.skills);
            syncInputs(event.detail.skills.join(', '));
        }

        if (typeof event.detail.status !== 'undefined') {
            setStatusFilter(event.detail.status);
        }
        };

    const handleGlobalFilter = async (e) => {
        if (e.detail && e.detail.source === 'feed') {
            if (!window.SkillsManager) return;

            const result = await window.SkillsManager.select(selectedSkills, {
            showStatus: true,
            initialStatus: statusFilter,
            statusVariant: 'profiles',
            returnTo: 'feed-container',
            });

            if (result) {
            setStatusFilter(result.status || null);
            setSelectedSkills(result.skills);
            syncInputs(result.skills.join(', '));
            }
        }
        };

    document.addEventListener('set-feed-mode', handleSetMode);
    document.addEventListener('openSkillsModal', handleGlobalFilter);
    return () => {
        document.removeEventListener('set-feed-mode', handleSetMode);
        document.removeEventListener('openSkillsModal', handleGlobalFilter);
    };
  }, [selectedSkills, syncInputs, statusFilter]);


  // --- ФИЛЬТРАЦИЯ ---
  useEffect(() => {
  const qLower = debouncedSearchQuery.trim().toLowerCase();
  const hasSearch = !!qLower;
  const hasSkills = selectedSkills.length > 0;
  const hasStatus = !!statusFilter;

  if (!hasSearch && !hasSkills && !hasStatus) {
    setFiltered(profiles);
    return;
  }

  const next = profiles.filter((p) => {
    // 1) Фильтр по статусу профиля
    if (hasStatus && p.status !== statusFilter) {
      return false;
    }

    // 2) Навыки
    let skillsArray = [];
    try { skillsArray = JSON.parse(p.skills || '[]'); } catch (e) {}
    if (!Array.isArray(skillsArray)) skillsArray = [];

    if (hasSkills) {
      const matchesSkills = selectedSkills.every((s) =>
        skillsArray.some((userSkill) => userSkill.toLowerCase() === s.toLowerCase())
      );
      if (!matchesSkills) return false;
    }

    // 3) Поиск по тексту
    if (hasSearch) {
      const isSearchMatchingSkills =
        hasSkills && selectedSkills.join(', ').toLowerCase() === qLower;
      if (isSearchMatchingSkills) return true;

      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const about = (p.bio || '').toLowerCase();
      const skillsText = skillsArray.join(' ').toLowerCase();
      const terms = qLower
        .replace(/,/g, ' ')
        .split(' ')
        .map((s) => s.trim())
        .filter(Boolean);

      return terms.every(
        (term) =>
          fullName.includes(term) ||
          about.includes(term) ||
          skillsText.includes(term)
      );
    }

    return true;
  });

  setFiltered(next);
}, [profiles, debouncedSearchQuery, selectedSkills, statusFilter]);


  // --- UI Хэндлеры ---
  const onToggleSkill = useCallback((skill) => {
      if (skill === null) { setSelectedSkills([]); syncInputs(''); return; }
      
      const lowerSkill = skill.toLowerCase();
      let newSkills;
      if (selectedSkills.some(s => s.toLowerCase() === lowerSkill)) {
          newSkills = selectedSkills.filter(s => s.toLowerCase() !== lowerSkill);
      } else {
          const canonical = ALL_RECOGNIZED_SKILLS.find(s => s.toLowerCase() === lowerSkill) || skill;
          newSkills = [...selectedSkills, canonical];
      }
      
      setSelectedSkills(newSkills);
      syncInputs(newSkills.join(', '));
  }, [selectedSkills, syncInputs]);

  const onOpen = useCallback(async (user) => {
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
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
    setSelectedSkills([]);
    setStatusFilter(null);
    syncInputs('');
    };

  const filterKey = JSON.stringify({ s: debouncedSearchQuery, k: selectedSkills.length });

  return h('div', { style: { padding: '0 12px 12px', position: 'relative', minHeight: '200px' } },
    h(TopSpacer),
    h(AnimatePresence, { mode: 'wait' },
        (isLoading)
            ? h(motion.div, { key: 'skeleton', initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, style: { position: 'absolute', top: 0, left: '12px', width: 'calc(100% - 24px)', pointerEvents: 'none' } }, h(SkeletonList, null))
            : h(FeedList, { key: `feed-list-${filterKey}`, profiles: filtered, onOpen: onOpen, containerRef: listContainerRef })
    ),
    h(EmptyState, { text: t('feed_empty'), visible: !isLoading && filtered.length === 0, onReset: handleResetFilters }),
    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, null, selected && h(ProfileSheet, { user: selected, onClose }))
    ),
    quickFiltersHost && createPortal(
        h(QuickFilterTags, { skills: visibleQuickTags, selected: selectedSkills, onToggle: onToggleSkill, hasSearchText: searchQuery.trim().length > 0 }),
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