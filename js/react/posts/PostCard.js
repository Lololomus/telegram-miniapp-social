// react/posts/PostCard.js
import React, { memo, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import {
  t,
  formatPostTime,
  isMobile,
  isIOS,
  cardVariants,
  FEED_ITEM_SPRING,
} from './posts_utils.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

const PostCard = memo(function PostCard({
  post,
  index,
  onOpenProfile,
  onOpenPostSheet,
  onOpenContextMenu,
  disableClick = false,
  styleOverride = {},
  showActionsSpacer = false,
  isContextMenuOpen,
  isHighlight = false, 
}) {
  const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
  const { content = 'Нет описания', post_type = 'default', skill_tags = [], created_at } = post;
  const avatar = author.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
  const type_map = { looking: { text: t('post_type_looking'), color: '#0A84FF' }, offering: { text: t('post_type_offering'), color: '#34C759' }, showcase: { text: t('post_type_showcase'), color: '#FF9500' } };
  const type_info = type_map[post_type] || { text: t('post_type_default'), color: '#8E8E93' };
  const timeAgo = formatPostTime(created_at);
  const postKey = post.post_id || `temp-post-${Math.random()}`;
  
  const gestureTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const cardRef = useRef(null);
  const POINTER_SLOP = 5;

  const handlePointerDown = (e) => {
    if (disableClick || isContextMenuOpen) return;
    pointerStartRef.current = { y: e.pageY };
    if (tg?.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    gestureTimerRef.current = setTimeout(() => {
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy');
      onOpenContextMenu(post, cardRef.current);
      pointerStartRef.current = null; 
      if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes();
    }, 300);
  };
  const handlePointerMove = (e) => {
    if (disableClick || !pointerStartRef.current) return;
    const deltaY = Math.abs(e.pageY - pointerStartRef.current.y);
    if (deltaY > POINTER_SLOP) { clearTimeout(gestureTimerRef.current); pointerStartRef.current = null; if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes(); }
  };
  const handlePointerUp = (e) => {
    if (disableClick || isContextMenuOpen) return;
    if (tg?.enableVerticalSwipes) tg.enableVerticalSwipes();
    clearTimeout(gestureTimerRef.current);
    if (pointerStartRef.current) {
      const target = e.target;
      if (target.closest('[data-action="open-profile"]')) { e.stopPropagation(); onOpenProfile(author); } else { onOpenPostSheet(post); }
      pointerStartRef.current = null;
    }
  };

  const layoutMode = (disableClick || isHighlight) ? undefined : (isMobile ? false : 'position');
  
  const cloneStyles = isHighlight ? {
      boxShadow: '0 12px 40px rgba(0,0,0,0.4)', 
      transition: 'none',
      zIndex: 10,
      backgroundColor: 'var(--secondary-bg-color)',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
  } : {
      transition: 'transform 0.2s ease, background-color 0.3s, border-color 0.3s',
  };

  // Анимации:
  // На мобильных отключаем (пустой объект), чтобы не было мерцания всей карточки.
  // На ПК оставляем волну.
  const variants = isMobile 
    ? {} 
    : (isIOS 
        ? cardVariants 
        : {
            hidden: { opacity: 0, x: -20 }, 
            visible: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -10 }
        }
    );

  const isFirstBatch = index < 10; 
  // На мобильных delay=0 (мгновенно). На ПК сохраняем волну.
  const delayStep = 0.05; 
  const delay = (!isMobile && isFirstBatch) ? index * delayStep : 0;

  const fixedTransition = {
      ...FEED_ITEM_SPRING, 
      delay: delay,        
      x: { ...FEED_ITEM_SPRING, delay: delay },
      opacity: { duration: 0.2, delay: delay },
      scale: { ...FEED_ITEM_SPRING, delay: delay }
  };

  const visibleState = { opacity: 1, x: 0, scale: 1 };
  const shouldForceAnimate = isMobile || isFirstBatch || isHighlight;

  return h(
    motion.div,
    {
      ref: cardRef,
      layout: layoutMode,
      variants: variants,
      // На мобильных сразу visible
      initial: isMobile ? "visible" : (isHighlight ? "visible" : "hidden"),
      
      animate: shouldForceAnimate ? visibleState : undefined,
      whileInView: shouldForceAnimate ? undefined : visibleState,
      viewport: shouldForceAnimate ? undefined : { once: true, amount: 0, margin: "200px" },

      exit: "exit",
      
      transition: isMobile ? { duration: 0 } : (isHighlight ? { duration: 0 } : fixedTransition),
      
      key: postKey,
      className: 'react-feed-card-wrapper',
      style: {
        width: '100%',
        cursor: disableClick ? 'default' : 'pointer',
        position: 'relative',
        pointerEvents: disableClick ? 'none' : 'auto',
        ...styleOverride,
      },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onContextMenu: (e) => { if (!disableClick) e.preventDefault(); },
    },
    h(
      motion.div,
      {
        className: 'react-feed-card',
        style: { 
            padding: 15, 
            width: '100%', 
            borderRadius: 12, 
            overflow: 'hidden',
            ...cloneStyles 
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
        h(
          'button',
          {
            'data-action': 'open-profile',
            style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 },
          },
          h(
            'div',
            { style: { height: 44, width: 44, borderRadius: '50%', background: 'var(--secondary-bg-color)', overflow: 'hidden' } },
            // 🔥 ИСПРАВЛЕНИЕ МЕРЦАНИЯ АВАТАРА
            // 1. Убрали loading="lazy" (теперь грузится сразу).
            // 2. Добавили decoding="async" (не блокирует поток).
            // 3. Добавили draggable="false" (чтобы не таскалось случайно).
            h('img', { 
                src: avatar, 
                alt: '', 
                decoding: 'async', 
                draggable: 'false',
                style: { width: '100%', height: '100%', objectFit: 'cover' } 
            })
          ),
        ),
        h(
          'div',
          { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, marginRight: '5px' } },
          h(
            'button',
            {
              'data-action': 'open-profile',
              style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' },
            },
            h(
              'div',
              { style: { fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, #000)' } },
              author.first_name || 'User',
            ),
          ),
          timeAgo && h('div', { style: { fontSize: 14, color: 'var(--main-hint-color, #999)' } }, timeAgo),
        ),
        h(
          'div',
          { style: { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: type_info.color, color: '#FFFFFF', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' } },
          type_info.text,
        ),
        showActionsSpacer && h('div', { style: { width: '40px', flexShrink: 0 } }),
      ),
      
      h('p', { className: 'post-content-clamped' }, content),
      
      skill_tags && skill_tags.length > 0 && h(
          'div',
          { className: 'feed-card-skills-container' },
          skill_tags.map((skill, i) => 
              h('span', { key: i, className: 'skill-tag skill-tag--display', style: { cursor: 'default' } }, skill)
          )
      )
    ),
  );
});

export default PostCard;