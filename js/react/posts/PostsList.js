// react/posts/PostsList.js
// Компонент, отвечающий за рендеринг списка постов.

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { isIOS } from './posts_utils.js';
import PostCard from './PostCard.js';
import MyPostCard from './MyPostCard.js';

const h = React.createElement;

/**
 * Компонент PostsList
 * (Вынесен из react-posts-feed.js)
 */
function PostsList({
  posts,
  controlMode,
  onOpenProfile,
  onOpenPostSheet,
  onOpenContextMenu,
  onTagClick,
  isMyPosts,
  onEditPost,
  onDeletePost,
  containerRef,
  contextMenuPost,
  menuLayout,
}) {
  return h(
    motion.div,
    {
      ref: containerRef,
      // Делаем контейнер таким же, как в FeedList:
      // flex-колонка + gap 12px, без variants/initial/animate.
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      },
    },
    h(
      AnimatePresence,
      {
        mode: isIOS ? 'sync' : 'popLayout',
        initial: false,
      },
      posts.map((p, index) => {
        const key = p.post_id;
        const isContextMenuOpen = contextMenuPost?.post_id === p.post_id;

        if (isMyPosts) {
          // Мои посты (обёртка с long-press)
          return h(MyPostCard, {
            key,
            post: p,
            index,
            onOpenProfile,
            onOpenPostSheet,
            onOpenContextMenu,
            onEdit: onEditPost,
            onDelete: onDeletePost,
            isContextMenuOpen,
            menuLayout,
          });
        }

        // Общая лента запросов
        return h(PostCard, {
          key,
          post: p,
          index,
          onOpenProfile,
          onOpenPostSheet,
          onOpenContextMenu,
          onTagClick,
          isContextMenuOpen,
          menuLayout,
        });
      }),
    ),
  );
}

export default PostsList;