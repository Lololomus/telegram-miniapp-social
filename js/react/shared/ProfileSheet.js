// react/shared/ProfileSheet.js
// ОБНОВЛЕНО: Добавлена поддержка light theme через getThemeColors()

import React, { useState, useMemo, useRef, useEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { tg, isIOS, t, postJSON, useSheetLogic, SheetControls, getThemeColors, ProfilesManager } from '../shared/react_shared_utils.js';

const h = React.createElement;

// Конфигурация статусов
const STATUS_CONFIG = {
  networking: { icon: '🤝', colorClass: 'networking', label: 'status_networking' },
  open_to_work: { icon: '⚡', colorClass: 'open_to_work', label: 'status_open_to_work' },
  hiring: { icon: '💎', colorClass: 'hiring', label: 'status_hiring' },
  open_to_gigs: { icon: '🚀', colorClass: 'open_to_gigs', label: 'status_open_to_gigs' },
  busy: { icon: '⛔', colorClass: 'busy', label: 'status_busy' }
};

const getHeadline = (experience) => {
  if (!experience || experience.length === 0) return null;
  const latest = experience[0];
  if (latest.job_title && latest.company) return `${latest.job_title} @ ${latest.company}`;
  return latest.job_title || latest.company || '';
};

export function ProfileSheet({ user, onClose, }) {
  const isMyProfile = String(user.user_id) === String(window.__CURRENT_USER_ID);
  const { controlMode, dragControls, sheetProps } = useSheetLogic(onClose);
  const colors = getThemeColors(); // Получаем цвета темы

  // Локальный стейт статуса
  const [status, setStatus] = useState(user.status || 'networking');
  const [isStatusPickerOpen, setStatusPickerOpen] = useState(false);
  const [isStatusHintVisible, setStatusHintVisible] = useState(false);
  const statusHintTimeoutRef = useRef(null);

  const cachedProfile = ProfilesManager.get(user.user_id) || user;
  const [isFollowed, setIsFollowed] = useState(cachedProfile.is_followed_by_viewer || false);
  const [followersCount, setFollowersCount] = useState(cachedProfile.followers_count || 0);

  // Подписываемся на изменения из кэша
  useEffect(() => {
    const unsubscribe = ProfilesManager.subscribe((id, updated) => {
      if (id === String(user.user_id)) {
        setIsFollowed(updated.is_followed_by_viewer || false);
        setFollowersCount(updated.followers_count || 0);
      }
    });
    return unsubscribe;
  }, [user.user_id]);

  const avatar = user.photo_path
    ? `${window.__CONFIG?.backendUrl || location.origin}/${user.photo_path}`
    : 'https://t.me/i/userpic/320/null.jpg';

  const isLoading = typeof user.experience === 'undefined';

  const skills = useMemo(() => {
    try {
      return user.skills
        ? (typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills)
        : [];
    } catch {
      return [];
    }
  }, [user.skills]);

  const experience = useMemo(() => {
    try {
      return user.experience
        ? (typeof user.experience === 'string' ? JSON.parse(user.experience) : user.experience)
        : [];
    } catch {
      return [];
    }
  }, [user.experience]);

  const education = useMemo(() => {
    try {
      return user.education
        ? (typeof user.education === 'string' ? JSON.parse(user.education) : user.education)
        : [];
    } catch {
      return [];
    }
  }, [user.education]);

  const links = [user.link1, user.link2, user.link3, user.link4, user.link5].filter(Boolean);

  const headline =
    getHeadline(experience) ||
    (isLoading
      ? (t('profile_headline_loading') || 'Loading...')
      : (t('profile_headline_default') || 'Member'));

  const currentStatusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.networking;

  // --- Actions ---
  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setStatusPickerOpen(false);
    setStatusHintVisible(false);
    if (tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    try {
      await postJSON(`${window.__CONFIG.backendUrl}/api/set-status`, {
        initData: tg.initData,
        status: newStatus
      });
      if (window.state && window.state.currentUserProfile) {
        window.state.currentUserProfile.status = newStatus;
      }
    } catch (e) {
      console.error('Failed to save status', e);
    }
  };

  const handleShare = () => {
    const bot = window.__CONFIG?.botUsername;
    const app = window.__CONFIG?.appSlug;
    if (!bot || !app) return;
    const link = `https://t.me/${bot}/${app}?startapp=${user.user_id}`;
    const text = t('share_profile_text', { name: user.first_name });
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(url);
  };

  const handleReport = () => {
    if (tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred('success');
    }
    tg.showAlert(t('report_sent') || 'Жалоба отправлена');
  };

  const handleMessage = async () => {
    if (isMyProfile) {
      onClose();
      return;
    }
    try {
      const resp = await postJSON(
        `${window.__CONFIG.backendUrl}/get-telegram-user-info`,
        { initData: tg.initData, target_user_id: user.user_id }
      );
      if (resp.ok && resp.username) {
        tg.openTelegramLink(`https://t.me/${resp.username}`);
      } else {
        tg.showAlert(t('error_open_profile_username'));
      }
    } catch (e) {
      tg.showAlert(t('error_fetch_user_info'));
    }
  };

  const handleStatusBadgeClick = () => {
    if (isMyProfile) {
      setStatusPickerOpen(true);
      return;
    }
    setStatusHintVisible(true);
    if (statusHintTimeoutRef.current) {
      clearTimeout(statusHintTimeoutRef.current);
    }
    statusHintTimeoutRef.current = setTimeout(() => {
      setStatusHintVisible(false);
      statusHintTimeoutRef.current = null;
    }, 3500);
    if (tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  const handleFollow = async () => {
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }
    
    const wasFollowed = isFollowed;
    const delta = wasFollowed ? -1 : 1;
    
    setIsFollowed(!wasFollowed);
    setFollowersCount(prev => prev + delta);
    
    // Обновляем глобальный кэш
    ProfilesManager.updateFollowStatus(user.user_id, !wasFollowed, delta);
    
    try {
      const endpoint = wasFollowed ? '/unfollow' : '/follow';
      await postJSON(`${window.__CONFIG.backendUrl}${endpoint}`, {
        initData: tg.initData,
        target_user_id: user.user_id
      });
    } catch (e) {
      console.error('Follow failed:', e);
      // Откат при ошибке
      setIsFollowed(wasFollowed);
      setFollowersCount(prev => prev - delta);
      ProfilesManager.updateFollowStatus(user.user_id, wasFollowed, -delta);
    }
  };

  // --- Render ---
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
        exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }
      },
      // Backdrop
      h(
        motion.div,
        {
          onClick: onClose,
          style: {
            position: 'absolute',
            inset: 0,
            background: colors.overlayBg // Динамический цвет
          },
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0, transition: { duration: 0.2 } }
        }
      ),
      // Sheet
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
          exit: { y: '100%', transition: { type: 'tween', ease: 'easeInOut', duration: 0.2 } }
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
              overflow: 'hidden',
              paddingTop: controlMode === 'swipes' ? '25px' : '10px'
            },
            onClick: (e) => e.stopPropagation()
          },
          // 1. HEADER
          h(
            'div',
            { className: 'profile-header-row' },
            h(
              'div',
              { className: 'profile-avatar-squircle' },
              h('img', { src: avatar, alt: '' })
            ),
            h(
              'div',
              { className: 'profile-info-col' },
              h('div', { className: 'profile-name' }, user.first_name),
              h(
                'div',
                {
                  className: `profile-headline ${isLoading ? 'skeleton-text' : ''}`
                },
                headline
              ),
              h(
                'div',
                { className: 'profile-mini-stats' },
                `${followersCount} ${t('followers') || 'subs'} • ${
                  user.following_count || 0
                } ${t('following') || 'following'}`
              )
            ),
            h(
              'div',
              {
                className: `profile-status-badge ${currentStatusConfig.colorClass}`,
                onClick: handleStatusBadgeClick
              },
              h('span', { style: { fontSize: '22px' } }, currentStatusConfig.icon)
            )
          ),
          // 2. CONTENT
          h(
            'div',
            { className: 'post-sheet-scroll-area' },
            h(
              'div',
              { className: 'post-content-inset' },
              user.bio &&
                h(
                  'p',
                  { className: 'post-text-body', style: { marginBottom: 16 } },
                  user.bio
                ),
              (isLoading || skills.length > 0) &&
                h(
                  'div',
                  {
                    className: 'post-tags-cloud',
                    style: { marginBottom: 24, marginTop: 0 }
                  },
                  isLoading
                    ? [1, 2, 3].map((i) =>
                        h('div', { key: i, className: 'skill-tag skeleton-tag' })
                      )
                    : skills.map((s) =>
                        h('span', { key: s, className: 'skill-tag skill-tag--display' }, s)
                      )
                ),
              h('div', {
                className: 'content-divider',
                style: { margin: '10px 0 8px' },
              }),
              // Experience
              h(
                'div',
                {
                  className: 'profile-block',
                  style: { marginTop: 0, marginBottom: 10 },
                },
                h('h3', { className: 'content-title' }, t('experience', 'EXPERIENCE')),
                isLoading
                  ? h(SkeletonTimeline)
                  : experience.length > 0
                  ? experience.map((exp, i) =>
                      h(ExperienceCard, { key: i, item: exp, type: 'work' })
                    )
                  : h('div', { className: 'empty-section' }, t('profile_no_experience', 'No experience added'))
              ),
              // Education
              !isLoading && education.length > 0 && h(
                'div',
                {
                  className: 'profile-block',
                  style: {
                    marginTop: (Array.isArray(experience) && experience.length > 0) ? 2 : 6,
                    marginBottom: 4,
                  },
                },
                h('h3', { className: 'content-title' }, t('education', 'EDUCATION')),
                education.map((edu, i) =>
                  h(ExperienceCard, { key: i, item: edu, type: 'edu' })
                )
              ),
              links.length > 0 &&
                h(
                  'div',
                  { className: 'profile-links-grid' },
                  links.map((link, i) =>
                    h(
                      'a',
                      { key: i, href: link, target: '_blank', className: 'profile-link-chip' },
                      h('span', null, '🔗'),
                      link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                    )
                  )
                )
            )
          ),
            // 3. FOOTER
            h(
              'div',
              { className: `sheet-sticky-footer ${isIOS ? 'is-ios' : ''}` },
              !isMyProfile &&
              h(
                'button',
                { className: 'icon-action-btn destructive', onClick: handleReport },
                h(
                  'svg',
                  {
                    width: 24,
                    height: 24,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2
                  },
                  h('path', {
                    d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'
                  }),
                  h('line', { x1: 4, y1: 22, x2: 4, y2: 15 })
                )
              ),
              // НОВАЯ КНОПКА ПОДПИСКИ
              !isMyProfile &&
              h(
                'button',
                { 
                  className: `icon-action-btn follow-btn ${isFollowed ? 'is-followed' : ''}`, 
                  onClick: handleFollow 
                },
                h(
                  'svg',
                  {
                    width: 24,
                    height: 24,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2
                  },
                  isFollowed
                    ? [
                        h('path', { key: 1, d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
                        h('circle', { key: 2, cx: 8.5, cy: 7, r: 4 }),
                        h('polyline', { key: 3, points: '17 11 19 13 23 9' })
                      ]
                    : [
                        h('path', { key: 1, d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
                        h('circle', { key: 2, cx: 8.5, cy: 7, r: 4 }),
                        h('line', { key: 3, x1: 20, y1: 8, x2: 20, y2: 14 }),
                        h('line', { key: 4, x1: 17, y1: 11, x2: 23, y2: 11 })
                      ]
                )
              ),
              h(
                'button',
                { className: 'icon-action-btn', onClick: handleShare },
                h(
                  'svg',
                  {
                    width: 24,
                    height: 24,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2
                  },
                  h('circle', { cx: 18, cy: 5, r: 3 }),
                  h('circle', { cx: 6, cy: 12, r: 3 }),
                  h('circle', { cx: 18, cy: 19, r: 3 }),
                  h('line', { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }),
                  h('line', { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 })
                )
              ),
              h(
                'button',
                {
                  className: `main-action-btn ${isMyProfile ? 'secondary' : 'primary'}`,
                  onClick: handleMessage
                },
                isMyProfile
                  ? (t('action_close') || 'Закрыть')
                  : (t('action_message') || 'Message')
              )
            ),
          // 4. STATUS HINT OVERLAY
          !isMyProfile &&
            isStatusHintVisible &&
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
                h('span', { className: 'status-hint-label' }, currentStatusConfig.icon),
                h(
                  'span',
                  null,
                  t(`status_desc_${status}`) || t(currentStatusConfig.label) || ''
                )
              )
            )
        )
      ),
      // STATUS PICKER
      isMyProfile && isStatusPickerOpen &&
        h(StatusPicker, {
          currentStatus: status,
          onSelect: handleStatusChange,
          onClose: () => setStatusPickerOpen(false)
        })
    ),
    document.body
  );
}

// StatusPicker компонент
function StatusPicker({ currentStatus, onSelect, onClose }) {
  return h(
    motion.div,
    {
      className: 'status-picker-overlay',
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      onClick: onClose
    },
    h(
      motion.div,
      {
        className: 'status-picker-sheet',
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring', damping: 25, stiffness: 300 },
        onClick: (e) => e.stopPropagation()
      },
      h(
        'div',
        { className: 'status-drag-handle' }
      ),
      h(
        'div',
        { className: 'status-picker-title' },
        t('choose_status_title') || 'Your Status'
      ),
      h(
        'div',
        { className: 'status-grid' },
        Object.entries(STATUS_CONFIG).map(([key, conf]) =>
          h(
            'div',
            {
              key,
              className: `status-option ${conf.colorClass} ${
                currentStatus === key ? 'selected' : ''
              }`,
              onClick: () => onSelect(key)
            },
            h('div', { className: 'status-icon' }, conf.icon),
            h('div', { className: 'status-label' }, t(conf.label) || conf.label)
          )
        )
      )
    )
  );
}

// ExperienceCard компонент
function ExperienceCard({ item, type }) {
  const title = type === 'work' ? item.job_title : item.institution;
  const subtitle = type === 'work' ? item.company : item.degree;
  const date = [
    item.start_date,
    (item.is_current || !item.end_date) ? (t('present') || 'Present') : item.end_date
  ].filter(Boolean).join(' — ');

  const icon =
    type === 'work'
      ? h(
          'svg',
          { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
          h('rect', { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }),
          h('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' })
        )
      : h(
          'svg',
          { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
          h('path', { d: 'M22 10v6M2 10l10-5 10 5-10 5z' }),
          h('path', { d: 'M6 12v5c3 3 9 3 12 0v-5' })
        );

  return h(
    'div',
    { className: 'experience-card' },
    h('div', { className: 'exp-icon-box' }, icon),
    h(
      'div',
      { className: 'exp-info' },
      h('div', { className: 'exp-title' }, title),
      subtitle && h('div', { className: 'exp-subtitle' }, subtitle),
      h('div', { className: 'exp-date' }, date),
      item.description && h('div', { className: 'exp-desc' }, item.description)
    )
  );
}

// SkeletonTimeline компонент
function SkeletonTimeline() {
  return h(
    'div',
    { className: 'skeleton-timeline-container' },
    [1, 2].map((i) =>
      h(
        'div',
        { key: i, className: 'experience-card skeleton' },
        h('div', { className: 'exp-icon-box skeleton-box' }),
        h(
          'div',
          { className: 'exp-info' },
          h('div', {
            className: 'skeleton-line',
            style: { width: '60%', marginBottom: 8 }
          }),
          h('div', {
            className: 'skeleton-line',
            style: { width: '40%' }
          })
        )
      )
    )
  );
}

export default ProfileSheet;