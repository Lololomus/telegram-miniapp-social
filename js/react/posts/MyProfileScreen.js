// react/posts/MyProfileScreen.js
// ОБНОВЛЕНО: Добавлена поддержка light theme через getThemeColors()

import React, { useState, useEffect, useMemo, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, postJSON, tg, isIOS, PhoneShell } from './posts_utils.js';
import { getThemeColors } from '../shared/react_shared_utils.js';
import PostCard from './PostCard.js';
import PostDetailSheet from './PostDetailSheet.js';

const h = React.createElement;

// Конфиг статусов
const STATUS_CONFIG = {
  'networking': { icon: '🤝', colorClass: 'networking', label: 'status_networking' },
  'open_to_work': { icon: '⚡', colorClass: 'open_to_work', label: 'status_open_to_work' },
  'hiring': { icon: '💎', colorClass: 'hiring', label: 'status_hiring' },
  'open_to_gigs': { icon: '🚀', colorClass: 'open_to_gigs', label: 'status_open_to_gigs' },
  'busy': { icon: '⛔', colorClass: 'busy', label: 'status_busy' }
};

function normalizeProfile(raw) {
  if (!raw) return null;
  const profile = { ...raw };
  profile.user_id = profile.user_id ?? profile.userid;
  profile.first_name = profile.first_name ?? profile.firstname ?? 'User';
  profile.photo_path = profile.photo_path ?? profile.photopath;
  profile.followers_count = profile.followers_count ?? profile.followerscount ?? 0;
  profile.following_count = profile.following_count ?? profile.followingcount ?? 0;
  profile.status = profile.status ?? 'networking';
  return profile;
}

function MyProfileAppRoot() {
  const [user, setUser] = useState(() => {
    const current = window.state?.currentUserProfile;
    return current ? normalizeProfile(current) : null;
  });

  useEffect(() => {
    const handler = (e) => {
      const profile = e?.detail?.profile || window.state?.currentUserProfile;
      if (profile) {
        setUser(normalizeProfile(profile));
      }
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  if (!user) {
    return h('div', { className: 'dashboard-loading' }, t('profile_headline_loading') || 'Loading profile...');
  }

  const handleEditProfile = () => {
    document.dispatchEvent(new CustomEvent('open-edit-profile-form'));
  };

  const handleShowQr = () => {
    document.dispatchEvent(new CustomEvent('open-profile-qr'));
  };

  const handleOpenPostSheet = (post) => {
    try {
      const tabHub = document.getElementById('tab-hub');
      if (tabHub) {
        tabHub.click();
      }
      document.dispatchEvent(
        new CustomEvent('open-deep-link-post', { detail: { post } })
      );
    } catch (e) {
      console.error('Failed to open post sheet from profile', e);
    }
  };

  return h(MyProfileScreen, {
    user,
    onEditProfile: handleEditProfile,
    onShowQr: handleShowQr,
    onOpenPostSheet: handleOpenPostSheet,
  });
}

export default function MyProfileScreen({ user, onEditProfile, onOpenPostSheet, onShowQr }) {
  const [themeKey, setThemeKey] = useState(0);
  const colors = getThemeColors();
  const [activeTab, setActiveTab] = useState('about');
  const [myPosts, setMyPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [status, setStatus] = useState(user.status || 'networking');
  const [isStatusPickerOpen, setStatusPickerOpen] = useState(false);
  const [postToShow, setPostToShow] = useState(null);
  const [langTick, setLangTick] = useState(0);

  useEffect(() => {
    const handler = () => setLangTick((x) => x + 1);
    document.addEventListener('lang-changed', handler);
    return () => document.removeEventListener('lang-changed', handler);
  }, []);

  useEffect(() => {
    const handler = () => setThemeKey(x => x + 1);
    document.addEventListener('theme-changed', handler);
    return () => document.removeEventListener('theme-changed', handler);
  }, []);

  const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG['networking'];

  const avatar = user.photo_path
    ? `${window.__CONFIG?.backendUrl || location.origin}/${user.photo_path}`
    : 'https://t.me/i/userpic/320/null.jpg';

  useEffect(() => {
    if (activeTab !== 'posts') return;
    setIsLoadingPosts(true);
    postJSON(`${window.__CONFIG.backendUrl}/api/get-my-posts`, { initData: tg.initData })
      .then((res) => {
        if (res?.ok) setMyPosts(res.posts || []);
        else setMyPosts([]);
      })
      .finally(() => setIsLoadingPosts(false));
  }, [activeTab]);

  useEffect(() => {
    const onPostSaved = () => {
      if (activeTab !== 'posts') return;
      setIsLoadingPosts(true);
      postJSON(`${window.__CONFIG.backendUrl}/api/get-my-posts`, { initData: tg.initData })
        .then((res) => {
          if (res?.ok) setMyPosts(res.posts || []);
        })
        .finally(() => setIsLoadingPosts(false));
    };
    document.addEventListener('post-saved', onPostSaved);
    return () => {
      document.removeEventListener('post-saved', onPostSaved);
    };
  }, [activeTab]);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setStatusPickerOpen(false);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    try {
      await postJSON(`${window.__CONFIG.backendUrl}/api/set-status`, {
        initData: tg.initData,
        status: newStatus,
      });
      if (window.state?.currentUserProfile) {
        window.state.currentUserProfile.status = newStatus;
      }
    } catch (e) {}
  };

  const handleShare = () => {
    const bot = window.__CONFIG?.botUsername;
    const app = window.__CONFIG?.appSlug;
    if (!bot || !app) return;
    const link = `https://t.me/${bot}/${app}?startapp=${user.user_id}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}`;
    tg.openTelegramLink(url);
  };

  const handleMyPostDelete = useCallback(
    async (post) => {
      const doDelete = async () => {
        try {
          const resp = await postJSON(`${window.__CONFIG.backendUrl}/api/delete-post`, {
            initData: tg.initData,
            post_id: post.post_id,
          });
          if (resp?.ok) {
            setMyPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
            if (typeof setPostToShow === 'function') {
              setPostToShow(null);
            }
            if (tg.HapticFeedback?.notificationOccurred) {
              tg.HapticFeedback.notificationOccurred('success');
            }
            if (window.UI && typeof window.UI.showToast === 'function') {
              window.UI.showToast(
                t('post_deleted_success') || 'Ваш запрос удалён',
                false
              );
            }
          } else {
            if (tg.showAlert) {
              tg.showAlert(t('error_delete_post') || 'Не удалось удалить запрос');
            }
          }
        } catch (e) {
          if (tg.showAlert) {
            tg.showAlert(t('error_delete_post') || 'Не удалось удалить запрос');
          }
        }
      };
      if (tg.showConfirm) {
        tg.showConfirm(t('confirm_delete') || 'Удалить запрос?', (ok) => {
          if (ok) doDelete();
        });
      } else if (window.confirm?.('Удалить запрос?')) {
        doDelete();
      }
    },
    []
  );

  const handleMyPostEdit = useCallback((post) => {
    document.dispatchEvent(
      new CustomEvent('open-edit-post-from-profile', { detail: { post } })
    );
  }, []);

  return h(
    'div',
    { className: 'dashboard-container' },
    // 1. NAVBAR
    h(
      'div',
      { className: 'dashboard-navbar' },
      h('div', { className: 'dashboard-title', style: { color: colors.text } }, t('your_profile_title') || 'My Profile')
    ),
    // 2. HERO SECTION
    h(
      'div',
      { className: 'dashboard-hero' },
      h(
        'button',
        {
          className: 'hero-icon-btn hero-icon-left',
          onClick: onShowQr,
          style: { width: 52, height: 52 },
        },
        h(
          'svg',
          {
            width: 28,
            height: 28,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          h('rect', { x: 3, y: 3, width: 7, height: 7 }),
          h('rect', { x: 14, y: 3, width: 7, height: 7 }),
          h('rect', { x: 14, y: 14, width: 7, height: 7 }),
          h('path', { d: 'M3 21h7v-7H3v7zM10 3h4v14h-4z' })
        )
      ),
      h(
        'button',
        {
          className: 'hero-icon-btn hero-icon-right',
          onClick: handleShare,
          style: { width: 52, height: 52 },
        },
        h(
          'svg',
          {
            width: 28,
            height: 28,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          h('path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }),
          h('polyline', { points: '16 6 12 2 8 6' }),
          h('line', { x1: 12, y1: 2, x2: 12, y2: 15 })
        )
      ),
      h('div', { className: 'hero-avatar' }, h('img', { src: avatar })),
      h('div', { className: 'hero-name', style: { color: colors.text } }, user.first_name),
      h(
        'div',
        {
          className: `hero-status-pill ${statusConf.colorClass}`,
          onClick: () => setStatusPickerOpen(true),
        },
        h('span', { className: 'status-icon' }, statusConf.icon),
        h('span', { className: 'status-text' }, t(statusConf.label)),
        h('span', { className: 'status-arrow' }, '▼')
      ),
      h(
        'div',
        { className: 'hero-stats' },
        h(
          'div',
          { className: 'stat-box' },
          h('b', { style: { color: colors.text } }, user.followers_count || 0),
          h('span', { style: { color: colors.hint } }, t('followers') || 'subs')
        ),
        h('div', { className: 'stat-divider' }),
        h(
          'div',
          { className: 'stat-box' },
          h('b', { style: { color: colors.text } }, user.following_count || 0),
          h('span', { style: { color: colors.hint } }, t('following') || 'following')
        )
      ),
      h(
        'button',
        { className: 'dashboard-edit-btn', onClick: onEditProfile },
        t('edit_profile') || 'Edit Profile'
      )
    ),
    // 3. TABS
    h(
      'div',
      { className: 'dashboard-tabs-wrapper' },
      h(
        'div',
        { className: 'segmented-control' },
        h(
          'button',
          {
            className: `segment-btn ${activeTab === 'about' ? 'active' : ''}`,
            onClick: () => setActiveTab('about'),
          },
          t('about_me') || 'About Me'
        ),
        h(
          'button',
          {
            className: `segment-btn ${activeTab === 'posts' ? 'active' : ''}`,
            onClick: () => setActiveTab('posts'),
          },
          t('my_requests') || 'My Requests'
        )
      )
    ),
    // 4. CONTENT AREA
    h(
      'div',
      { className: 'dashboard-content' },
      activeTab === 'about'
        ? h(ResumeView, { user })
        : isLoadingPosts
        ? h('div', { className: 'loader-placeholder', style: { color: colors.hint } }, 'Loading...')
        : myPosts.length > 0
        ? h(
            'div',
            { className: 'dashboard-posts-list' },
            myPosts.map((p) =>
              h(
                'div',
                { key: p.post_id, className: 'my-post-row' },
                h(
                  'div',
                  { className: 'my-post-card-wrapper' },
                  h(PostCard, {
                    post: p,
                    index: 0,
                    onOpenPostSheet: () => setPostToShow(p),
                    onOpenProfile: null,
                    onOpenContextMenu: () => {},
                    disableClick: false,
                    showActionsSpacer: false,
                    isContextMenuOpen: false,
                    isHighlight: false,
                  })
                ),
                h(
                  'div',
                  { className: 'my-post-actions' },
                  h(
                    'button',
                    {
                      className: 'my-post-icon-btn edit',
                      onClick: () => handleMyPostEdit(p),
                    },
                    h(
                      'svg',
                      {
                        width: 20,
                        height: 20,
                        viewBox: '0 0 24 24',
                        fill: 'none',
                        stroke: 'currentColor',
                        strokeWidth: 2,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                      },
                      h('path', { d: 'M12 20h9' }),
                      h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z' })
                    )
                  ),
                  h(
                    'button',
                    {
                      className: 'my-post-icon-btn destructive',
                      onClick: () => handleMyPostDelete(p),
                    },
                    h(
                      'svg',
                      {
                        width: 20,
                        height: 20,
                        viewBox: '0 0 24 24',
                        fill: 'none',
                        stroke: 'currentColor',
                        strokeWidth: 2,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                      },
                      h('polyline', { points: '3 6 5 6 21 6' }),
                      h('path', { d: 'M19 6l-1 14H6L5 6' }),
                      h('path', { d: 'M10 11v6' }),
                      h('path', { d: 'M14 11v6' }),
                      h('path', { d: 'M9 6V4h6v2' })
                    )
                  )
                )
              )
            )
          )
        : h(
            'div',
            { className: 'empty-state-dashboard' },
            h('span', { style: { fontSize: 40 } }, '📭'),
            h('p', { style: { color: colors.hint } }, 'Нет активных запросов')
          )
    ),
    // STATUS PICKER MODAL
    h(
      AnimatePresence,
      null,
      isStatusPickerOpen &&
        h(StatusPicker, {
          currentStatus: status,
          onSelect: handleStatusChange,
          onClose: () => setStatusPickerOpen(false),
        })
    ),
    // Локальная шторка
    postToShow &&
      h(PostDetailSheet, {
        post: postToShow,
        onClose: () => setPostToShow(null),
        onOpenProfile: null,
        isMyPost: true,
        onEdit: handleMyPostEdit,
        onDelete: handleMyPostDelete,
        onRespond: () => {},
        onRepost: (post) => {
          document.dispatchEvent(
            new CustomEvent('repost-post', { detail: { post } })
          );
        },
      })
  );
}

function ResumeView({ user }) {
  const colors = getThemeColors();

  const skills = useMemo(() => {
    try {
      if (!user.skills) return [];
      const parsed = typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user.skills]);

  const experience = useMemo(() => {
    try {
      if (!user.experience) return [];
      const parsed =
        typeof user.experience === 'string' ? JSON.parse(user.experience) : user.experience;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user.experience]);

  const education = useMemo(() => {
    try {
      if (!user.education) return [];
      const parsed =
        typeof user.education === 'string' ? JSON.parse(user.education) : user.education;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user.education]);

  return h(
    'div',
    { className: 'resume-view' },
    user.bio && h(
      'div',
      { className: 'resume-block' },
      h('h4', { style: { color: colors.text } }, t('about_me') || t('bio') || 'Bio'),
      h('p', { style: { color: colors.text } }, user.bio)
    ),
    skills.length > 0 &&
      h(
        'div',
        { className: 'resume-block' },
        h('h4', { style: { color: colors.text } }, t('skills') || 'Skills'),
        h(
          'div',
          { className: 'post-tags-cloud', style: { marginTop: 10 } },
          skills.map((s) =>
            h('span', { key: s, className: 'skill-tag skill-tag--display' }, s)
          )
        )
      ),
    experience.length > 0 &&
      h(
        'div',
        { className: 'resume-block' },
        h('h4', { style: { color: colors.text } }, t('experience_section_title') || 'Experience'),
        experience.map((exp, i) => {
          const title = exp.jobtitle || exp.job_title || '';
          const company = exp.company || '';
          const start = exp.startdate || exp.start_date || '';
          const end = (exp.is_current || exp.iscurrent)
            ? (t('present_time_label') || t('present') || 'Present')
            : (exp.enddate || exp.end_date || '');
          const line = [company, start && end ? `${start} - ${end}` : '']
            .filter(Boolean)
            .join(' • ');
          return h(
            'div',
            { key: i, className: 'resume-exp-item' },
            title && h('div', { className: 'resume-exp-title', style: { color: colors.text } }, title),
            line && h('div', { className: 'resume-exp-sub', style: { color: colors.hint } }, line)
          );
        })
      ),
    education.length > 0 &&
      h(
        'div',
        { className: 'resume-block' },
        h('h4', { style: { color: colors.text } }, t('education_section_title') || 'Education'),
        education.map((edu, i) => {
          const institution = edu.institution || '';
          const degree = edu.degree || '';
          const field = edu.fieldofstudy || edu.field_of_study || '';
          const start = edu.startdate || edu.start_date || '';
          const end = edu.enddate || edu.end_date || '';
          const subtitle = [degree, field].filter(Boolean).join(' • ');
          const dates =
            start || end
              ? [start, end].filter(Boolean).join(' - ')
              : '';
          return h(
            'div',
            { key: i, className: 'resume-exp-item' },
            institution && h('div', { className: 'resume-exp-title', style: { color: colors.text } }, institution),
            subtitle && h('div', { className: 'resume-exp-sub', style: { color: colors.hint } }, subtitle),
            dates && h('div', { className: 'resume-exp-sub', style: { color: colors.hint } }, dates)
          );
        })
      )
  );
}

function StatusPicker({ currentStatus, onSelect, onClose }) {
  let controlMode = 'swipes';
  try {
    const stored = localStorage.getItem('controlmode');
    if (stored === 'taps' || stored === 'swipes') controlMode = stored;
  } catch (e) {}

  const isSwipeMode = controlMode === 'swipes';

  useEffect(() => {
    try { tg?.disableVerticalSwipes?.(); } catch (e) {}
    return () => {
      try { tg?.enableVerticalSwipes?.(); } catch (e) {}
    };
  }, []);

  const content = h(
    motion.div,
    {
      className: 'status-picker-overlay',
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      onClick: onClose,
    },
    h(
      motion.div,
      {
        className: 'status-picker-sheet',
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring', damping: 25, stiffness: 300 },
        onClick: (e) => e.stopPropagation(),
        drag: isSwipeMode ? 'y' : false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: 0.2,
        onDragEnd: (event, info) => {
          if (isSwipeMode && info.offset.y > 80) {
            onClose();
          }
        },
      },
      h('div', { className: 'status-drag-handle' }),
      h('div', { className: 'status-picker-title' }, t('choose_status_title') || 'Your Status'),
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
              onClick: () => onSelect(key),
            },
            h('div', { className: 'status-icon' }, conf.icon),
            h('div', { className: 'status-label' }, t(conf.label) || conf.label)
          )
        )
      )
    )
  );

  return createPortal(content, document.body);
}

// --- МОНТИРОВАНИЕ ---
window.REACT_PROFILE = true;

function mountReactProfile() {
  if (!window.REACT_PROFILE) return;
  const host = document.getElementById('profile-view-container');
  if (!host) return;

  if (window.__REACT_PROFILE_ROOT__) {
    try {
      window.__REACT_PROFILE_ROOT__.unmount();
    } catch (e) {
      console.warn('REACT Profile: failed to unmount previous root', e);
    }
    window.__REACT_PROFILE_ROOT__ = null;
  }

  host.innerHTML = '';

  try {
    const root = createRoot(host);
    window.__REACT_PROFILE_ROOT__ = root;
    root.render(
      h(PhoneShell, null, h(MyProfileAppRoot, null))
    );
  } catch (e) {
    console.error('REACT Profile: Failed to mount:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactProfile);
} else {
  mountReactProfile();
}