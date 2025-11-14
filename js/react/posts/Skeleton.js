// react/posts/Skeleton.js
// Компоненты-заглушки (скелетоны) для ленты постов.

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
const h = React.createElement;

/**
 * Компонент SkeletonCard
 * (Воссоздает <template id="skeleton-card-template"> из index.html)
 */
function SkeletonCard({ index }) {
  // Используем motion для плавного появления с задержкой
  return h(motion.div, {
    className: 'skeleton-card',
    // Стили из feed.css
    // .react-feed-card имеет gap: 12px в feed.css,
    // но .skeleton-card нет. Добавим margin для соответствия.
    style: { marginBottom: '12px' },
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { delay: (index || 0) * 0.1, duration: 0.3 }
  },
    h('div', { className: 'skeleton-avatar' }),
    h('div', { className: 'skeleton-info' },
      h('div', { className: 'skeleton-line' }),
      h('div', { className: 'skeleton-line short' })
    )
  );
}

/**
 * Компонент SkeletonList
 * (Рендерит 5 скелетонов)
 */
export function SkeletonList() {
  return h('div', {
    style: { 
        position: 'relative'
    }
  },
    // Рендерим 5 скелетонов
    [...Array(5)].map((_, i) => h(SkeletonCard, { key: i, index: i }))
  );
}