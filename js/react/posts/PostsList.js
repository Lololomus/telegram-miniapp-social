// react/posts/PostsList.js
import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { isIOS } from './posts_utils.js';
import PostCard from './PostCard.js';
import MyPostCard from './MyPostCard.js';

const h = React.createElement;

function PostsList({
  posts,
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

        return h(PostCard, {
          key,
          post: p,
          index, // Индекс передаем честно для волны
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