// react/shared/utils.js
//
// Этот файл содержит ОБЩИЕ утилиты и компоненты, 
// которые используются в НЕСКОЛЬКИХ "островах" React 
// (например, в /react/feed/ и /react/posts/).
//
// ИСПРАВЛЕНИЕ: Добавлены POPULAR_SKILLS, cardVariants, listVariants

import React, { useState, useEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
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