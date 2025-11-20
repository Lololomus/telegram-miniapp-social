// react/shared/utils.js
//
// Этот файл содержит ОБЩИЕ утилиты и компоненты, 
// которые используются в НЕСКОЛЬКИХ "островах" React 
// (например, в /react/feed/ и /react/posts/).
//
// ИСПРАВЛЕНИЕ: Добавлены POPULAR_SKILLS, cardVariants, listVariants

import React, { useState, useEffect, useLayoutEffect, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
const h = React.createElement;

// --- Глобальные переменные ---
export const tg = window.Telegram?.WebApp;
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Функция перевода (i18n)
 * (Базовый словарь, используется в ProfileSheet)
 */
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
    };
    let s = dict[k] || k;
    Object.entries(d).forEach(([k, v]) => { s = s.replace(new RegExp(`{${k}}`, 'g'), v); });
    return s;
};

/**
 * Отправка JSON-запроса
 */
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

/**
 * Хук Debounce
 */
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

// Максимум 2 строки тегов по ширине контейнера.
// Работает так:
// 1) На первом рендере рендерятся все теги (visibleCount = itemsLength).
// 2) useLayoutEffect один раз измеряет ширину каждого <span.skill-tag--display>.
// 3) Ширины сохраняются в ref и больше не зависят от DOM.
// 4) По контейнеру считаем, сколько тегов поместится в 2 строки с учётом gap и места под +X.
// 5) Возвращаем { visibleCount, hiddenCount } — FEED/Post используют slice(0, visibleCount).
// Поддерживает пересчет при загрузке шрифтов.
export function useTwoLineSkillsOverflow(containerRef, itemsLength) {
  const [overflow, setOverflow] = useState(() => ({
    visibleCount: itemsLength,
    hiddenCount: 0,
  }));

  const tagWidthsRef = useRef([]);
  const hasMeasuredRef = useRef(false);
  
  // Проверка загрузки шрифтов
  const [fontsLoaded, setFontsLoaded] = useState(() => {
      return document.fonts ? document.fonts.status === 'loaded' : true;
  });

  useEffect(() => {
    if (document.fonts && !fontsLoaded) {
      document.fonts.ready.then(() => setFontsLoaded(true));
    }
  }, []);

  useLayoutEffect(() => {
    // Сброс при смене данных
    tagWidthsRef.current = [];
    hasMeasuredRef.current = false;
    setOverflow({ visibleCount: itemsLength, hiddenCount: 0 });
  }, [itemsLength]);

  useLayoutEffect(() => {
    const container = containerRef?.current;
    if (!container || !itemsLength) return;

    const recompute = () => {
      // 1. БЕЗОПАСНОСТЬ: Если контейнер скрыт (ширина 0), 
      // НЕ ПЕРЕСЧИТЫВАЕМ, чтобы не получить 0 видимых тегов.
      // Просто оставляем предыдущее состояние (return).
      if (container.clientWidth <= 0) return;

      // Защита от бага, когда теги есть, но у них ширина 0
      const tagNodes = Array.from(container.querySelectorAll('.skill-tag--display'));
      if (tagNodes.length > 0 && tagNodes[0].getBoundingClientRect().width === 0) return;

      // --- Стандартная логика измерения (без изменений) ---
      const CONTAINER_SAFE_BUFFER = 15;
      const containerWidth = container.clientWidth - CONTAINER_SAFE_BUFFER;
      
      // Кешируем ширины, если еще нет
      if (!hasMeasuredRef.current || (fontsLoaded && tagWidthsRef.current.length !== itemsLength)) {
          if (tagNodes.length === itemsLength) {
              tagWidthsRef.current = tagNodes.map(n => n.getBoundingClientRect().width);
              hasMeasuredRef.current = true;
          } else {
              return; // DOM не готов
          }
      }

      // Расчет visibleCount
      let currentLineWidth = 0;
      let currentRow = 1;
      let visible = 0;
      const widths = tagWidthsRef.current;
      
      // Если ширины изменились (зум), считаем коэффициент
      let scale = 1;
      if (tagNodes.length > 0 && widths.length > 0 && widths[0] > 0) {
          scale = tagNodes[0].getBoundingClientRect().width / widths[0];
      }

      for (let i = 0; i < itemsLength; i++) {
         const w = widths[i] * scale;
         const gap = (currentLineWidth === 0) ? 0 : 6;
         // Если это последняя строка и останутся элементы, резервируем место под "+N" (75px)
         const isLastRow = (currentRow === 2);
         const extraSpace = (isLastRow && (itemsLength - (i + 1) > 0)) ? (6 + 75) : 0;

         if (currentLineWidth + gap + w + extraSpace <= containerWidth) {
             currentLineWidth += gap + w;
             visible++;
         } else {
             if (currentRow === 1) {
                 currentRow++;
                 currentLineWidth = 0;
                 i--; // пробуем этот тег на новой строке
             } else {
                 break; // не влезло во 2 строку
             }
         }
      }
      
      setOverflow({ visibleCount: visible, hiddenCount: itemsLength - visible });
    };

    // Используем ResizeObserver для реакции на изменение ширины
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    // И один раз запускаем сразу
    recompute();

    return () => ro.disconnect();
  }, [itemsLength, containerRef, fontsLoaded]);

  return overflow;
}

/**
 * Компонент-хелпер: Быстрые фильтры
 */
export function QuickFilterTags({ skills, selected, onToggle }) {
    if (!skills || skills.length === 0) return null;
    return skills.map(skill => h('button', {
        key: skill,
        className: `skill-tag skill-tag--filter ${selected.some(s => s.toLowerCase() === skill.toLowerCase()) ? 'is-selected' : ''}`,
        'data-skill': skill,
        onClick: () => onToggle(skill),
    }, skill));
}

/**
 * Компонент-хелпер: Оболочка (нужна для createRoot)
 */
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

/**
 * Компонент-хелпер: Заглушка для Suspense
 */
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

/**
 * Общая константа: Популярные навыки
 */
export const POPULAR_SKILLS = [
    "Python", "JavaScript", "Java", "C#", "C++", "Go",
    "React", "Vue", "Angular", "Node.js", "Django", "Spring",
    "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "Git", "Figma", "AWS"
].sort((a, b) => a.localeCompare(b));

/**
 * Общая константа: Анимации карточек
 *
 * ✅ ИСПРАВЛЕНИЕ: Убрана конкурирующая анимация "delay: i * 0.1".
 * Анимацией "волны" теперь управляет ИСКЛЮЧИТЕЛЬНО `listVariants` 
 * (через `staggerChildren`).
 * Это исправляет "Ленту Людей" и не ломает "Ленту Запросов",
 * так как та использует ручное переопределение.
 */
export const cardVariants = isIOS 
  ? {
      hidden: { opacity: 0 },
      // "visible" variant for iOS (БЕЗ 'delay')
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
      // "visible" variant for Desktop/Android (БЕЗ 'delay')
      visible: { 
        opacity: 1, 
        x: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut"
        }
      },
      exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
    };

/**
 * Общая константа: Анимация списка
 */
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

// Общий spring-конфиг для элементов ленты
// (лента людей, лента запросов, мои запросы)
export const FEED_ITEM_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

// Шаг задержки между элементами (эффект "волны").
// На iOS задержка отключена, чтобы не тормозить WebView.
export const FEED_ITEM_DELAY_STEP = isIOS ? 0 : 0.1;

// Общий хелпер для transition появления карточки в ленте.
// index — позиция карточки в списке (0, 1, 2, ...).
export function buildFeedItemTransition(index = 0) {
  const safeIndex =
    typeof index === "number" && isFinite(index) ? index : 0;

  const delay = FEED_ITEM_DELAY_STEP * safeIndex;

  return {
    // Волна появления — задержка по индексу для opacity/x и базового spring
    ...FEED_ITEM_SPRING,
    delay,

    // Подпрыгивание при long‑press (scale/y) — БЕЗ задержки
    scale: {
      ...FEED_ITEM_SPRING,
      delay: 0,
    },
    y: {
      ...FEED_ITEM_SPRING,
      delay: 0,
    },
  };
}

// Общий EmptyState для всех лент (люди, запросы и т.п.)
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

        // плавное появление/исчезновение
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