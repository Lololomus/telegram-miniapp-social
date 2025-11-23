// react/posts/PostsList.js
import React, { useState, useEffect, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { isMobile } from './posts_utils.js';
import PostCard from './PostCard.js';
import MyPostCard from './MyPostCard.js';

const h = React.createElement;

const BATCH_SIZE = 10; 

function PostsList({
  posts,
  // filterSignature, // Больше не нужен, так как мы используем key в родителе
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
  
  // При создании компонента (смене ключа) стейт всегда равен BATCH_SIZE.
  // Нам не нужно сбрасывать его эффектом.
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  // ❌ УДАЛЕНО: useLayoutEffect. 
  // Это устраняет двойное моргание. Родитель (App) уже пересоздал этот компонент,
  // поэтому visibleCount и так сброшен.

  useEffect(() => {
    if (visibleCount >= posts.length) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setVisibleCount(prev => prev + BATCH_SIZE);
        }
    }, {
        root: null, 
        rootMargin: '200px', // Запас для плавности
        threshold: 0.1
    });

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
        if (sentinel) observer.unobserve(sentinel);
    };
  }, [visibleCount, posts.length]);

  const visiblePosts = posts.slice(0, visibleCount);

  return h(
    motion.div,
    {
      ref: containerRef,
      // Контейнер статичный, просто держит структуру
      layout: false,
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '100px' 
      },
    },
    // Внутри просто рендерим карточки. 
    // Анимация входа сработает, потому что компонент новый.
    visiblePosts.map((p, index) => {
        const key = p.post_id;
        const isContextMenuOpen = contextMenuPost?.post_id === p.post_id;
        
        // Передаем РЕАЛЬНЫЙ индекс, а внутри PostCard обрежем его через %
        // или используем для уникальной задержки
        const animationIndex = index % BATCH_SIZE;

        const commonProps = {
            key, 
            post: p,
            index: animationIndex, // Передаем обрезанный индекс для волны
            onOpenProfile,
            onOpenPostSheet,
            onOpenContextMenu,
            isContextMenuOpen,
            menuLayout,
        };

        if (isMyPosts) {
          return h(MyPostCard, {
            ...commonProps,
            onEdit: onEditPost,
            onDelete: onDeletePost,
          });
        }

        return h(PostCard, {
          ...commonProps,
          onTagClick,
        });
    }),
    
    visibleCount < posts.length && h('div', {
        ref: sentinelRef,
        style: { height: '20px', width: '100%', opacity: 0, pointerEvents: 'none' } 
    })
  );
}

export default PostsList;