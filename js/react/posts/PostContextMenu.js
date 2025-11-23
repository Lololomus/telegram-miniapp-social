// react/posts/PostContextMenu.js
import React, { useState, useRef, useLayoutEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS } from './posts_utils.js';
import PostCard from './PostCard.js';

const h = React.createElement;

function PostContextMenu({ post, targetElement, onClose, onOpenProfile, onRespond, onRepost, onEdit, onDelete }) {
  const isMyPost = post.author?.user_id && String(post.author.user_id) === String(window.__CURRENT_USER_ID);
  
  const [layout, setLayout] = useState(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!targetElement) return;
    
    const rect = targetElement.getBoundingClientRect();
    const MENU_WIDTH = 250;
    const SCREEN_MARGIN = 16;
    
    let menuLeft = rect.left + (rect.width / 2) - (MENU_WIDTH / 2);
    if (menuLeft < SCREEN_MARGIN) menuLeft = SCREEN_MARGIN;
    if (menuLeft + MENU_WIDTH > window.innerWidth - SCREEN_MARGIN) {
        menuLeft = window.innerWidth - MENU_WIDTH - SCREEN_MARGIN;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const MENU_HEIGHT_ESTIMATE = 180;
    
    let menuTop;
    let verticalAdjust = 0;
    
    if (spaceBelow >= MENU_HEIGHT_ESTIMATE) {
        menuTop = rect.bottom + 12;
    } else {
        const overflow = (rect.bottom + 12 + MENU_HEIGHT_ESTIMATE) - window.innerHeight;
        if (overflow > 0) {
            verticalAdjust = -overflow - 20; 
        }
        menuTop = rect.bottom + 12;
    }

    setLayout({
        card: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        menu: { top: menuTop, left: menuLeft, width: MENU_WIDTH },
        verticalAdjust: verticalAdjust
    });

  }, [targetElement]);

  if (!layout) return null;

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    onClose();
  };
  
  const doAction = (actionFn) => (e) => {
    e.stopPropagation();
    if (actionFn) actionFn(post);
    onClose();
  };

  const containerVariants = {
      hidden: {},
      visible: {},
      exit: {}
  };

  const backdropVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  // ИЗМЕНЕНИЕ: Варианты для клона теперь включают и Y-сдвиг, и Scale.
  // Это гарантирует их идеальную синхронизацию.
  const cloneContainerVariants = {
      hidden: { y: 0, scale: 1, opacity: 1 }, 
      visible: { 
          y: layout.verticalAdjust, 
          scale: 1.02, // Scale переехал сюда из CSS PostCard
          opacity: 1,
          transition: { type: 'spring', stiffness: 300, damping: 30 }
      },
      exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  return h(motion.div, {
    key: `ctx-wrapper-${post.post_id}`,
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: containerVariants,
    // ИЗМЕНЕНИЕ: Убран inset: 0 для анимационного слоя, чтобы избежать багов рендеринга.
    // Слой теперь просто контейнер для позиционирования.
    style: { position: 'fixed', inset: 0, zIndex: 2000 }
  },
    h(motion.div, {
        className: 'post-context-menu-backdrop',
        variants: backdropVariants,
        onClick: handleBackdropClick,
        style: { position: 'absolute', inset: 0 } 
    }),

    // ИЗМЕНЕНИЕ: Убран общий враппер (который раньше анимировал 'y').
    // Теперь мы рендерим Карточку и Меню как независимые слои, применяя к ним анимации напрямую.

    // 1. Слой КЛОНА КАРТОЧКИ
    h(motion.div, {
        variants: cloneContainerVariants,
        style: {
            position: 'absolute',
            top: layout.card.top,
            left: layout.card.left,
            width: layout.card.width,
            zIndex: 2002, 
            pointerEvents: 'none',
            transformOrigin: 'center center' // Важно для красивого scale
        }
    },
        h(PostCard, {
            post: post,
            isHighlight: true,
            disableClick: true,
        })
    ),

    // 2. Слой МЕНЮ
    h(motion.div, {
        ref: menuRef,
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
        // Анимируем Y здесь отдельно, синхронно с карточкой
        initial: { opacity: 0, scale: 0.9, y: -10 },
        animate: { 
            opacity: 1, 
            scale: 1, 
            y: layout.verticalAdjust // Добавляем сдвиг
        },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
        transition: { type: 'spring', damping: 25, stiffness: 400 },
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