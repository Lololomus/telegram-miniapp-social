// react/posts/PostContextMenu.js
// ОБНОВЛЕНО: Добавлена поддержка light theme (только цвета backdrop)

import React, { useState, useRef, useLayoutEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS } from './posts_utils.js';
import PostCard from './PostCard.js';

const h = React.createElement;

function PostContextMenu({ post, targetElement, onClose, onOpenProfile, onRespond, onRepost, onEdit, onDelete }) {
  const isMyPost = post.author?.user_id && String(post.author.user_id) === String(window.__CURRENT_USER_ID);
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    if (!targetElement) return;
    const rect = targetElement.getBoundingClientRect();
    const MENU_WIDTH = 250;
    const MENU_HEIGHT_ESTIMATE = 200;
    const SCREEN_MARGIN = 16;
    const BOTTOM_SAFE_AREA = 40;

    let menuLeft = rect.left + (rect.width / 2) - (MENU_WIDTH / 2);
    if (menuLeft < SCREEN_MARGIN) menuLeft = SCREEN_MARGIN;
    if (menuLeft + MENU_WIDTH > window.innerWidth - SCREEN_MARGIN) {
      menuLeft = window.innerWidth - MENU_WIDTH - SCREEN_MARGIN;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    let menuTop = rect.bottom + 12;
    let verticalAdjust = 0;
    if (spaceBelow < MENU_HEIGHT_ESTIMATE + BOTTOM_SAFE_AREA) {
      const overflow = (MENU_HEIGHT_ESTIMATE + BOTTOM_SAFE_AREA + 12) - spaceBelow;
      verticalAdjust = -overflow;
    }

    setLayout({
      card: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      menu: { top: menuTop, left: menuLeft, width: MENU_WIDTH },
      verticalAdjust: verticalAdjust
    });
  }, [targetElement]);

  if (!layout) return null;

  const handleAction = (actionFn) => (e) => {
    e.stopPropagation();
    if (actionFn) actionFn(post);
    onClose();
  };

  return h(motion.div, {
    key: `ctx-wrapper-${post.post_id}`,
    style: { position: 'fixed', inset: 0, zIndex: 2000 },
    initial: "hidden",
    animate: "visible",
    exit: "exit"
  },
    // 1. BACKDROP
    h(motion.div, {
      className: 'post-context-menu-backdrop',
      onClick: (e) => { e.stopPropagation(); onClose(); },
      initial: { opacity: 0, backdropFilter: "blur(0px)" },
      animate: { opacity: 1, backdropFilter: "blur(8px)" },
      exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.2 } },
      style: {
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.85)' // Темный фон работает для обеих тем
      }
    }),
    // 2. КЛОН КАРТОЧКИ
    h(motion.div, {
      style: {
        position: 'absolute',
        top: layout.card.top,
        left: layout.card.left,
        width: layout.card.width,
        zIndex: 2002,
        pointerEvents: 'none',
        transformOrigin: 'center center'
      },
      initial: { y: 0, scale: 1 },
      animate: {
        y: layout.verticalAdjust,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
      },
      exit: {
        y: 0, scale: 1, opacity: 0,
        transition: { duration: 0.2 }
      }
    },
      h(PostCard, {
        post: post,
        isHighlight: true,
        disableClick: true,
      })
    ),
    // 3. МЕНЮ
    h(motion.div, {
      className: `post-context-menu-container ${isIOS ? 'is-ios' : ''}`,
      style: {
        position: 'absolute',
        top: layout.menu.top,
        left: layout.menu.left,
        width: layout.menu.width,
        zIndex: 2003,
        transformOrigin: 'top center',
        pointerEvents: 'auto'
      },
      initial: { opacity: 0, scale: 0.9, y: 0 },
      animate: {
        opacity: 1, scale: 1,
        y: layout.verticalAdjust,
        transition: { type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }
      },
      exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
    },
      h('div', { className: 'post-context-menu-group' },
        isMyPost
          ? [
            h('button', { key: 'edit', className: 'post-context-menu-button', onClick: handleAction(onEdit) }, `✏️ ${t('action_edit')}`),
            h('button', { key: 'repost', className: 'post-context-menu-button', onClick: handleAction(onRepost) }, `🔗 ${t('action_repost')}`),
            h('button', { key: 'delete', className: 'post-context-menu-button destructive', onClick: handleAction(onDelete) }, `🗑️ ${t('action_delete')}`)
          ]
          : [
            h('button', { key: 'respond', className: 'post-context-menu-button', onClick: handleAction(onRespond) }, `🚀 ${t('action_respond')}`),
            h('button', { key: 'repost', className: 'post-context-menu-button', onClick: handleAction(onRepost) }, `🔗 ${t('action_repost')}`),
            h('button', { key: 'profile', className: 'post-context-menu-button', onClick: handleAction(onOpenProfile) }, `👤 ${t('action_view_profile')}`)
          ]
      )
    )
  );
}

export default PostContextMenu;