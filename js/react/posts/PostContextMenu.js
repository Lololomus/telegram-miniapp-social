// react/posts/PostContextMenu.js
// Плавающее контекстное меню для карточек постов.

import React, { useState, useEffect, useRef, useLayoutEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { t, isIOS } from './utils.js';

const h = React.createElement;

/**
 * Компонент PostContextMenu
 * (Вынесен из react-posts-feed.js)
 */
function PostContextMenu({ post, targetElement, onClose, onOpenProfile, onRespond, onRepost, onEdit, onDelete, onLayout }) {
  const isMyPost = post.author?.user_id === window.__CURRENT_USER_ID;
  const menuRef = useRef(null);
  
  const [position, setPosition] = useState({
    top: -9999,
    left: 0,
    width: 0,
    opacity: 0
  });

  useLayoutEffect(() => {
    if (!targetElement || !menuRef.current) return;

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

    const top = cardRect.bottom - verticalAdjust + margin;

    setPosition({
        top: top,
        left: left,
        width: menuWidth,
        opacity: 1
    });
    
  }, [targetElement, onLayout]);


  const handleBackdropClick = (e) => {
    e.stopPropagation();
    onClose();
  };
  
  const doAction = (actionFn) => (e) => {
    e.stopPropagation();
    if (actionFn) {
        actionFn(post);
    }
    onClose(); 
  };

  return h(motion.div, {
    key: `backdrop-${post.post_id}`,
    className: 'post-context-menu-backdrop',
    
    initial: { opacity: 0, pointerEvents: 'none' },
    animate: { 
        opacity: 1, 
        pointerEvents: 'auto' 
    },
    exit: { 
        opacity: 0, 
        pointerEvents: 'none' 
    },
    transition: { duration: 0.2, ease: 'easeOut' },
    onClick: handleBackdropClick,
    
    style: {
        position: 'fixed',
        inset: 0,
        zIndex: 2000
    }
  },
    
    h(motion.div, {
        key: `menu-${post.post_id}`,
        ref: menuRef,
        className: `post-context-menu-container ${isIOS ? 'is-ios' : ''}`,
        
        style: {
            position: 'absolute',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 2002,
        },
        
        initial: { opacity: 0, scale: 0.9, y: -10 },
        animate: { 
            opacity: position.opacity,
            scale: 1, 
            y: 0 
        },
        exit: { opacity: 0, scale: 0.9, y: -10 },
        transition: { type: 'spring', damping: 20, stiffness: 300 },
        
        onClick: (e) => e.stopPropagation()
    },
      
      h('div', { 
        className: 'post-context-menu-group'
      },
        isMyPost
          ? [ // Свои посты
              h('button', { 
                  key: 'edit', 
                  className: 'post-context-menu-button',
                  onClick: doAction(onEdit) 
              }, `✏️ ${t('action_edit')}`),
              
              h('button', { 
                  key: 'repost', 
                  className: 'post-context-menu-button',
                  onClick: doAction(onRepost) 
              }, `🔗 ${t('action_repost')}`),
              
              h('button', { 
                  key: 'delete', 
                  className: 'post-context-menu-button destructive',
                  onClick: doAction(onDelete) 
              }, `🗑️ ${t('action_delete')}`)
            ]
          : [ // Чужие посты
              h('button', { 
                  key: 'respond', 
                  className: 'post-context-menu-button',
                  onClick: doAction(onRespond) 
              }, `🚀 ${t('action_respond')}`),
              
              h('button', { 
                  key: 'repost', 
                  className: 'post-context-menu-button',
                  onClick: doAction(onRepost) 
              }, `🔗 ${t('action_repost')}`),
              
              h('button', { 
                  key: 'profile', 
                  className: 'post-context-menu-button',
                  onClick: doAction(onOpenProfile) 
              }, `👤 ${t('action_view_profile')}`)
            ]
      )
    )
  );
}

export default PostContextMenu;