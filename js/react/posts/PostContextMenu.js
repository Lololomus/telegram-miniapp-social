// react/posts/PostContextMenu.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS, tg } from './posts_utils.js';

const h = React.createElement;

function PostContextMenu({ post, targetElement, onClose, onOpenProfile, onRespond, onRepost, onEdit, onDelete, onLayout }) {
  const isMyPost = post.author?.user_id && String(post.author.user_id) === String(window.__CURRENT_USER_ID);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: -9999, left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!targetElement || !menuRef.current) return;
    
    // Получаем координаты карточки
    const cardRect = targetElement.getBoundingClientRect();
    
    const menuHeight = menuRef.current.offsetHeight;
    const menuWidth = Math.min(cardRect.width - 40, 280);
    const left = cardRect.left + (cardRect.width - menuWidth) / 2;
    
    const margin = 8;
    const spaceBelow = window.innerHeight - cardRect.bottom;
    const neededSpace = menuHeight + margin;
    
    let verticalAdjust = 0;
    if (spaceBelow < neededSpace) {
        verticalAdjust = (neededSpace - spaceBelow);
    }
    
    if (onLayout) {
        onLayout({ menuHeight, verticalAdjust });
    }
    
    // Используем fixed positioning, поэтому window.scrollY НЕ нужен, если контейнер fixed
    const top = cardRect.bottom - verticalAdjust + margin; 
    
    setPosition({ top, left, width: menuWidth, opacity: 1 });
  }, [targetElement, onLayout]);

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    onClose();
  };
  
  const doAction = (actionFn) => (e) => {
    e.stopPropagation();
    if (actionFn) actionFn(post);
  };

  // БЕЗ ПОРТАЛА. Рендеримся там, где нас вызвали (в PostsApp).
  // Используем position: fixed для перекрытия списка.
  return h(motion.div, {
    key: `backdrop-${post.post_id}`,
    className: 'post-context-menu-backdrop',
    initial: { opacity: 0, pointerEvents: 'none' },
    animate: { opacity: 1, pointerEvents: 'auto' },
    exit: { opacity: 0, pointerEvents: 'none' },
    transition: { duration: 0.15 },
    onClick: handleBackdropClick,
    style: { position: 'fixed', inset: 0, zIndex: 2000 }
  },
    h(motion.div, {
        key: `menu-${post.post_id}`,
        ref: menuRef,
        className: `post-context-menu-container ${isIOS ? 'is-ios' : ''}`,
        style: {
            position: 'absolute', // Абсолютно внутри fixed контейнера = работает как fixed
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 2002,
        },
        initial: { opacity: 0, scale: 0.9, y: -10 },
        animate: { opacity: position.opacity, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
        transition: { type: 'spring', damping: 20, stiffness: 300 },
        onClick: (e) => e.stopPropagation()
    },
      h('div', { className: 'post-context-menu-group' },
        isMyPost
          ? [ 
              h('button', { key: 'edit', className: 'post-context-menu-button', onClick: doAction(onEdit) }, `✏️ ${t('action_edit')}`),
              h('button', { key: 'repost', className: 'post-context-menu-button', onClick: doAction(onRepost) }, `🔗 ${t('action_repost')}`),
              h('button', { key: 'delete', className: 'post-context-menu-button destructive', onClick: doAction(onDelete) }, `🗑️ ${t('action_delete')}`)
            ]
          : [ 
              h('button', { key: 'respond', className: 'post-context-menu-button', onClick: doAction(onRespond) }, `🚀 ${t('action_respond')}`),
              h('button', { key: 'repost', className: 'post-context-menu-button', onClick: doAction(onRepost) }, `🔗 ${t('action_repost')}`),
              h('button', { key: 'profile', className: 'post-context-menu-button', onClick: doAction(onOpenProfile) }, `👤 ${t('action_view_profile')}`)
            ]
      )
    )
  );
}
export default PostContextMenu;