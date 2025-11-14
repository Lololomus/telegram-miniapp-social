// react/posts/PostsList.js
// Компонент, отвечающий за рендеринг списка постов.

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { listVariants, isIOS } from './utils.js';
import PostCard from './PostCard.js';
import MyPostCard from './MyPostCard.js';

const h = React.createElement;

/**
 * Компонент PostsList
 * (Вынесен из react-posts-feed.js)
 */
function PostsList({ posts, onOpenProfile, onOpenPostSheet, onOpenContextMenu, onTagClick, isMyPosts, onEditPost, onDeletePost, containerRef, contextMenuPost, menuLayout }) {
  
  return h(motion.div, {
    ref: containerRef,
    variants: listVariants,
    initial: "hidden",
    animate: "visible",
    // Стили из feed.css .feed-list (gap: 12px) 
    // будут применены к этому div, когда мы удалим #posts-list
    // (пока оставляем так)
    style: { 
        position: 'relative'
    }
  },
    h(AnimatePresence, {
      initial: false,
      mode: isIOS ? "sync" : "popLayout"
    },
      posts.map((p, index) => {
        const key = p.post_id;
        // Определяем, активна ли эта карточка
        const isContextMenuOpen = contextMenuPost?.post_id === p.post_id;
        
        if (isMyPosts) {
          // Рендерим MyPostCard (обертка с long-press)
          return h(MyPostCard, {
            key: key,
            post: p,
            index: index,
            onOpenProfile: onOpenProfile,
            onOpenPostSheet: onOpenPostSheet,
            onOpenContextMenu: onOpenContextMenu,
            onEdit: onEditPost,
            onDelete: onDeletePost,
            isContextMenuOpen: isContextMenuOpen,
            menuLayout: menuLayout
          });
        } else {
          // Рендерим обычную PostCard (для общей ленты)
          return h(PostCard, {
            key: key,
            post: p,
            index: index,
            onOpenProfile: onOpenProfile,
            onOpenPostSheet: onOpenPostSheet,
            onOpenContextMenu: onOpenContextMenu,
            onTagClick: onTagClick,
            isContextMenuOpen: isContextMenuOpen,
            menuLayout: menuLayout
          });
        }
      })
    )
  );
}

export default PostsList;