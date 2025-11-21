// react/feed/feed_utils.js
//
// Этот файл содержит ТОЛЬКО утилиты, уникальные для /react/feed/
// (Локальный 't', 'EmptyState', 'TopSpacer').
// Все остальное импортируется из /react/shared/utils.js

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
const h = React.createElement;

// --- ИМПОРТ ОБЩИХ УТИЛИТ ---
// Мы импортируем их, чтобы затем ре-экспортировать 
// для удобства других компонентов в этой папке.
export {
    tg,
    isIOS,
    postJSON,
    useDebounce,
    QuickFilterTags,
    PhoneShell,
    ProfileFallback,
    POPULAR_SKILLS,
    cardVariants,
    listVariants,
    FEED_ITEM_SPRING,
    FEED_ITEM_DELAY_STEP,
    buildFeedItemTransition,
    EmptyState, 
    useTwoLineSkillsOverflow,
    useControlMode,
} from '../shared/react_shared_utils.js';


/**
 * Функция перевода (i18n)
 * (Локальная, УПРОЩЕННАЯ версия, СПЕЦИАЛЬНО для ленты людей)
 * (Взята из react-feed.js)
 */
export const t = (k, d = {}) => {
    // Пытаемся найти глобальную функцию
    if (typeof window.t === 'function') {
        return window.t(k, d);
    }
    // Если вдруг не нашли — возвращаем ключ (чтобы приложение не упало)
    console.warn(`[i18n] Key '${k}' missed, window.t not ready`);
    return k;
};

/**
 * Компонент-хелпер: TopSpacer (пустышка для отступа)
 * (Взят из react-feed.js)
 */
export function TopSpacer() {
  return h('div', {style:{height: '0px'}});
}