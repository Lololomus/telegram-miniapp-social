// react/shared/react_shared_utils.js
//
// Этот файл содержит ОБЩИЕ утилиты и компоненты.
// ОБНОВЛЕНО:
// 1. useBodyScrollLock -> Глобальный счетчик + только overflow: hidden (без position: fixed).
// 2. useSwipeLock -> Глобальный счетчик с защитой от "мигания" при переходах.

import React, { useState, useEffect, useLayoutEffect, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { useDragControls } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;

// --- Глобальные переменные ---
export const tg = window.Telegram?.WebApp;
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// --- Управление режимом (Свайпы vs Нажатия) ---
export const getControlMode = () => localStorage.getItem('control_mode') || 'swipes';

export const setControlMode = (mode) => {
    localStorage.setItem('control_mode', mode);
    window.dispatchEvent(new Event('control-mode-changed'));
};

export function useControlMode() {
    const [mode, setMode] = useState(getControlMode());
    useEffect(() => {
        const handler = () => setMode(getControlMode());
        window.addEventListener('control-mode-changed', handler);
        return () => window.removeEventListener('control-mode-changed', handler);
    }, []);
    return mode;
}

// --- ✅ ИСПРАВЛЕНО: Безопасная блокировка скролла (Глобальный счетчик) ---
let scrollLockCount = 0;

export function useBodyScrollLock() {
    useLayoutEffect(() => {
        // Если это первая блокировка — блокируем body
        if (scrollLockCount === 0) {
            document.body.style.overflow = 'hidden';
            // Для надежности на iOS иногда нужно и html
            document.documentElement.style.overflow = 'hidden';
        }
        scrollLockCount++;

        return () => {
            scrollLockCount--;
            // Только если все блокировки сняты — разблокируем
            if (scrollLockCount === 0) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
        };
    }, []);
}

// --- ✅ ИСПРАВЛЕНО: Умная блокировка свайпов (Глобальный счетчик) ---
let swipeLockCount = 0;
let swipeLockTimeout = null;

function useSwipeLock() {
    useEffect(() => {
        // Очищаем таймер разблокировки, если он был запущен (мы успели открыть новую модалку)
        if (swipeLockTimeout) {
            clearTimeout(swipeLockTimeout);
            swipeLockTimeout = null;
        }

        // Если это первая блокировка — выключаем свайпы
        if (swipeLockCount === 0 && tg?.disableVerticalSwipes) {
            tg.disableVerticalSwipes();
        }
        swipeLockCount++;
        
        return () => {
            swipeLockCount--;
            // Если больше нет блокировок — планируем включение свайпов
            if (swipeLockCount === 0) {
                swipeLockTimeout = setTimeout(() => {
                    if (swipeLockCount === 0 && tg?.enableVerticalSwipes) {
                        tg.enableVerticalSwipes();
                    }
                    swipeLockTimeout = null;
                }, 100); // Даем 100мс на открытие следующей модалки
            }
        };
    }, []);
}

// --- Единая логика шторки (DRY) ---
export function useSheetLogic(onClose) {
    const controlMode = useControlMode();
    const dragControls = useDragControls();
    
    // 1. Блокируем скролл фона
    useBodyScrollLock();

    // 2. Блокируем системные свайпы
    useSwipeLock();

    return {
        controlMode,
        dragControls,
        sheetProps: {
            initial: { y: '100%' },
            animate: { y: 0 },
            exit: { y: '100%' },
            transition: { type: 'spring', damping: 25, stiffness: 300 },
            
            drag: controlMode === 'swipes' ? "y" : false,
            dragControls: dragControls,
            
            dragListener: false, 
            
            dragConstraints: { top: 0, bottom: 0 },
            dragElastic: 0.2,
            
            onDragEnd: (e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 100) {
                    onClose();
                }
            }
        }
    };
}

// --- Компонент управления (Палочка / Крестик) ---
export function SheetControls({ controlMode, dragControls, onClose }) {
    if (controlMode === 'swipes') {
        return h('div', { 
            className: 'react-sheet-handle-wrapper',
            onPointerDown: (e) => dragControls.start(e)
        }, h('div', { className: 'react-sheet-handle-bar' }));
    }
    
    // Режим кнопок (Шеврон)
    return h('button', {
        className: `react-sheet-chevron-close ${isIOS ? 'is-ios' : ''}`,
        onClick: onClose,
        'aria-label': 'Закрыть',
    }, 
        h('svg', { 
            xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, h('polyline', { points: '6 9 12 15 18 9' }))
    );
}

export const t = (k, d = {}) => {
    if (typeof window.t === 'function') {
        return window.t(k, d);
    }

    console.warn(`[i18n] Key '${k}' missed, window.t not ready`);
    return k;
};

export async function postJSON(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
}

export function useDebounce(value, delay) {
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

export function useTwoLineSkillsOverflow(containerRef, itemsLength) {
  const [overflow, setOverflow] = useState(() => ({
    visibleCount: itemsLength,
    hiddenCount: 0,
  }));
  const tagWidthsRef = useRef([]);
  const hasMeasuredRef = useRef(false);
  const [fontsLoaded, setFontsLoaded] = useState(() => {
      return document.fonts ? document.fonts.status === 'loaded' : true;
  });

  useEffect(() => {
    if (document.fonts && !fontsLoaded) {
      document.fonts.ready.then(() => setFontsLoaded(true));
    }
  }, []);

  useLayoutEffect(() => {
    tagWidthsRef.current = [];
    hasMeasuredRef.current = false;
    setOverflow({ visibleCount: itemsLength, hiddenCount: 0 });
  }, [itemsLength]);

  useLayoutEffect(() => {
    const container = containerRef?.current;
    if (!container || !itemsLength) return;

    const recompute = () => {
      if (container.clientWidth <= 0) return;
      const tagNodes = Array.from(container.querySelectorAll('.skill-tag--display'));
      if (tagNodes.length > 0 && tagNodes[0].getBoundingClientRect().width === 0) return;

      const CONTAINER_SAFE_BUFFER = 15;
      const containerWidth = container.clientWidth - CONTAINER_SAFE_BUFFER;
      
      if (!hasMeasuredRef.current || (fontsLoaded && tagWidthsRef.current.length !== itemsLength)) {
          if (tagNodes.length === itemsLength) {
              tagWidthsRef.current = tagNodes.map(n => n.getBoundingClientRect().width);
              hasMeasuredRef.current = true;
          } else {
              return;
          }
      }

      let currentLineWidth = 0;
      let currentRow = 1;
      let visible = 0;
      const widths = tagWidthsRef.current;
      let scale = 1;
      if (tagNodes.length > 0 && widths.length > 0 && widths[0] > 0) {
          scale = tagNodes[0].getBoundingClientRect().width / widths[0];
      }

      for (let i = 0; i < itemsLength; i++) {
         const w = widths[i] * scale;
         const gap = (currentLineWidth === 0) ? 0 : 6;
         const isLastRow = (currentRow === 2);
         const extraSpace = (isLastRow && (itemsLength - (i + 1) > 0)) ? (6 + 75) : 0;

         if (currentLineWidth + gap + w + extraSpace <= containerWidth) {
             currentLineWidth += gap + w;
             visible++;
         } else {
             if (currentRow === 1) {
                 currentRow++;
                 currentLineWidth = 0;
                 i--;
             } else {
                 break;
             }
         }
      }
      setOverflow({ visibleCount: visible, hiddenCount: itemsLength - visible });
    };

    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    recompute();
    return () => ro.disconnect();
  }, [itemsLength, containerRef, fontsLoaded]);

  return overflow;
}

export function QuickFilterTags({ skills, selected, onToggle }) {
    // Если массив selected пуст, значит активен фильтр "Все"
    const isAllActive = !selected || selected.length === 0;

    return h('div', { className: 'quick-filters' }, // Обертка (если её нет в родителе, но обычно она снаружи)
        // 1. Кнопка "Все" (Всегда первая)
        h('button', {
            key: 'filter-all',
            // Добавляем класс 'is-all' для особого стиля
            className: `skill-tag skill-tag--filter is-all ${isAllActive ? 'is-selected' : ''}`,
            onClick: () => onToggle(null), // null означает сброс
        }, t('filter_all')),

        // 2. Остальные теги
        (skills || []).map(skill => h('button', {
            key: skill,
            className: `skill-tag skill-tag--filter ${selected.some(s => s.toLowerCase() === skill.toLowerCase()) ? 'is-selected' : ''}`,
            onClick: () => onToggle(skill),
        }, skill))
    );
}
export function PhoneShell({ children }) {
    return h('div', {
        style: {
            position: 'relative',
            width: '100%',
            minHeight: '100%',
            color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'
        }
     }, children);
}

export function ProfileFallback() {
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

export const ALL_RECOGNIZED_SKILLS = [
    // Languages
    "Python", "JavaScript", "Java", "C#", "C++", "Go", "PHP", "Ruby", "Swift", "Kotlin", "Rust", "TypeScript", "Dart", "Lua", "Perl", "Scala", "Elixir",
    // Frontend
    "React", "Vue", "Angular", "Svelte", "HTML", "CSS", "Tailwind", "Bootstrap", "jQuery", "Next.js", "Nuxt.js", "Three.js",
    // Backend
    "Node.js", "Django", "Spring", "Laravel", "Flask", "ASP.NET", "Express", "FastAPI", "Symfony", "Ruby on Rails",
    // DB
    "PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite", "Firebase", "Elasticsearch", "Cassandra", "MariaDB", "Oracle",
    // DevOps
    "Docker", "Kubernetes", "Git", "AWS", "Google Cloud", "Azure", "Jenkins", "Terraform", "Ansible", "CircleCI", "Nginx",
    // Design
    "Figma", "Photoshop", "Illustrator", "Blender", "Unity", "Unreal Engine", "After Effects", "Premiere Pro", "Sketch", "InDesign"
].sort((a, b) => a.localeCompare(b));

// 2. БЫСТРЫЕ ТЕГИ (Только популярные, для горизонтального скролла)
export const POPULAR_SKILLS = [
    "Python", "JavaScript", "React", "Java", "C++", "Go", "PHP", "Design", "DevOps", "Swift", "MySQL"
];

export const cardVariants = isIOS 
  ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
      exit: { opacity: 0, transition: { duration: 0.1 } }
    }
  : {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
      exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
    };

export const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
        when: "beforeChildren",
        staggerChildren: isIOS ? 0.05 : 0.1,
        delayChildren: 0.1
    }
  }
};

export const FEED_ITEM_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const FEED_ITEM_DELAY_STEP = isIOS ? 0 : 0.1;

export function buildFeedItemTransition(index = 0) {
  const safeIndex = typeof index === "number" && isFinite(index) ? index : 0;
  const delay = FEED_ITEM_DELAY_STEP * safeIndex;
  return {
    ...FEED_ITEM_SPRING,
    delay,
    scale: { ...FEED_ITEM_SPRING, delay: 0 },
    y: { ...FEED_ITEM_SPRING, delay: 0 },
  };
}

export function EmptyState({ text, visible, onReset }) {
  // Если не видно, рендерим null, чтобы не перекрывать клики
  if (!visible) return null;

  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        
        // Анимация появления
        opacity: 1, // Так как мы возвращаем null при !visible, здесь можно держать 1
        animation: 'fadeIn 0.2s ease-out',
        
        // Чтобы текст не мешал, но кнопка работала
        pointerEvents: 'none', 
        width: '100%'
      },
    },
    h('div', {
        style: {
            color: 'var(--main-hint-color, #999)', // Используем переменную темы
            fontSize: '17px',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '16px',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)' // Легкая тень для читаемости
        }
    }, text || 'Ничего не найдено'),

    // Рендерим кнопку только если передана функция onReset
    onReset && h('button', {
        onClick: (e) => {
            e.stopPropagation(); // Предотвращаем всплытие
            onReset();
        },
        style: {
            pointerEvents: 'auto', // ВАЖНО: Возвращаем кликабельность кнопке
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--main-button-color, #007aff)', // Синий цвет из темы
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px', // Скругление как у инпутов
            padding: '10px 20px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)', // Синяя тень
            transition: 'transform 0.2s, opacity 0.2s'
        }
    },
        // SVG Иконка перезагрузки
        h('svg', {
            viewBox: '0 0 24 24',
            width: '18',
            height: '18',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        }, 
            h('path', { d: 'M23 4v6h-6' }),
            h('path', { d: 'M1 20v-6h6' }),
            h('path', { d: 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' })
        ),
        t('action_reset_filters')
    )
  );
}

// --- НОВЫЙ ХУК: Единая логика жестов (v2) ---
export function useCardGestures({ 
    onOpenContextMenu, 
    onOpenPrimary,   // Основное действие (клик по карточке)
    onOpenSecondary, // Второстепенное (клик по аватарке/кнопке)
    disableClick = false 
}) {
    const gestureTimerRef = useRef(null);
    const pointerStartRef = useRef(null);
    const targetRef = useRef(null); 
    const POINTER_SLOP = 5;

    const handlePointerDown = (e) => {
        if (disableClick) return;
        // Запоминаем координаты
        pointerStartRef.current = { y: e.pageY, x: e.pageX };
        
        // Блокируем нативные жесты Telegram (чтобы не закрыть webapp свайпом)
        if (tg?.disableVerticalSwipes) tg.disableVerticalSwipes();
        
        if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);

        // --- ЛОГИКА LONG-PRESS (Контекстное меню) ---
        if (onOpenContextMenu) {
            gestureTimerRef.current = setTimeout(() => {
                if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy');
                
                // Вызываем меню, передавая DOM-элемент карточки для позиционирования
                onOpenContextMenu(targetRef.current);
                
                // Сбрасываем pointer, чтобы pointerUp не считал это кликом
                pointerStartRef.current = null; 
                
                if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes();
            }, 300); // 300мс задержка
        }
    };

    const handlePointerMove = (e) => {
        if (disableClick || !pointerStartRef.current) return;
        const deltaY = Math.abs(e.pageY - pointerStartRef.current.y);
        const deltaX = Math.abs(e.pageX - pointerStartRef.current.x);
        
        // Если палец сдвинулся > 5px, считаем это скроллом, а не кликом
        if (deltaY > POINTER_SLOP || deltaX > POINTER_SLOP) {
            if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
            pointerStartRef.current = null;
            if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes();
        }
    };

    const handlePointerUp = (e) => {
        if (disableClick) return;
        
        // Возвращаем свайпы Telegram
        if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes();
        
        // Отменяем таймер лонг-тапа
        if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);

        // Если pointerStartRef жив — значит это был КЛИК
        if (pointerStartRef.current) {
            const target = e.target;
            
            // 1. Проверяем, кликнули ли по "Secondary" элементу (Аватар/Имя)
            // Элемент должен иметь атрибут data-action="secondary"
            if (onOpenSecondary && target.closest('[data-action="secondary"]')) {
                e.stopPropagation();
                onOpenSecondary();
            } 
            // 2. Иначе вызываем основное действие (Открыть пост)
            else if (onOpenPrimary) {
                onOpenPrimary();
            }
            
            pointerStartRef.current = null;
        }
    };

    return {
        targetRef,
        gestureProps: {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp, // Важно: отмена при скролле браузера
            onContextMenu: (e) => { if(!disableClick) e.preventDefault(); } // Блокируем системное меню
        }
    };
}

/**
 * Определяет текущую тему приложения
 * @returns {Object} { isLight: boolean, isDark: boolean, isGlass: boolean }
 */
export function getThemeType() {
  const body = document.body;
  const isLight = body.classList.contains('theme-light');
  const isDark = body.classList.contains('theme-dark');
  const isGlass = body.classList.contains('theme-glass-overlay');
  
  return { isLight, isDark, isGlass };
}

/**
 * Получить цвета для текущей темы
 * @returns {Object} Объект с цветами для inline styles
 */
export function getThemeColors() {
  const { isLight, isDark, isGlass } = getThemeType();
  
  if (isLight) {
    if (isGlass) {
      return {
        bg: 'rgba(255, 255, 255, 0.85)',
        bgSecondary: 'rgba(255, 255, 255, 0.50)',
        text: '#0F172A',
        textSecondary: '#334155',
        hint: '#64748B',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overlayBg: 'rgba(0, 0, 0, 0.40)',
        cardBg: 'rgba(255, 255, 255, 0.70)',
        inputBg: 'rgba(255, 255, 255, 0.65)',
        placeholder: 'rgba(0, 0, 0, 0.40)',
        blur: 'blur(20px)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      };
    } else {
      // Light без glass
      return {
        bg: '#FFFFFF',
        bgSecondary: '#F9FAFB',
        text: '#111827',
        textSecondary: '#374151',
        hint: '#6B7280',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overlayBg: 'rgba(0, 0, 0, 0.50)',
        cardBg: '#FFFFFF',
        inputBg: '#F9FAFB',
        placeholder: 'rgba(0, 0, 0, 0.40)',
        blur: 'none',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      };
    }
  } else if (isDark) {
    // Dark theme
    if (isGlass) {
      return {
        bg: 'rgba(18, 18, 18, 0.94)',
        bgSecondary: 'rgba(255, 255, 255, 0.05)',
        text: '#FFFFFF',
        textSecondary: '#D4D4D8',
        hint: '#A1A1AA',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overlayBg: 'rgba(0, 0, 0, 0.75)',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        inputBg: 'rgba(255, 255, 255, 0.05)',
        placeholder: 'rgba(255, 255, 255, 0.40)',
        blur: 'blur(20px)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      };
    } else {
      return {
        bg: '#121212',
        bgSecondary: '#1C1C1E',
        text: '#FFFFFF',
        textSecondary: '#D4D4D8',
        hint: '#A1A1AA',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overlayBg: 'rgba(0, 0, 0, 0.85)',
        cardBg: '#1C1C1E',
        inputBg: '#2C2C2E',
        placeholder: 'rgba(255, 255, 255, 0.40)',
        blur: 'none',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      };
    }
  }
  
  // Fallback на light
  return {
    bg: '#FFFFFF',
    text: '#111827',
    hint: '#6B7280',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    overlayBg: 'rgba(0, 0, 0, 0.50)',
  };
}

/**
 * Получить type colors для PostCard (looking/offering/showcase)
 * @returns {Object} Объект с цветами типов постов
 */
export function getTypeColors() {
  const { isLight } = getThemeType();
  
  if (isLight) {
    return {
      looking: '#6366F1',
      offering: '#10B981',
      showcase: '#F59E0B',
      default: '#6B7280',
    };
  } else {
    return {
      looking: '#0A84FF',
      offering: '#34C759',
      showcase: '#FF9500',
      default: '#8E8E93',
    };
  }
}

/* ============================================
   PROFILES MANAGER - Единый источник данных профилей
   ============================================ */

const profilesCache = new Map();
const profileListeners = new Set();

export const ProfilesManager = {
  get(userId) {
    return profilesCache.get(String(userId));
  },

  update(userId, profileData) {
    const id = String(userId);
    const existing = profilesCache.get(id) || {};
    const updated = { ...existing, ...profileData };
    profilesCache.set(id, updated);
    
    // Уведомляем всех слушателей
    profileListeners.forEach(listener => {
      listener(id, updated);
    });
    
    return updated;
  },

  updateFollowStatus(userId, isFollowed, followersDelta = 0) {
    const id = String(userId);
    const profile = this.get(id) || { user_id: id, followers_count: 0 };
    
    return this.update(id, {
      is_followed_by_viewer: isFollowed,
      followers_count: (profile.followers_count || 0) + followersDelta
    });
  },

  loadMany(profiles) {
    profiles.forEach(p => {
      if (p.user_id) {
        profilesCache.set(String(p.user_id), p);
      }
    });
  },

  subscribe(callback) {
    profileListeners.add(callback);
    return () => profileListeners.delete(callback);
  },

  clear() {
    profilesCache.clear();
  }
};

// ================================
// TOP TITLE MANAGER (Vanilla)
// ================================

const TITLE_KEY_BY_VIEW_ID = {
  // Tabs / base screens (верхний текст в app-header)
  'feed-container': 'tab_people',
  'posts-feed-container': 'tab_hub',
  'profile-view-container': 'yourprofiletitle',
  'settings-container': 'settingstitle',

  // Fullscreen screens/modals (верхний текст внутри screen)
  'form-container': 'editprofiletitle',
  'create-post-modal': 'createposttitle',
  'skills-modal': 'skillsmodaltitle',

  // Overlay modal (QR)
  'qr-code-modal': 'qrtitle',
};

const OVERLAY_VIEW_IDS = new Set([
  'create-post-modal',
  'skills-modal',
  'qr-code-modal',
]);

export const TopTitleManager = (() => {
  let headerTitleEl = null;
  let tFn = (k) => k;

  let baseViewId = 'posts-feed-container';
  let overlayStack = [];

  function resolveTitleKey(viewId) {
    return TITLE_KEY_BY_VIEW_ID[viewId] || null;
  }

  function getActiveTitleKey() {
    if (overlayStack.length) {
      return resolveTitleKey(overlayStack[overlayStack.length - 1]);
    }
    return resolveTitleKey(baseViewId);
  }

  function render() {
    if (!headerTitleEl) return;
    const key = getActiveTitleKey();
    if (!key) return;

    // ВАЖНО: и текст, и data-i18n-key (иначе updateUIText перетрет текст при смене языка)
    headerTitleEl.dataset.i18nKey = key;
    headerTitleEl.textContent = tFn(key);
  }

  function onViewShown(viewId) {
    if (!viewId) return;

    if (OVERLAY_VIEW_IDS.has(viewId)) {
      const idx = overlayStack.lastIndexOf(viewId);
      if (idx === -1) overlayStack.push(viewId);
      else overlayStack = overlayStack.slice(0, idx + 1);
    } else {
      baseViewId = viewId;
      overlayStack = [];
    }

    render();
  }

  function onOverlayShown(viewId) {
    if (!viewId) return;
    if (!OVERLAY_VIEW_IDS.has(viewId)) return;

    const idx = overlayStack.lastIndexOf(viewId);
    if (idx === -1) overlayStack.push(viewId);
    else overlayStack = overlayStack.slice(0, idx + 1);

    render();
  }

  function onOverlayHidden(viewId) {
    if (!viewId) return;
    overlayStack = overlayStack.filter((x) => x !== viewId);
    render();
  }

  function init({ headerTitle, t } = {}) {
    headerTitleEl = headerTitle || document.getElementById('header-title');
    tFn = t || tFn;
    render();
  }

  return { init, render, onViewShown, onOverlayShown, onOverlayHidden };
})();

try { window.TopTitleManager = TopTitleManager; } catch (e) {}

/**
 * React Hook для работы с профилем из кэша
 */
export function useProfile(userId) {
  const [profile, setProfile] = useState(() => ProfilesManager.get(userId));

  useEffect(() => {
    const unsubscribe = ProfilesManager.subscribe((id, updatedProfile) => {
      if (id === String(userId)) {
        setProfile(updatedProfile);
      }
    });

    return unsubscribe;
  }, [userId]);

  return profile;
}