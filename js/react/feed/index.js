// react/feed/index.js (ESM)
// (Бывший /js/react-feed.js)
//
// Этот файл был очищен от ~160 строк кода компонентов.
// Он теперь содержит ТОЛЬКО главный компонент App (логику)
// и импортирует все UI-компоненты.

import React, { useState, useEffect, useRef, useLayoutEffect, Suspense, memo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// --- ИМПОРТ ОБЩЕГО КОМПОНЕНТА ---
// Путь из /react/feed/ в /react/shared/
const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

// --- ИМПОРТЫ ИЗ ЛОКАЛЬНЫХ УТИЛИТ ---
// (utils.js ре-экспортирует все из shared/utils.js)
import {
    t,
    postJSON,
    useDebounce,
    POPULAR_SKILLS,
    isIOS,
    QuickFilterTags,
    ProfileFallback,
    PhoneShell,
    EmptyState,
    TopSpacer
} from './utils.js';

// --- ИМПОРТЫ ЛОКАЛЬНЫХ КОМПОНЕНТОВ ---
import FeedList from './FeedList.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

// --- Находим хост для быстрых фильтров ---
const quickFiltersHost = document.getElementById('feed-quick-filters');


/**
 * * Главный компонент-контейнер
 * (Содержит всю логику и состояние)
 * */
function App({mountInto, overlayHost}) {
  const [cfg, setCfg] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [allSkills, setAllSkills] = useState(POPULAR_SKILLS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const listContainerRef = useRef(null);
  
  // Поллинг конфига
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 20;
    
    const waitForConfig = () => {
      if (cancelled) return;
      
      if (window.__CONFIG) {
        console.log("✅ React-feed: Конфиг найден!");
        setCfg(window.__CONFIG);
        return;
      }
      
      pollCount++;
      if (pollCount >= MAX_POLLS) {
        console.error("❌ React-feed: Конфиг не найден после 5 секунд!");
        return;
      }
      
      console.log(`⏳ React-feed: Ожидание конфига... (${pollCount}/${MAX_POLLS})`);
      setTimeout(waitForConfig, 250);
    };
    
    waitForConfig();
    
    return () => { cancelled = true; };
  }, []);

  // Загрузка профилей
  useEffect(() => {
    let cancelled = false;
    
    const fetchProfiles = async () => {
      if (!cfg || !cfg.backendUrl) {
        console.warn("⚠️ React-feed: Конфиг не готов");
        return;
      }
      
      console.log("⏳ React-feed: Загружаем профили...");
      try {
        const resp = await postJSON(`${cfg.backendUrl}/get-all-profiles`, { 
          initData: tg?.initData 
        });
        
        if (!cancelled && resp?.ok) {
          const allProfiles = resp.profiles || [];
          setProfiles(allProfiles);
          setFiltered(allProfiles);
          console.log(`✅ React-feed: Загружено ${allProfiles.length} профилей`);
        } else {
          console.error("❌ React-feed: Ошибка загрузки профилей", resp);
        }
      } catch (e) {
        console.error("❌ React-feed: Исключение:", e);
      }
    };

    if (cfg) {
      fetchProfiles();
    }

    return () => { cancelled = true; };
  }, [cfg]);

  // Фильтрация (с исправленным поиском)
  useEffect(() => {
    const qLower = debouncedSearchQuery.toLowerCase();

    if (!qLower) {
      setFiltered(profiles);
      return;
    }
    
    setFiltered(profiles.filter(p => {
      const skills = (() => { try { return p.skills ? JSON.parse(p.skills).join(' ') : ''; } catch { return ''; } })();
      const corpus = [p.first_name, p.bio, p.job_title, p.company, p.nationality_code, skills].filter(Boolean).join(' ').toLowerCase();
      
      // ИСПРАВЛЕННАЯ ЛОГИКА (заменяем запятые на пробелы)
      const searchTerms = qLower.replace(/,/g, ' ').split(' ').map(s => s.trim()).filter(Boolean);
      return searchTerms.every(term => corpus.includes(term));
    }));
    
  }, [debouncedSearchQuery, profiles]);
  
  // Слушатель инпута (с исправлением бага "стирания")
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    // ИСПРАВЛЕНИЕ: onInput только обновляет searchQuery
    const onInput = () => {
      setSearchQuery(input.value);
    };

    input.addEventListener('input', onInput);
    return () => input.removeEventListener('input', onInput);
  }, [allSkills]);

  // Этот useEffect обновляет input.value, ЕСЛИ мы выбрали тег
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    const newInputValue = selectedSkills.join(', ');
    
    // Обновляем searchQuery, что запустит debounce
    setSearchQuery(newInputValue); 

    if (input.value !== newInputValue) {
        input.value = newInputValue;
    }
  }, [selectedSkills]);

  // Слушатель кнопки "Навыки" (для app.js)
  useEffect(() => {
    const skillButton = document.getElementById('open-skills-modal-button-feed');
    if (!skillButton) return;

    const handleClick = () => {
        console.log("REACT (feed): Skill button clicked.");
        const event = new CustomEvent('openSkillsModal', {
            detail: {
                source: 'feed',
                skills: selectedSkills
            }
        });
        document.dispatchEvent(event);
    };

    skillButton.addEventListener('click', handleClick);
    return () => skillButton.removeEventListener('click', handleClick);

  }, [selectedSkills]);

  // Слушатель 'set-feed-mode' (из app.js)
  useEffect(() => {
    const handleSetMode = (event) => {
      if (event.detail && Array.isArray(event.detail.skills)) {
        console.log("REACT (Feed): Получена команда set-feed-mode", event.detail.skills);
        setSelectedSkills(event.detail.skills);
        
        const input = document.getElementById('feed-search-input');
        if (input && input.value !== event.detail.skills.join(', ')) {
          input.value = event.detail.skills.join(', ');
        }
      }
    };
    document.addEventListener('set-feed-mode', handleSetMode);
    return () => {
      document.removeEventListener('set-feed-mode', handleSetMode);
    };
  }, []);

  // Коллбэк для нажатия на тег
  const onToggleSkill = (skill) => {
    setSelectedSkills(prev => {
        const isSelected = prev.includes(skill);
        if (isSelected) {
            return prev.filter(s => s !== skill);
        } else {
            return [...prev, skill];
        }
    });
  };

  // --- Коллбэки для модальных окон ---
  const onOpen = async (u) => {
    try{
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
      const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: u.user_id });
      if (resp?.ok) setSelected(resp.profile || u);
      else setSelected(u);
    } catch { setSelected(u); }
  };

  const onClose = ()=> setSelected(null);

  // --- РЕНДЕРИНГ ---
  return h('div',{style:{padding:'0 12px 12px'}},
    h(TopSpacer),
    
    filtered.length > 0
      ? h(FeedList,{profiles:filtered, onOpen, containerRef: listContainerRef})
      : h(EmptyState, { text: t('feed_empty') }),

    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, null, 
            selected && h(ProfileSheet, {user:selected, onClose})
        )
    ),

    quickFiltersHost && createPortal(
      h(QuickFilterTags, {
          skills: allSkills,
          selected: selectedSkills,
          onToggle: onToggleSkill
      }),
      quickFiltersHost
    )
  );
}

// --- Монтирование ---
function mountReactFeed() {
  if (!window.REACT_FEED) return;

  const hostList = document.querySelector('#feed-list');
  const overlayHost = document.querySelector('#feed-container');
  if (!hostList || !overlayHost) return;

  hostList.innerHTML = '';

  const root = createRoot(hostList);
  root.render(h(PhoneShell, null, h(App, { mountInto: hostList, overlayHost })));

  return () => root.unmount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactFeed);
} else {
  mountReactFeed();
}