// react/feed/FeedList.js
// Компонент, отвечающий за рендеринг списка профилей людей.

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { listVariants, isIOS } from './utils.js';
import FeedCard from './FeedCard.js';

const h = React.createElement;

/**
 * Компонент FeedList
 * (Вынесен из react-feed.js)
 */
function FeedList({profiles, onOpen, containerRef}) {
  return h(motion.div, {
    ref: containerRef,
    variants: listVariants,
    initial: "hidden",
    animate: "visible",
    // Стили .feed-list (display: flex, gap: 12px) 
    // применяются к этому div через #feed-list в index.html
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
        key: p.user_id, // Ключ critical
        u: p, 
        index: index,
        onOpen: onOpen
      }))
    )
  );
}

export default FeedList;