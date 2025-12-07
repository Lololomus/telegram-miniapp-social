// react/posts/PostDetailSheet.js
// v3.5: Report Button + Text Rendering Fixes + i18n meta

import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

import { t, formatPostTime, isIOS, useSheetLogic, SheetControls, tg } from './posts_utils.js';

const h = React.createElement;

const getPostTypeConfig = (type) => {
  switch (type) {
    case 'looking':
      return {
        color: '#0A84FF',
        label: t('post_type_looking') || 'Looking for',
        icon: h(
          'svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            style: { width: 20, height: 20 },
          },
          h('circle', { cx: 11, cy: 11, r: 8 }),
          h('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }),
        ),
      };
    case 'offering':
      return {
        color: '#34C759',
        label: t('post_type_offering') || 'Offering',
        icon: h(
          'svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            style: { width: 20, height: 20 },
          },
          h('rect', { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }),
          h('path', {
            d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
          }),
        ),
      };
    case 'showcase':
      return {
        color: '#FF9500',
        label: t('post_type_showcase') || 'Showcase',
        icon: h(
          'svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            style: { width: 20, height: 20 },
          },
          h('polygon', {
            points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2',
          }),
        ),
      };
    default:
      return {
        color: '#8E8E93',
        label: t('post_type_default') || 'Post',
        icon: null,
      };
  }
};

const getExperienceLabel = (expValue) => {
  if (!expValue) return null;

  const map = {
  no_exp: 'exp_no_exp',
  less_1: 'exp_less_1',
  '1-3':  'exp_1_3',
  '3-5':  'exp_3_5',
  '5+':   'exp_5_plus'
};

  const key = map[expValue];
  return key ? (t(key) || expValue) : expValue;
};

function PostDetailSheet({
  post,
  onClose,
  onOpenProfile,
  isMyPost,
  onEdit,
  onDelete,
  onRespond,
  onRepost,
}) {
  const { controlMode, dragControls, sheetProps } = useSheetLogic(onClose);
  
  // 🔥 НОВОЕ: State для hint overlay
  const [isTypeHintVisible, setTypeHintVisible] = React.useState(false);
  const typeHintTimeoutRef = React.useRef(null);
  
  const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };

  const currentUserId =
    window.__CURRENT_USER_ID ?? window.CURRENT_USER_ID ?? window.CURRENTUSERID;
  const authorId = String(author.user_id ?? author.userid ?? '');
  const isOwnPost =
    currentUserId != null && authorId &&
    String(currentUserId) === authorId
      ? true
      : !!isMyPost;

  const {
    content,
    full_description,
    post_type = 'default',
    skill_tags = [],
    created_at,
    experience_years,
  } = post;

  const avatar = author.photo_path
    ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}`
    : 'https://t.me/i/userpic/320/null.jpg';

  const typeConfig = getPostTypeConfig(post_type);
  const timeAgo = formatPostTime(created_at);
  const mainRole =
    skill_tags.length > 0
      ? skill_tags[0]
      : (t('specialist') || 'Specialist');
  const expLabel = getExperienceLabel(experience_years);
  const subtitleParts = [mainRole];
  if (expLabel) subtitleParts.push(expLabel);
  const subtitleText = subtitleParts.join(' • ');

  // 🔥 НОВОЕ: Обработчик клика на бейдж
  const handleTypeBadgeClick = () => {
    setTypeHintVisible(true);
    
    if (typeHintTimeoutRef.current) {
      clearTimeout(typeHintTimeoutRef.current);
    }
    
    typeHintTimeoutRef.current = setTimeout(() => {
      setTypeHintVisible(false);
      typeHintTimeoutRef.current = null;
    }, 3500);
    
    if (tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  const handleReport = () => {
    if (tg?.HapticFeedback?.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred('success');
    }
    tg.showAlert(t('report_sent') || 'Жалоба отправлена');
  };

  // Для своих постов: только репост и закрыть
  const footerMyPost = [
    h(
      'button',
      {
        key: 'share',
        className: 'icon-action-btn',
        onClick: () => onRepost(post),
      },
      h(
        'svg',
        {
          width: 24,
          height: 24,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        h('circle', { cx: 18, cy: 5, r: 3 }),
        h('circle', { cx: 6, cy: 12, r: 3 }),
        h('circle', { cx: 18, cy: 19, r: 3 }),
        h('line', { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }),
        h('line', { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 }),
      ),
    ),
    h(
      'button',
      {
        key: 'respond',
        className: 'main-action-btn',
        onClick: onClose, // вместо onRespond(post)
      },
      t('action_close') || 'Закрыть',
    ),
  ];

  const footerForeignPost = [
  // 1) Репорт
  h(
    'button',
    {
      key: 'report',
      className: 'icon-action-btn destructive',
      onClick: handleReport,
    },
    h(
      'svg',
      {
        width: 24,
        height: 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      h('path', {
        d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
      }),
      h('line', { x1: 4, y1: 22, x2: 4, y2: 15 }),
    ),
  ),

  // 2) Профиль автора
  h(
    'button',
    {
      key: 'profile',
      className: 'icon-action-btn',
      onClick: () => onOpenProfile && onOpenProfile(author),
    },
    h(
      'svg',
      {
        width: 24,
        height: 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      // Иконка пользователя: туловище + голова
      h('path', {
        d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
      }),
      h('circle', { cx: 12, cy: 7, r: 4 }),
    ),
  ),

  // 3) Репост (сейчас — репост запроса)
  h(
    'button',
    {
      key: 'share',
      className: 'icon-action-btn',
      onClick: () => onRepost(post),
    },
    h(
      'svg',
      {
        width: 24,
        height: 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      h('circle', { cx: 18, cy: 5, r: 3 }),
      h('circle', { cx: 6, cy: 12, r: 3 }),
      h('circle', { cx: 18, cy: 19, r: 3 }),
      h('line', { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }),
      h('line', { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 }),
    ),
  ),

  // 4) Откликнуться
  h(
    'button',
    {
      key: 'respond',
      className: 'main-action-btn',
      onClick: () => onRespond(post),
    },
    t('action_respond') || 'Respond',
  ),
];

  return createPortal(
    h(
      motion.div,
      {
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 5000,
          display: 'flex',
          alignItems: 'flex-end'
        },
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: {
          opacity: 0,
          pointerEvents: 'none',
          transition: { duration: 0.2 }
        }
      },

      h(
        motion.div,
        {
          onClick: onClose,
          style: {
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,.7)'
          },
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0, transition: { duration: 0.2 } }
        }
      ),

      h(
        motion.div,
        {
          style: {
            position: 'relative',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto'
          },
          ...sheetProps,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
          exit: {
            y: '100%',
            transition: { type: 'tween', ease: 'easeInOut', duration: 0.2 }
          }
        },

        h(SheetControls, { controlMode, dragControls, onClose }),

        h(
          'div',
          {
            className: `react-sheet-content post-sheet-unified ${isIOS ? 'is-ios' : ''}`,
            style: {
              position: 'relative',
              width: '100%',
              maxHeight: '85vh',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: controlMode === 'swipes' ? '25px' : '10px'
            },
            onClick: (e) => e.stopPropagation()
          },

          h(
            'div',
            {
              className: 'post-watermark',
              style: { color: typeConfig.color }
            },
            typeConfig.icon
          ),

          // HEADER
          h(
            'div',
            { className: 'post-sheet-header' },
            h(
              'div',
              { className: 'header-left' },
              h(
                'div',
                { className: 'header-avatar' },
                h('img', { src: avatar, alt: '' })
              ),
              h(
                'div',
                { className: 'header-info' },
                h('div', { className: 'header-name' }, author.first_name),
                h('div', { className: 'header-subtitle' }, subtitleText)
              )
            ),
            h(
              'div',
              {
                className: 'header-badge',
                style: {
                  color: typeConfig.color,
                  borderColor: typeConfig.color,
                  backgroundColor: `${typeConfig.color}1A`,
                  cursor: 'pointer'
                },
                onClick: handleTypeBadgeClick
              },
              typeConfig.icon
            )
          ),

          // CONTENT
          h(
            'div',
            { className: 'post-sheet-scroll-area' },
            h(
              'div',
              { className: 'post-content-inset' },

              h(
                'h2',
                {
                  className: 'post-text-title',
                  style: { transform: 'translateZ(0)' }
                },
                content
              ),

              full_description &&
                h(
                  'div',
                  {
                    className: 'post-text-body',
                    style: { transform: 'translateZ(0)' }
                  },
                  full_description
                ),

              skill_tags.length > 0 &&
                h(
                  'div',
                  { className: 'post-tags-cloud bottom' },
                  skill_tags.map((tag) =>
                    h(
                      'span',
                      {
                        key: tag,
                        className: 'skill-tag skill-tag--display'
                      },
                      tag
                    )
                  )
                ),

              h('div', { className: 'content-divider' }),

              h(
                'div',
                { className: 'post-meta-row' },
                h(
                  'div',
                  { className: 'meta-item' },
                  h(
                    'span',
                    null,
                    '📍 ',
                    t('post_meta_remote') || 'Remote'
                  )
                ),
                h(
                  'div',
                  { className: 'meta-item budget' },
                  h(
                    'span',
                    null,
                    '💰 ',
                    t('post_meta_negotiable') || 'Negotiable'
                  )
                ),
                h(
                  'div',
                  { className: 'meta-item date' },
                  h(
                    'svg',
                    {
                      viewBox: '0 0 24 24',
                      width: 14,
                      height: 14,
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: 2
                    },
                    h('circle', { cx: 12, cy: 12, r: 10 }),
                    h('polyline', { points: '12 6 12 12 16 14' })
                  ),
                  h('span', null, timeAgo)
                )
              )
            )
          ),

          // FOOTER
          h(
            'div',
            { className: `sheet-sticky-footer ${isIOS ? 'is-ios' : ''}` },
            ...(isOwnPost ? footerMyPost : footerForeignPost)
          ),
          isTypeHintVisible &&
            h(
              motion.div,
              {
                className: 'status-hint-overlay',
                initial: { opacity: 0, y: -8, scale: 0.97 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: -8, scale: 0.97 },
                transition: { duration: 0.2 }
              },
              h(
                'div',
                { className: 'status-hint-bubble' },
                h('span', { 
                  className: 'status-hint-label',
                  style: { fontSize: '18px' } 
                }, typeConfig.icon),
                h(
                  'span',
                  null,
                  t(`post_type_desc_${post_type}`) || typeConfig.label
                )
              )
            )
        )
      )
    ),
    document.body
  );
}

export default PostDetailSheet;