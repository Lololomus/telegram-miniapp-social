// react/feed/FeedList.js
import React, { useState, useEffect, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import FeedCard from './FeedCard.js';

const h = React.createElement;
const BATCH_SIZE = 10;

function FeedList({ profiles, onOpen, containerRef }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  // Observer для подгрузки
  useEffect(() => {
    if (visibleCount >= profiles.length) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setVisibleCount(prev => prev + BATCH_SIZE);
        }
    }, { root: null, rootMargin: '400px', threshold: 0.1 }); // Грузим заранее (400px)

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, [visibleCount, profiles.length]);

  const visibleProfiles = profiles.slice(0, visibleCount);

  return h(motion.div, {
    ref: containerRef,
    layout: false, // Отключаем тяжелый layout
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  },
    visibleProfiles.map((p, index) => {
        // Используем остаток от деления, чтобы анимация волны работала для каждой порции
        const animationIndex = index % BATCH_SIZE;
        
        return h(FeedCard, {
            key: p.user_id,
            u: p,
            index: animationIndex, 
            onOpen: onOpen
        });
    }),

    // Невидимый элемент-триггер внизу
    visibleCount < profiles.length && h('div', {
        ref: sentinelRef,
        style: { height: '20px', width: '100%', opacity: 0, pointerEvents: 'none' }
    })
  );
}

export default FeedList;