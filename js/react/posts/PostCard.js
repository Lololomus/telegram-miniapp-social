// react/posts/PostCard.js
// Компонент отображения одной карточки поста.

import React, { memo, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

import {
  t,
  formatPostTime,
  isIOS,
  cardVariants,
  FEED_ITEM_SPRING, // берем spring из shared utils
} from './posts_utils.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

/**
 * Компонент PostCard
 * (Вынесен из react-posts-feed.js)
 */
const PostCard = memo(function PostCard({
  post,
  index,
  onOpenProfile,
  onOpenPostSheet,
  onOpenContextMenu,
  onTagClick,
  disableClick = false,
  styleOverride = {},
  showActionsSpacer = false,
  isContextMenuOpen,
  menuLayout,
  isWrapped = false,
}) {
  const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
  const {
    content = 'Нет описания',
    post_type = 'default',
    skill_tags = [],
    created_at,
  } = post;

  const avatar = author.photo_path
    ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}`
    : 'https://t.me/i/userpic/320/null.jpg';

  const type_map = {
    looking: { text: t('post_type_looking'), color: '#0A84FF' },
    offering: { text: t('post_type_offering'), color: '#34C759' },
    showcase: { text: t('post_type_showcase'), color: '#FF9500' },
  };

  const type_info = type_map[post_type] || { text: t('post_type_default'), color: '#8E8E93' };
  const timeAgo = formatPostTime(created_at);
  const postKey = post.post_id || `temp-post-${Math.random()}`;

  // --- Логика жестов (Long-Press / Tap) ---
  const gestureTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const cardRef = useRef(null);

  const POINTER_SLOP = 5;

  const handlePointerDown = (e) => {
    if (disableClick) return;

    pointerStartRef.current = { y: e.pageY };

    if (tg?.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }

    if (gestureTimerRef.current) {
      clearTimeout(gestureTimerRef.current);
    }

    gestureTimerRef.current = setTimeout(() => {
      if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred('heavy');
      }

      onOpenContextMenu(post, cardRef.current);
      pointerStartRef.current = null;

      if (tg?.enableVerticalSwipes) {
        tg.enableVerticalSwipes();
      }
    }, 300);
  };

  const handlePointerMove = (e) => {
    if (disableClick || !pointerStartRef.current) return;

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
    if (disableClick) return;

    if (tg?.enableVerticalSwipes) {
      tg.enableVerticalSwipes();
    }

    clearTimeout(gestureTimerRef.current);

    if (pointerStartRef.current) {
      const target = e.target;

      if (target.closest('[data-action="open-profile"]')) {
        e.stopPropagation();
        onOpenProfile(author);
      } else {
        onOpenPostSheet(post);
      }

      pointerStartRef.current = null;
    }
  };

  // --- Конец логики жестов ---

  const isActive = isContextMenuOpen;
  const liftY =
    isActive && !isWrapped ? -(menuLayout?.verticalAdjust || 0) : 0;

  return h(
    motion.div,
    {
      ref: cardRef,
      // ВНЕШНИЙ слой: только layout + волна (через cardVariants/listVariants)
      layout: disableClick ? undefined : (isIOS ? false : 'position'),
      variants: cardVariants,
      custom: { i: index },
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
      transition: FEED_ITEM_SPRING, // без задержки по индексу
      key: postKey,
      className: 'react-feed-card-wrapper',
      style: {
        width: '100%',
        cursor: disableClick ? 'inherit' : 'pointer',
        position: 'relative',
        zIndex: isContextMenuOpen ? 2001 : 'auto',
        ...styleOverride,
      },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onContextMenu: (e) => {
        if (!disableClick) e.preventDefault();
      },
    },

    // ВНУТРЕННИЙ слой: визуальная карточка со стеклом + подъем при long‑press
    h(
      motion.div,
      {
        className: 'react-feed-card', // <- тут живет стекло (blur, градиент)
        animate: {
          scale: isActive ? 1.03 : 1,
          y: liftY,
        },
        transition: {
          type: 'spring',
          stiffness: 320,
          damping: 32,
        },
        style: {
          padding: 15,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          // фон и blur берутся из CSS .react-feed-card
        },
      },

      // --- Хедер карточки (аватар + имя + время + тип) ---
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          },
        },
        // Аватар
        h(
          'button',
          {
            'data-action': 'open-profile',
            style: {
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            },
          },
          h(
            'div',
            {
              style: {
                height: 44,
                width: 44,
                borderRadius: '50%',
                background: 'var(--secondary-bg-color)',
                overflow: 'hidden',
              },
            },
            h('img', {
              src: avatar,
              alt: '',
              loading: 'lazy',
              style: { width: '100%', height: '100%', objectFit: 'cover' },
            }),
          ),
        ),

        // Имя и время
        h(
          'div',
          {
            style: {
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              marginRight: '10px',
            },
          },
          h(
            'button',
            {
              'data-action': 'open-profile',
              style: {
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
              },
            },
            h(
              'div',
              {
                style: {
                  fontWeight: 600,
                  fontSize: 16,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--main-text-color, #000)',
                },
              },
              author.first_name || 'User',
            ),
          ),
          timeAgo &&
            h(
              'div',
              {
                style: {
                  fontSize: 14,
                  color: 'var(--main-hint-color, #999)',
                },
              },
              timeAgo,
            ),
        ),

        // Тег типа
        h(
          'div',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 8,
              background: type_info.color,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            },
          },
          type_info.text,
        ),

        showActionsSpacer &&
          h('div', {
            style: {
              width: '40px',
              flexShrink: 0,
            },
          }),
      ),

      // --- Контент поста ---
      h(
        'p',
        {
          style: {
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--main-text-color, #000)',
            whiteSpace: 'pre-wrap',
            maxHeight: '4.5em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          },
        },
        content,
      ),

      // --- Теги навыков ---
      skill_tags.length > 0 &&
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 12,
            },
          },
          skill_tags.map((tag) =>
            h(
              'span',
              {
                key: tag,
                className: 'skill-tag skill-tag--display',
              },
              tag,
            ),
          ),
        ),
    ),
  );
});

export default PostCard;