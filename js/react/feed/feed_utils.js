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
} from '../shared/react_shared_utils.js';


/**
 * Функция перевода (i18n)
 * (Локальная, УПРОЩЕННАЯ версия, СПЕЦИАЛЬНО для ленты людей)
 * (Взята из react-feed.js)
 */
export const t = (k, d={}) => {
  const dict = {
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

/**
 * Компонент-хелпер: TopSpacer (пустышка для отступа)
 * (Взят из react-feed.js)
 */
export function TopSpacer() {
  return h('div', {style:{height: '0px'}});
}