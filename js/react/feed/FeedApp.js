// react/feed/index.js (ESM)
// (Бывший /js/react-feed.js)
//
// Этот файл теперь содержит ТОЛЬКО главный компонент App (логику)
// и импортирует все UI-компоненты и утилиты.

import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  Suspense,
  memo,
} from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// --- ИМПОРТ ОБЩЕГО КОМПОНЕНТА ---
// Путь из /react/feed/ в /react/shared/
const ProfileSheet = React.lazy(() =>
  import('../shared/ProfileSheet.js').then((module) => ({
    default: module.ProfileSheet,
  })),
);

// --- ИМПОРТЫ ИЗ ЛОКАЛЬНЫХ/SHARED УТИЛИТ ---
// feed_utils.js должен реэкспортировать утилиты из shared/utils.
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
  TopSpacer,
} from './feed_utils.js';

// --- ИМПОРТЫ ЛОКАЛЬНЫХ КОМПОНЕНТОВ ---
import FeedList from './FeedList.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

// --- Хост для быстрых фильтров (поднимаем один раз на уровне модуля) ---
const quickFiltersHost = document.getElementById('feed-quick-filters');

/**
 * Главный React-компонент ленты людей.
 * Содержит всю бизнес-логику и состояние.
 */
function App({ mountInto, overlayHost }) {
  const [cfg, setCfg] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [allSkills, setAllSkills] = useState(POPULAR_SKILLS);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const listContainerRef = useRef(null);

  // --- 1. Ожидание window.__CONFIG ---
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 20;

    const waitForConfig = () => {
      if (cancelled) return;

      if (window.__CONFIG) {
        console.log('✅ React-feed: Конфиг найден!');
        setCfg(window.__CONFIG);
        return;
      }

      pollCount += 1;
      if (pollCount >= MAX_POLLS) {
        console.error('❌ React-feed: Конфиг не найден после MAX_POLLS');
        return;
      }

      console.log(
        `⏳ React-feed: Ожидание конфига... (${pollCount}/${MAX_POLLS})`,
      );
      setTimeout(waitForConfig, 250);
    };

    waitForConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- 2. Загрузка профилей после получения cfg ---
  useEffect(() => {
    if (!cfg || !cfg.backendUrl) return;

    let cancelled = false;

    const fetchProfiles = async () => {
      console.log('📡 React-feed: Загружаем профили...');
      try {
        // КРИТИЧНО: используем тот же endpoint, что был раньше —
        // /get-all-profiles, иначе backend отвечает 404.
        const resp = await postJSON(`${cfg.backendUrl}/get-all-profiles`, {
          initData: tg?.initData,
        });

        if (cancelled) return;

        if (resp?.ok) {
          const allProfiles = Array.isArray(resp.profiles)
            ? resp.profiles
            : [];
          setProfiles(allProfiles);
          setFiltered(allProfiles);
          console.log(
            `✅ React-feed: Загружено ${allProfiles.length} профилей`,
          );
        } else {
          console.error('❌ React-feed: Ошибка загрузки профилей', resp);
          setProfiles([]);
          setFiltered([]);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('❌ React-feed: Исключение при загрузке профилей:', e);
        setProfiles([]);
        setFiltered([]);
      }
    };

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [cfg]);

  // --- 3. Фильтрация по поиску и выбранным скиллам ---
  useEffect(() => {
    const qLower = debouncedSearchQuery.trim().toLowerCase();

    // Нет текста поиска и нет выбранных навыков → полный список
    if (!qLower && selectedSkills.length === 0) {
      setFiltered(profiles);
      return;
    }

    const next = profiles.filter((p) => {
      let skillsArray = [];
      if (p.skills) {
        try {
          const parsed = JSON.parse(p.skills);
          if (Array.isArray(parsed)) {
            skillsArray = parsed;
          }
        } catch (e) {
          // тихо игнорируем парсинг
        }
      }

      const skillsText = skillsArray.join(' ').toLowerCase();
      const nameText = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const aboutText = (p.about || '').toLowerCase();

      const matchesQuery =
        !qLower ||
        nameText.includes(qLower) ||
        aboutText.includes(qLower) ||
        skillsText.includes(qLower);

      const matchesSkills =
        selectedSkills.length === 0 ||
        selectedSkills.every((skill) => skillsArray.includes(skill));

      return matchesQuery && matchesSkills;
    });

    setFiltered(next);
  }, [profiles, debouncedSearchQuery, selectedSkills]);

  // --- 4. Связка с нативным input #feed-search-input ---
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    const onInput = () => {
      setSearchQuery(input.value || '');
    };

    input.addEventListener('input', onInput);
    return () => {
      input.removeEventListener('input', onInput);
    };
  }, []);

  // --- 5. Обновление value у input при изменении выбранных навыков ---
  useEffect(() => {
    const input = document.getElementById('feed-search-input');
    if (!input) return;

    const newValue = selectedSkills.join(', ');
    if (input.value !== newValue) {
      input.value = newValue;
    }
  }, [selectedSkills]);

  // --- 6. Синхронизация состояния быстрых фильтров (кнопки с data-skill) ---
  useEffect(() => {
    if (!quickFiltersHost) return;

    const buttons = quickFiltersHost.querySelectorAll('[data-skill]');
    buttons.forEach((btn) => {
      const skill = btn.getAttribute('data-skill');
      if (!skill) return;

      if (selectedSkills.includes(skill)) {
        btn.classList.add('is-selected');
      } else {
        btn.classList.remove('is-selected');
      }
    });
  }, [selectedSkills]);

  // --- 7. Слушаем кастомное событие 'set-feed-mode' из app.js ---
  useEffect(() => {
    const handleSetMode = (event) => {
      const detail = event.detail;
      if (detail && Array.isArray(detail.skills)) {
        setSelectedSkills(detail.skills);
      }
    };
    document.addEventListener('set-feed-mode', handleSetMode);
    return () => document.removeEventListener('set-feed-mode', handleSetMode);
  }, []);

  // --- 8. Обработчик клика по тегу навыка ---
  const onToggleSkill = (skill) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      return [...prev, skill];
    });
  };

  // --- 9. Открытие профиля пользователя (Optimistic UI) ---
  const onOpen = async (user) => {
    // 1. МГНОВЕННО показываем то, что есть (данные из карточки)
    // Пользователь сразу видит анимацию открытия, не ожидая сети.
    setSelected(user);

    if (!cfg || !cfg.backendUrl) return;

    // 2. В фоне запрашиваем полные данные (био, ссылки и т.д.)
    try {
      const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, {
        initData: tg?.initData,
        target_user_id: user.user_id,
      });

      // 3. Когда данные пришли — обновляем стейт
      if (resp?.ok && resp.profile) {
        // Проверка: обновляем, только если пользователь всё еще смотрит ЭТОГО юзера
        setSelected((current) => {
            if (current && current.user_id === user.user_id) {
                return resp.profile;
            }
            return current;
        });
      }
    } catch (e) {
      console.error('React-feed: Ошибка при фоновой загрузке профиля', e);
      // Не страшно, пользователь видит хотя бы базовые данные
    }
  };

  const onClose = () => {
    setSelected(null);
  };

  useEffect(() => {
    if (!overlayHost) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // Если экран скрылся (display: none) -> сбрасываем поиск
          if (overlayHost.style.display === 'none') {
             setSearchQuery('');
             // Можно и навыки сбросить, если нужно:
             // setSelectedSkills([]); 
          }
        }
      });
    });

    observer.observe(overlayHost, { attributes: true });

    return () => observer.disconnect();
  }, [overlayHost]);

  // Функция сброса для Людей
    const handleResetFilters = () => {
        setSearchQuery(''); // Очищаем текст
        setSelectedSkills([]); // Очищаем навыки
        // Если есть нативный инпут, чистим и его визуально
        const input = document.getElementById('feed-search-input');
        if (input) input.value = '';
    };

  // --- 10. Рендер ---
  return h(
    'div',
    { style: { padding: '0 12px 12px' } },
    h(TopSpacer),

    // Лента людей ВСЕГДА смонтирована. Даже когда отфильтрованный массив пустой.
    // Это критично для корректной enter-анимации framer-motion в дочерних карточках.
    h(FeedList, {
      profiles: filtered,
      onOpen,
      containerRef: listContainerRef,
    }),

    // Пустое состояние выводим отдельным компонентом, не размонтируя FeedList.
    filtered.length === 0 &&
      h(EmptyState, {
        text: t('feed_empty'),
        visible: filtered.length === 0,
        onReset: handleResetFilters
      }),

    h(
      Suspense,
      { fallback: h(ProfileFallback) },
      h(
        AnimatePresence,
        null,
        selected &&
          h(ProfileSheet, {
            user: selected,
            onClose,
          }),
      ),
    ),

    quickFiltersHost &&
      createPortal(
        h(QuickFilterTags, {
          skills: allSkills,
          selected: selectedSkills,
          onToggle: onToggleSkill,
        }),
        quickFiltersHost,
      ),
  );
}

// --- 11. Монтирование React-приложения ---
function mountReactFeed() {
  if (!window.REACT_FEED) return;

  const hostList = document.querySelector('#feed-list');
  const overlayHost = document.querySelector('#feed-container');

  if (!hostList || !overlayHost) return;

  hostList.innerHTML = '';

  const root = createRoot(hostList);
  root.render(h(PhoneShell, null, h(App, { mountInto: hostList, overlayHost })));

  return () => {
    root.unmount();
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactFeed);
} else {
  mountReactFeed();
}