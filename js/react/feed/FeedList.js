// react/feed/FeedList.js
// Компонент, отвечающий за рендеринг списка профилей людей.

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
// ИЗМЕНЕНИЕ: Убираем listVariants, он больше не нужен
import { isIOS } from './feed_utils.js'; 
import FeedCard from './FeedCard.js';

const h = React.createElement;

/**
 * Компонент FeedList
 * (Вынесен из react-feed.js)
 */
function FeedList({profiles, onOpen, containerRef}) {
  
  // ИЗМЕНЕНИЕ: Мы убираем 'variants', 'initial', 'animate'
  // И, ГЛАВНОЕ, 'layout: true' из родителя.
  // Это устраняет Конфликт №3.
  return h(motion.div, {
    ref: containerRef,
    // variants: listVariants, // <-- УДАЛЕНО
    // initial: "hidden", // <-- УДАЛЕНО
    // animate: "visible", // <-- УДАЛЕНО
    // layout: true, // <-- УДАЛЕНО (ЭТО БЫЛА ГЛАВНАЯ ОШИБКА)
    style: { 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }
  },
    h(AnimatePresence, {
      mode: isIOS ? "sync" : "popLayout",
      initial: false
    },
      profiles.map((p, index) => h(FeedCard, {
        key: p.user_id,
        u: p, 
        index: index, // Передаем index для ручной задержки (Система Б)
        onOpen: onOpen
      }))
    )
  );
}

export default FeedList;