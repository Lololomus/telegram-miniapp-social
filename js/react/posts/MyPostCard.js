// react/posts/MyPostCard.js
// Компонент-обертка для "Моих постов", добавляет long-press.

import React, { memo, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import PostCard from './PostCard.js';
import { isIOS, cardVariants } from './utils.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

/**
 * Компонент MyPostCard
 * (Вынесен из react-posts-feed.js)
 */
const MyPostCard = memo(function MyPostCard({ post, index, onOpenProfile, onOpenPostSheet, onOpenContextMenu, onEdit, onDelete, isContextMenuOpen, menuLayout }) {
  const postKey = post.post_id || `temp-post-${Math.random()}`;
  
  // --- Логика жестов (Long-Press / Tap) ---
  const gestureTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const cardRef = useRef(null);
  const POINTER_SLOP = 5;

  const handlePointerDown = (e) => {
    pointerStartRef.current = { y: e.pageY };
    
    if (tg?.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
    }

    if (gestureTimerRef.current) {
        clearTimeout(gestureTimerRef.current);
    }

    gestureTimerRef.current = setTimeout(() => {
        if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy');
        
        onOpenContextMenu(post, cardRef.current); 
        
        pointerStartRef.current = null; 
        
        if (tg?.enableVerticalSwipes) {
            tg.enableVerticalSwipes();
        }
    }, 300);
  };

  const handlePointerMove = (e) => {
    if (!pointerStartRef.current) return;

    const deltaY = Math.abs(e.pageY - pointerStartRef.current.y);

    if (deltaY > POINTER_SLOP) {
        clearTimeout(gestureTimerRef.current);
        pointerStartRef.current = null;
        
        if (tg?.enableVerticalSwipes) {
            tg.enableVerticalSwipes();
        }
    }
  };

  const handlePointerUp = (e) => {
    if (tg?.enableVerticalSwipes) {
        tg.enableVerticalSwipes();
    }
    
    clearTimeout(gestureTimerRef.current);

    // Если pointerStartRef не был сброшен (т.е. это НЕ был long-press и НЕ был скролл),
    //    значит, это был Tap!
    if (pointerStartRef.current) {
        onOpenPostSheet(post);
    }
    
    pointerStartRef.current = null;
  };
  // --- Конец логики жестов ---
  
  const isActive = isContextMenuOpen;
  const verticalShift = isActive ? -(menuLayout?.verticalAdjust || 0) : 0;

  return h(motion.div, {
    ref: cardRef,
    layout: isIOS ? false : "position",
    
    variants: cardVariants, 
    custom: { i: index },
    initial: "hidden",
    exit: "exit",
    
    animate: {
        opacity: 1,
        x: 0,
        scale: isActive ? 1.03 : 1,
        y: verticalShift
    },
    transition: {
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        delay: isIOS ? 0 : index * 0.1
    },
    
    style: {
      position: 'relative',
      width: '100%',
      marginBottom: '15px', 
      borderRadius: 12,
      cursor: 'pointer',
      zIndex: isContextMenuOpen ? 2001 : 'auto'
    },
    
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onContextMenu: (e) => e.preventDefault(),

  },
    
    // Рендерим PostCard ВНУТРИ этой обертки
    h(PostCard, {
      post: post,
      index: index,
      onOpenProfile: onOpenProfile,
      onOpenPostSheet: onOpenPostSheet,
      onOpenContextMenu: onOpenContextMenu,
      onTagClick: () => {},
      disableClick: true, // <-- ВАЖНО: отключаем клик у дочернего
      showActionsSpacer: false,
      isWrapped: true, // Сообщаем PostCard, что он "обернут"
      isContextMenuOpen: isContextMenuOpen,
      menuLayout: menuLayout
    })
  );
});

export default MyPostCard;