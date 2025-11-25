// react/posts/posts_utils.js
// Утилиты для ленты постов (расширяет shared)

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
const h = React.createElement;

// --- ИМПОРТ ОБЩИХ УТИЛИТ ---
// Мы ре-экспортируем их, чтобы компоненты могли брать всё из одного места
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
    // useTwoLineSkillsOverflow больше не экспортируем, так как перешли на CSS
    useControlMode,
    useBodyScrollLock,
    useSheetLogic,
    SheetControls,
    useCardGestures,
} from '../shared/react_shared_utils.js';

// --- HYBRID CORE: Детектор мобильных устройств ---
// Включает Android и iOS. Используется для отключения тяжелых layout-анимаций.
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Локальная функция перевода (обертка)
export const t = (k, d = {}) => {
    if (typeof window.t === 'function') {
        return window.t(k, d);
    }
    return k;
};

// Форматирование времени (например: "5м", "2ч", "1д")
export function formatPostTime(timestamp) {
    if (!timestamp) return '';
    try {
        const postDate = new Date(timestamp);
        if (isNaN(postDate.getTime())) return '';
        const now = new Date();
        const diffInSeconds = Math.floor((now - postDate) / 1000);
        
        // Используем t() для суффиксов
        if (diffInSeconds < 60) return t('time_just_now');
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}${t('time_m')}`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}${t('time_h')}`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}${t('time_d')}`;
        const weeks = Math.floor(diffInDays / 7);
        if (diffInDays < 30) return `${weeks}${t('time_w')}`;
        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths}${t('time_mo')}`;
    } catch { return ''; }
}