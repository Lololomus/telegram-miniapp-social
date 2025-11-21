// react/posts/posts_utils.js
//
// Этот файл содержит ТОЛЬКО утилиты, уникальные для /react/posts/
// (Расширенный 't', 'formatPostTime', 'CloseButton').
// Все остальное импортируется из /react/shared/utils.js
//
// ИСПРАВЛЕНИЕ: Путь к 'shared' был '../../react/shared/utils.js', стал '../shared/utils.js'

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
    useBodyScrollLock,
    useSheetLogic,
    SheetControls,
} from '../shared/react_shared_utils.js';

export const t = (k, d = {}) => {
    if (typeof window.t === 'function') {
        return window.t(k, d);
    }
    return k;
};

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