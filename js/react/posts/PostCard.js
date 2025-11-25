// react/posts/PostCard.js
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

const h = React.createElement;

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
  const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
  const { content = 'Нет описания', post_type = 'default', skill_tags = [], created_at } = post;
  const avatar = author.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
  
  const type_map = { looking: { text: t('post_type_looking'), color: '#0A84FF' }, offering: { text: t('post_type_offering'), color: '#34C759' }, showcase: { text: t('post_type_showcase'), color: '#FF9500' } };
  const type_info = type_map[post_type] || { text: t('post_type_default'), color: '#8E8E93' };
  
  const timeAgo = formatPostTime(created_at);
  const postKey = post.post_id || `temp-post-${Math.random()}`;

  // --- ✅ ПРИМЕНЯЕМ DRY ХУК ---
  const { targetRef, gestureProps } = useCardGestures({
      // Главный клик (по телу): Открыть шторку поста
      onOpenPrimary: () => onOpenPostSheet(post),
      
      // Вторичный клик (по аватару): Открыть профиль
      onOpenSecondary: () => onOpenProfile(author),
      
      // Лонг-тап: Открыть меню (передаем элемент для привязки координат)
      onOpenContextMenu: (el) => onOpenContextMenu(post, el),
      
      disableClick: disableClick || isContextMenuOpen
  });

  // --- Стили и Анимации (без изменений логики) ---
  const layoutMode = (disableClick || isHighlight) ? undefined : (isMobile ? false : 'position');
  
  // Стили для клона (когда isHighlight = true)
  const cloneStyles = isHighlight ? {
      // Яркая тень для эффекта "полета"
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)', 
      
      // Убираем стандартные транзишны, так как анимацией управляет PostContextMenu
      transition: 'none',
      
      // Убеждаемся, что клон перекрывает всё
      zIndex: 10,
      
      // Фон должен быть непрозрачным (берем цвет из темы)
      backgroundColor: 'var(--secondary-bg-color)', 
      
      // Выключаем блюр внутри самой карточки (если он был), чтобы не размывать контент дважды
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      
      // Граница ярче
      borderColor: 'rgba(255,255,255,0.2)'
  } : {
      // Обычное состояние
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
      ref: targetRef, // ✅ Привязываем реф хука
      ...gestureProps, // ✅ Пробрасываем события хука
      
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
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
        
        // --- КНОПКА АВАТАРА ---
        h(
          'button',
          {
            'data-action': 'secondary', // ✅ ВАЖНО: Метка для хука
            style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 },
          },
          h(
            'div',
            { style: { height: 44, width: 44, borderRadius: '50%', background: 'var(--secondary-bg-color)', overflow: 'hidden' } },
            h('img', { 
                src: avatar, 
                alt: '', 
                decoding: 'async', 
                draggable: 'false',
                style: { width: '100%', height: '100%', objectFit: 'cover' } 
            })
          ),
        ),
        
        // --- КНОПКА ИМЕНИ ---
        h(
          'div',
          { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, marginRight: '5px' } },
          h(
            'button',
            {
              'data-action': 'secondary', // ✅ ВАЖНО: Метка для хука
              style: { padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' },
            },
            h(
              'div',
              { style: { fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, #000)' } },
              author.first_name || 'User',
            ),
          ),
          timeAgo && h('div', { style: { fontSize: 14, color: 'var(--main-hint-color, #999)' } }, timeAgo),
        ),
        
        // Бейдж типа
        h(
          'div',
          { style: { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: type_info.color, color: '#FFFFFF', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' } },
          type_info.text,
        ),
        showActionsSpacer && h('div', { style: { width: '40px', flexShrink: 0 } }),
      ),
      
      h('p', { className: 'post-content-clamped' }, content),
      
      skill_tags && skill_tags.length > 0 && h(
          'div',
          { className: 'feed-card-skills-container' },
          skill_tags.map((skill, i) => 
              h('span', { key: i, className: 'skill-tag skill-tag--display', style: { cursor: 'default' } }, skill)
          )
      )
    ),
  );
});

export default PostCard;