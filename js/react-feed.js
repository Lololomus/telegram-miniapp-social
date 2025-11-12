// js/react-feed.js  (ESM)
// ИСПРАВЛЕНО (FLIP): Добавлена ручная FLIP-анимация (УДАЛЕНО)
// ИСПРАВЛЕНО: layout="position"
// ИСПРАВЛЕНО: debounce для поиска
// ИСПРАВЛЕНО: React.lazy для ProfileSheet
// ✅ НОВОЕ: React.memo для FeedCard
// ✅ НОВОЕ: loading="lazy" для аватаров
// ✅ ИСПРАВЛЕНИЕ #7: Добавлена заглушка EmptyState
// ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Для этого файла изменения не потребовались

// ✅ ИЗМЕНЕНИЕ: Добавляем Suspense и memo
import React, { useState, useEffect, useRef, useLayoutEffect, Suspense, memo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
const h = React.createElement;

// --- ИМПОРТ ОБЩЕГО КОМПОНЕНТА ---
// (ИЗМЕНЕНИЕ) Импортируем ProfileSheet "лениво"
const ProfileSheet = React.lazy(() => import('./react-shared.js').then(module => ({ default: module.ProfileSheet })));

// --- Утилиты и окружение ---
const tg = window.Telegram?.WebApp;
const t = (k, d={}) => {
  const dict = {
    // ✅ ИСПРАВЛЕНИЕ #7: Ключ 'feed_empty' теперь используется
    'feed_empty': 'Ничего не найдено',
    'job_not_specified': 'Опыт не указан',
    'links': 'Ссылки',
    'skills': 'Навыки',
    'experience': 'Опыт работы',
    'education': 'Образование',
    'present_time': 'по наст. время'
  };
  let s = dict[k] || k;
  Object.entries(d).forEach(([k,v])=>{ s = s.replace(new RegExp(`{${k}}`,'g'), v); });
  return s;
};

async function postJSON(url, body) {
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
  }
  return await res.json();
}

// --- (ИЗМЕНЕНИЕ) Простая debounce-функция ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// ✅ НОВОЕ (ИСПРАВЛЕНИЕ #7): Компонент-заглушка
function EmptyState({ text }) {
  return h('div', {
    style: {
      textAlign: 'center',
      padding: '40px 20px',
      color: 'var(--main-hint-color, #999)',
      fontSize: '16px',
      opacity: 0.8
    }
  }, text || 'Ничего не найдено');
}

const POPULAR_SKILLS = [
  "Python", "JavaScript", "Java", "C#", "C++", "Go",
  "React", "Vue", "Angular", "Node.js", "Django", "Spring",
  "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "Git", "Figma", "AWS"
].sort((a, b) => a.localeCompare(b));

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
console.log(`🍎 React-feed: iOS detected: ${isIOS}`);

function QuickFilterTags({ skills, selected, onToggle }) {
  if (!skills || skills.length === 0) return null;

  return skills.map(skill => h('button', {
    key: skill,
    className: `skill-tag skill-tag--filter ${selected.includes(skill) ? 'is-selected' : ''}`,
    'data-skill': skill,
    onClick: () => onToggle(skill),
  }, skill));
}

function PhoneShell({children}) {
  return h('div', { style:{
    position:'relative', width:'100%', minHeight:'100%',
    color:'var(--main-text-color, var(--tg-theme-text-color, #000000))'
  }}, children);
}

function TopSpacer() {
  return h('div', {style:{height: '0px'}});
}

const cardVariants = isIOS 
  ? {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      },
      exit: { opacity: 0, transition: { duration: 0.1 } }
    }
  : {
      hidden: { opacity: 0, x: -20 },
      visible: (i) => ({ 
        opacity: 1, 
        x: 0,
        transition: {
          delay: i * 0.1,
          duration: 0.4,
          ease: "easeOut"
        }
      }),
      exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
    };

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
        when: "beforeChildren",
        staggerChildren: isIOS ? 0.05 : 0.1, // Ускоряем stagger на iOS
        delayChildren: 0.1
    }
  }
};


// ✅ НОВОЕ: Оборачиваем FeedCard в React.memo
const FeedCard = memo(function FeedCard({u, index, onOpen}) {
  const job = u.job_title && u.company ? `${u.job_title} в ${u.company}` :
             u.job_title || u.company || t('job_not_specified');
  const skills = (()=> { try { return u.skills ? JSON.parse(u.skills) : []; } catch { return []; } })();
  const avatar = u.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${u.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';

  const skillsContainerRef = useRef(null);
  const [hiddenSkillsCount, setHiddenSkillsCount] = useState(0);

  useEffect(() => {
    let timeoutId;
    const debounceMeasure = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(measureSkills, 50);
    };

    const measureSkills = () => {
      if (skillsContainerRef.current && skills.length > 0) {
        const container = skillsContainerRef.current;
        const tags = Array.from(container.children).filter(
          (child) => child.tagName === 'SPAN' && !child.classList.contains('feed-card-skills-more')
        );

        if (tags.length <= 1) {
          setHiddenSkillsCount(0);
          return;
        }

        const firstTagOffsetTop = tags[0].offsetTop;
        let countOnFirstLine = 0;

        for (let i = 0; i < tags.length; i++) {
          if (tags[i].offsetTop > firstTagOffsetTop + 5) {
            break;
          }
          countOnFirstLine++;
        }

        const hiddenCount = skills.length - countOnFirstLine;
        setHiddenSkillsCount(hiddenCount > 0 ? hiddenCount : 0);

      } else {
        setHiddenSkillsCount(0);
      }
    };

    const initialMeasureTimeoutId = setTimeout(measureSkills, 100);
    window.addEventListener('resize', debounceMeasure);

    return () => {
        clearTimeout(initialMeasureTimeoutId);
        clearTimeout(timeoutId);
        window.removeEventListener('resize', debounceMeasure);
    };
  }, [skills]);

  return h(motion.button, {
    // (ИЗМЕНЕНИЕ) Убираем data-flip-id
    
    // (ИЗМЕНЕНИЕ) Возвращаем layout="position"
    layout: "position",
    
    variants: cardVariants,
    custom: isIOS ? undefined : index,
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    
    // (ИЗМЕНЕНИЕ) Добавляем transition
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },

    onClick: () => onOpen(u),
    className: 'react-feed-card',
    style: {
      width: '100%', 
      textAlign: 'left', 
      borderRadius: 12,
      padding: 12,
      cursor: 'pointer'
      // ✅ ИСПРАВЛЕНИЕ (Item 1): Убран marginBottom: '12px'
    }
  },
    h('div', {style: {display: 'flex', alignItems: 'center', gap: 12}},
      h('div', {
        style: {height: 44, width: 44, borderRadius: '50%', background: 'var(--secondary-bg-color)', overflow: 'hidden', flexShrink: 0}
      }, h('img', {
          src: avatar, 
          alt: '', 
          // ✅ НОВОЕ: Добавляем lazy loading
          loading: 'lazy',
          style: {width: '100%', height: '100%', objectFit: 'cover'}
        })
      ),
      h('div', {style: {minWidth: 0}},
        h('div', {
          style: {fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'}
        }, u.first_name || 'User'),
        h('div', {
          style: {opacity: .8, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'}
        }, job)
      ),
    ),

    skills && skills.length > 0 && h('div', {
      ref: skillsContainerRef,
      className: 'feed-card-skills-container'
    },
      ...skills.map(s => h('span', { key: s, className: 'skill-tag skill-tag--display' }, s)),
      hiddenSkillsCount > 0 && h('span', {
        className: 'feed-card-skills-more'
      }, `+${hiddenSkillsCount}`)
    )
  );
}); // ✅ НОВОЕ: Закрываем React.memo

function FeedList({profiles, onOpen, containerRef}) {
  return h(motion.div, {
    ref: containerRef,
    variants: listVariants,
    initial: "hidden",
    animate: "visible",
    // ✅ ИСПРАВЛЕНИЕ (Item 1): Добавлены flex, flexDirection и gap
    style: { 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }
  },
    h(AnimatePresence, {
      mode: isIOS ? "sync" : "popLayout",
      initial: false
    },
      profiles.map((p, index) => h(FeedCard, {
        key: p.user_id, // Ключ critical
        u: p, 
        index: index,
        onOpen: onOpen
      }))
    )
  );
}

const quickFiltersHost = document.getElementById('feed-quick-filters');

// ✅ НОВОЕ: Простой Suspense fallback
function ProfileFallback() {
    return h('div', {
        style: {
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.5)'
        }
    },
        h('div', {
            style: {
                width: 40,
                height: 40,
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }
        })
    );
}

function App({mountInto, overlayHost}) {
  const [cfg, setCfg] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [allSkills, setAllSkills] = useState(POPULAR_SKILLS);
  
  // --- (ИЗМЕНЕНИЕ) Состояние для поискового запроса ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  
  // --- (ИЗМЕНЕНИЕ) Применяем debounce к поисковому запросу ---
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms задержка

  const listContainerRef = useRef(null);
  
  // (ИЗМЕНЕНИЕ) Удаляем вызов useFlipAnimation
  
  // ✅ ИСПРАВЛЕНИЕ: Polling для конфига (без изменений)
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

  // Загрузка профилей (без изменений)
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
          setFiltered(allProfiles); // Показываем все сразу
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

  // --- (ИЗМЕНЕНИЕ) useEffect для фильтрации по DEBOUNCED-запросу ---
  useEffect(() => {
    const qLower = debouncedSearchQuery.toLowerCase();

    if (!qLower) {
      setFiltered(profiles);
      return;
    }
    
    // Запускаем фильтрацию только по debounced-значению
    setFiltered(profiles.filter(p => {
      const skills = (() => { try { return p.skills ? JSON.parse(p.skills).join(' ') : ''; } catch { return ''; } })();
      const corpus = [p.first_name, p.bio, p.job_title, p.company, p.nationality_code, skills].filter(Boolean).join(' ').toLowerCase();
      
      const searchTerms = qLower.split(',').map(s => s.trim()).filter(Boolean);
      return searchTerms.every(term => corpus.includes(term));
    }));
    
  }, [debouncedSearchQuery, profiles]); // Зависим от debouncedSearchQuery
  
  // --- (ИЗМЕНЕНИЕ) useEffect для слушателя input ---
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    // Эта функция теперь ТОЛЬКО обновляет state, 
    // она не запускает фильтрацию
    const onInput = () => {
      const q = input.value.trim();
      setSearchQuery(q); // Обновляем React-state

      // Логика авто-выбора тегов
      const skillsFromInput = q ? q.split(',').map(s => s.trim()) : [];
      const lowerCaseSkillsFromInput = skillsFromInput.map(s => s.toLowerCase());
      const newSelected = allSkills.filter(s => lowerCaseSkillsFromInput.includes(s.toLowerCase()));
      setSelectedSkills(newSelected);
    };

    input.addEventListener('input', onInput);
    return () => input.removeEventListener('input', onInput);
  }, [allSkills]); // Удаляем 'profiles' из зависимостей

  // Этот useEffect обновляет input.value, ЕСЛИ мы выбрали тег
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    const newInputValue = selectedSkills.join(', ');
    
    // Обновляем searchQuery, что запустит debounce
    setSearchQuery(newInputValue); 

    if (input.value !== newInputValue) {
        input.value = newInputValue;
        // НЕ вызываем dispatchEvent('input'), так как setSearchQuery уже все сделал
    }
  }, [selectedSkills]);

  // Слушатель кнопки "Навыки" (без изменений)
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

  // --- (НОВОЕ ИСПРАВЛЕНИЕ) ---
  // Слушатель события 'set-feed-mode' (которое отправляет app.js)
  useEffect(() => {
    const handleSetMode = (event) => {
      if (event.detail && Array.isArray(event.detail.skills)) {
        console.log("REACT (Feed): Получена команда set-feed-mode", event.detail.skills);
        setSelectedSkills(event.detail.skills);
        
        // Обновляем инпут, чтобы он был_в_синхронизации
        // (setSearchQuery вызовется в следующем useEffect, который следит за selectedSkills)
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
  }, []); // Пустой массив зависимостей, чтобы слушатель добавился один раз
  // --- (КОНЕЦ НОВОГО ИСПРАВЛЕНИЯ) ---

  // Выбор тега (без изменений, т.к. он уже обновлял state)
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

  const onOpen = async (u) => {
    try{
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
      const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: u.user_id });
      if (resp?.ok) setSelected(resp.profile || u);
      else setSelected(u);
    } catch { setSelected(u); }
  };

  const onClose = ()=> setSelected(null);

  return h('div',{style:{padding:'0 12px 12px'}},
    h(TopSpacer),
    
    // ✅ ИСПРАВЛЕНИЕ #7: Добавлена проверка на filtered.length
    filtered.length > 0
      ? h(FeedList,{profiles:filtered, onOpen, containerRef: listContainerRef})
      : h(EmptyState, { text: t('feed_empty') }), // <-- Показываем заглушку

    // --- (ИЗМЕНЕНИЕ) Оборачиваем ProfileSheet в Suspense ---
    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, null, 
            selected && h(ProfileSheet, {user:selected, onClose})
        )
    ),
    // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---

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