// react/posts/utils.js
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
    listVariants
} from '../shared/utils.js'; // <-- ✅ ИСПРАВЛЕННЫЙ ПУТЬ


/**
 * Функция перевода (i18n)
 * (Расширенная версия, СПЕЦИАЛЬНО для ленты постов)
 */
export const t = (k, d = {}) => {
    const dict = {
        'feed_empty': 'Нет запросов', 'links': 'Ссылки', 'skills': 'Навыки',
        'experience': 'Опыт работы', 'education': 'Образование', 'present_time': 'по наст. время',
        'post_type_looking': '🤝 Ищет', 'post_type_offering': '💼 Предлагает',
        'post_type_showcase': '🚀 Демо', 'post_type_default': 'Запрос',
        'job_not_specified': 'Опыт не указан',
        'my_posts_title': 'Мои запросы',
        'feed_posts_title': 'Лента запросов',
        'edit_post_title': 'Редактировать запрос',
        'post_type_label': 'Тип запроса:',
        'post_content_label': 'Краткое описание:',
        'post_full_description_label': 'Полное описание (необязательно):',
        'post_skills_label': 'Теги (навыки):',
        'select_skills_button': 'Выбрать навыки',
        'post_type_placeholder': 'Выберите тип запроса...',
        'action_respond': 'Откликнуться',
        'action_repost': 'Репост',
        'action_view_profile': 'Посмотреть профиль',
        'action_edit': 'Редактировать',
        'action_delete': 'Удалить',
        'action_cancel': 'Отмена',
        'action_respond_toast': 'Функция "Откликнуться" в разработке',
        'action_repost_toast': 'Функция "Репост" в разработке'
    };
    let s = dict[k] || k;
    Object.entries(d).forEach(([k, v]) => { s = s.replace(new RegExp(`{${k}}`, 'g'), v); });
    return s;
};

/**
 * Утилита форматирования времени
 * (Уникальна для ленты постов)
 */
export function formatPostTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const postDate = new Date(timestamp);
        if (isNaN(postDate.getTime())) {
            console.error("Invalid post timestamp:", timestamp);
            return '';
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now - postDate) / 1000);
        
        if (diffInSeconds < 60) return 'только что';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}м`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}ч`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}д`;
        
        if (diffInDays < 30) {
            const weeks = Math.floor(diffInDays / 7);
            return `${weeks}нед`;
        }
        
        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths}мес`;
    } catch {
        return '';
    }
}

/**
 * Компонент-хелпер: Кнопка "Закрыть" (Крестик)
 * (Используется только в EditPostModal)
 */
export function CloseButton({ onClick, isIOS }) {
    return h('button', {
        className: `react-sheet-close-button ${isIOS ? 'is-ios' : ''}`,
        onClick: onClick,
        'aria-label': 'Закрыть',
    }, 
        h('svg', { 
            xmlns: 'http://www.w3.org/2000/svg', 
            viewBox: '0 0 24 24', 
            fill: 'none', 
            stroke: 'currentColor', 
            strokeWidth: '2.5', 
            strokeLinecap: 'round', 
            strokeLinejoin: 'round' 
        },
            h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            h('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
        )
    );
}