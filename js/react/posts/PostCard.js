// react/posts/PostCard.js
// ОБНОВЛЕНО: Добавлена поддержка light theme через getThemeColors() и getTypeColors()

import React, { memo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import {
  t,
  formatPostTime,
  isMobile,
  isIOS,
  cardVariants,
  FEED_ITEM_SPRING,
  useCardGestures,
} from './posts_utils.js';
import { getThemeColors, getTypeColors } from '../shared/react_shared_utils.js';

const h = React.createElement;

// Получить SVG иконку по типу поста
const getPostTypeIcon = (post_type) => {
  const iconProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { width: 20, height: 20 }
  };

  switch (post_type) {
    case 'looking':
      return h('svg', iconProps,
        h('circle', { cx: 11, cy: 11, r: 8 }),
        h('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      );
    case 'offering':
      return h('svg', iconProps,
        h('rect', { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }),
        h('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' })
      );
    case 'showcase':
      return h('svg', iconProps,
        h('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })
      );
    default:
      return null;
  }
};

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
  const colors = getThemeColors(); // Получаем цвета темы
  const typeColors = getTypeColors(); // Получаем цвета типов

  const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
  const { content = 'Нет описания', post_type = 'default', skill_tags = [], created_at } = post;
  const avatar = author.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';

  // Динамические цвета типов
  const type_color = typeColors[post_type] || typeColors.default;

  const timeAgo = formatPostTime(created_at);
  const postKey = post.post_id || `temp-post-${Math.random()}`;

  const { targetRef, gestureProps } = useCardGestures({
    onOpenPrimary: () => onOpenPostSheet(post),
    onOpenSecondary: null,
    onOpenContextMenu: (el) => onOpenContextMenu(post, el),
    disableClick: disableClick || isContextMenuOpen
  });

  const layoutMode = (disableClick || isHighlight) ? undefined : (isMobile ? false : 'position');

  const cloneStyles = isHighlight ? {
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    transition: 'none',
    zIndex: 10,
    backgroundColor: 'var(--secondary-bg-color)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    borderColor: 'rgba(255,255,255,0.2)'
  } : {
    transition: 'transform 0.2s ease, background-color 0.3s, border-color 0.3s',
  };

  const variants = isMobile ? {} : (isIOS ? cardVariants : {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
  });

  const isFirstBatch = index < 10;
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
      ref: targetRef,
      ...gestureProps,
      layout: layoutMode,
      variants: variants,
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
      // HEADER
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
        // АВАТАР
        h(
          'div',
          {
            style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 },
          },
          h(
            'div',
            {
              style: {
                height: 44,
                width: 44,
                borderRadius: '14px',
                background: 'var(--secondary-bg-color)',
                overflow: 'hidden',
              }
            },
            h('img', {
              src: avatar,
              alt: '',
              decoding: 'async',
              draggable: 'false',
              style: { width: '100%', height: '100%', objectFit: 'cover' }
            })
          )
        ),
        // ИМЯ + ВРЕМЯ
        h(
          'div',
          { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, marginRight: '5px' } },
          h(
            'div',
            {
              style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' },
            },
            h(
              'div',
              { style: { fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.text } }, // Динамический цвет
              author.first_name || 'User',
            )
          ),
          timeAgo && h('div', { style: { fontSize: 14, color: colors.hint } }, timeAgo) // Динамический цвет
        ),
        // БЕЙДЖ ТИПА
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${type_color}1A`,
              color: type_color,
              border: `1.5px solid ${type_color}`,
              flexShrink: 0
            }
          },
          getPostTypeIcon(post_type)
        ),
        showActionsSpacer && h('div', { style: { width: '40px', flexShrink: 0 } })
      ),
      // КОНТЕНТ
      h('p', { className: 'post-content-clamped' }, content),
      // НАВЫКИ
      skill_tags && skill_tags.length > 0 && h(
        'div',
        { className: 'feed-card-skills-container' },
        skill_tags.map((skill, i) =>
          h('span', { key: i, className: 'skill-tag skill-tag--display', style: { cursor: 'default' } }, skill)
        )
      )
    )
  );
});

export default PostCard;