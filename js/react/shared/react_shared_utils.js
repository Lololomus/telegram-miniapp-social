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
            transition: { type: 'tween', ease: 'circOut', duration: 0.3 },
            
            // Включаем драг только в режиме свайпов
            drag: controlMode === 'swipes' ? "y" : false,
            dragControls: dragControls,
            dragListener: false, // Слушаем драг ТОЛЬКО на ручке (Handle)
            
            dragConstraints: { top: 0, bottom: 0 },
            dragElastic: { top: 0, bottom: 0.2 },
            
            onDragEnd: (e, { offset, velocity }) => {
                // Если утащили вниз больше чем на 100px или быстро свайпнули
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

// --- Остальные утилиты (без изменений) ---

export const t = (k, d = {}) => {
    const dict = {
        'feed_empty': 'Нет запросов',
        'links': 'Ссылки',
        'skills': 'Навыки',
        'experience': 'Опыт работы',
        'education': 'Образование',
        'present_time': 'по наст. время',
        'post_type_looking': '🤝 Ищет',
        'post_type_offering': '💼 Предлагает',
        'post_type_showcase': '🚀 Демо',
        'post_type_default': 'Запрос',
        'job_not_specified': 'Опыт не указан',
        'action_edit': 'Редактировать',
        'action_delete': 'Удалить',
        'action_respond': 'Откликнуться',
        'action_repost': 'Репост',
        'action_view_profile': 'Профиль',
        'action_cancel': 'Отмена',
        'edit_post_title': 'Редактировать',
        'post_type_label': 'Тип',
        'post_content_label': 'Описание',
        'post_full_description_label': 'Подробно',
        'post_skills_label': 'Навыки',
        'select_skills_button': 'Выбрать'
    };
    let s = dict[k] || k;
    Object.entries(d).forEach(([k, v]) => { s = s.replace(new RegExp(`{${k}}`, 'g'), v); });
    return s;
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
    if (!skills || skills.length === 0) return null;
    return skills.map(skill => h('button', {
        key: skill,
        className: `skill-tag skill-tag--filter ${selected.some(s => s.toLowerCase() === skill.toLowerCase()) ? 'is-selected' : ''}`,
        'data-skill': skill,
        onClick: () => onToggle(skill),
    }, skill));
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

export const POPULAR_SKILLS = [
    "Python", "JavaScript", "Java", "C#", "C++", "Go",
    "React", "Vue", "Angular", "Node.js", "Django", "Spring",
    "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "Git", "Figma", "AWS"
].sort((a, b) => a.localeCompare(b));

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

export function EmptyState({ text, visible }) {
  return h(
    'div',
    {
      style: {
        textAlign: 'center',
        padding: '48px 24px',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '18px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        textShadow: '0 0 18px rgba(0, 0, 0, 0.35)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        pointerEvents: 'none',
        userSelect: 'none',
      },
    },
    text || 'Ничего не найдено',
  );
}