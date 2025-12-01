// react/posts/PostsApp.js
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

import {
    t, postJSON, useDebounce, 
    POPULAR_SKILLS, ALL_RECOGNIZED_SKILLS, // 🔥 Импорт обоих списков
    isIOS, QuickFilterTags, ProfileFallback, PhoneShell, EmptyState,
} from './posts_utils.js';

import { SkeletonList } from './Skeleton.js';
import PostsList from './PostsList.js';
import PostContextMenu from './PostContextMenu.js';
import EditPostScreen from './EditPostScreen.js';
import PostDetailSheet from './PostDetailSheet.js';

const quickFiltersHost = document.getElementById('posts-quick-filters');

function App({ mountInto, overlayHost }) {
  const [cfg, setCfg] = useState(null);
  const [posts, setPosts] = useState([]);
  
  const [profileToShow, setProfileToShow] = useState(null);
  const [postToShow, setPostToShow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [contextMenuState, setContextMenuState] = useState({ post: null, targetElement: null });
  const [menuLayout, setMenuLayout] = useState({ verticalAdjust: 0, menuHeight: 0 });
  
  // Стейты
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingOrigin, setEditingOrigin] = useState('posts-feed-container');
  const listContainerRef = useRef(null);

  // Открытие редактора поста из профиля (MyProfileScreen)
  useEffect(() => {
  const handleOpenEditFromProfile = (e) => {
    const post = e.detail?.post;
    if (!post) return;
    setEditingOrigin('profile-view-container');
    setEditingPost(post);
  };

  document.addEventListener('open-edit-post-from-profile', handleOpenEditFromProfile);
  return () => {
    document.removeEventListener('open-edit-post-from-profile', handleOpenEditFromProfile);
  };
}, []);

  // ✅ Объединенный список для UI (Популярные + Выбранные)
  const visibleQuickTags = useMemo(() => {
      const combined = [...selectedSkills, ...POPULAR_SKILLS];
      return Array.from(new Set(combined));
  }, [selectedSkills]);

  // --- ХЕЛПЕР: Безопасное обновление инпутов ---
  const syncInputs = useCallback((value) => {
      setSearchQuery(value);
      const inputs = [
          document.getElementById('posts-search-input'),
          document.getElementById('global-search-input')
      ];
      inputs.forEach(input => {
          if (input && input.value !== value) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
          }
      });
  }, []);
  
  // --- ЗАГРУЗКА ---
  const fetchPosts = useCallback(async () => {
    if (!cfg?.backendUrl) return; 
    setIsLoading(true);
    try {
      const endpoint = showMyPostsOnly ? '/api/get-my-posts' : '/api/get-posts-feed';
      const resp = await postJSON(`${cfg.backendUrl}${endpoint}`, { initData: tg?.initData });
      if (resp?.ok) {
        const rawPosts = resp.posts || [];
        const postsWithKeys = rawPosts.map((p, index) => {
             const uniqueLayoutPrefix = `post-${p.post_id || 'no-id'}-author-${p.author?.user_id || 'unknown'}`;
             return { ...p, post_id: p.post_id || `generated-${index}-${uniqueLayoutPrefix}`, uniqueLayoutPrefix: uniqueLayoutPrefix };
        });
        setPosts(postsWithKeys); 
      } else { setPosts([]); }
    } catch (e) { setPosts([]); }
    finally { setIsLoading(false); }
  }, [cfg, showMyPostsOnly]);

  useEffect(() => {
    (async () => {
        try {
            if (!window.__CONFIG) await new Promise(resolve => setTimeout(resolve, 500));
            if (window.__CONFIG) setCfg(window.__CONFIG);
        } catch (error) {}
    })();
  }, []);

  useEffect(() => { if (cfg) { fetchPosts(); } }, [cfg, fetchPosts]);

  useEffect(() => { 
      const handleUpdate = () => { fetchPosts(); }; 
      document.addEventListener('posts-updated', handleUpdate); 
      return () => document.removeEventListener('posts-updated', handleUpdate); 
  }, [fetchPosts]);

  // --- УМНЫЙ ПОИСК: РУЧНОЙ ВВОД -> ВЫДЕЛЕНИЕ ТЕГОВ ---
  useEffect(() => {
    const input = document.getElementById('posts-search-input');
    if (!input) return;
    
    const onInput = (e) => { 
        const val = e.target.value || '';
        setSearchQuery(val); 

        // 1. Парсим введенный текст
        const terms = val.split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);

        // 2. Ищем совпадения в ПОЛНОМ словаре
        const detectedSkills = ALL_RECOGNIZED_SKILLS.filter(skill => 
            terms.includes(skill.toLowerCase())
        );

        const currentStr = selectedSkills.slice().sort().join('|');
        const newStr = detectedSkills.slice().sort().join('|');

        if (currentStr !== newStr) {
            setSelectedSkills(detectedSkills);
        }
    };
    
    input.addEventListener('input', onInput); 
    return () => { input.removeEventListener('input', onInput); };
  }, [selectedSkills]);

  // --- ВНЕШНИЕ СОБЫТИЯ ---
  useEffect(() => {
      const handleSetMode = (event) => {
          if (!event.detail) return;
          if (typeof event.detail.showMyPostsOnly === 'boolean') {
              if (event.detail.showMyPostsOnly !== showMyPostsOnly) {
                  setPosts([]); setShowMyPostsOnly(event.detail.showMyPostsOnly);
              }
          }
          if (Array.isArray(event.detail.skills)) {
              setSelectedSkills(event.detail.skills);
              syncInputs(event.detail.skills.join(', '));
          }
          if (event.detail.status !== undefined) setStatusFilter(event.detail.status);
      };
      
      const handleGlobalFilter = async (e) => {
          if (e.detail && e.detail.source === 'postsFeed') {
              if (!window.SkillsManager) return;
              const result = await window.SkillsManager.select(selectedSkills, {
                showStatus: true,
                initialStatus: statusFilter,
                statusVariant: 'posts',
                returnTo: 'posts-feed-container'
              });
              if (result) {
                  setStatusFilter(result.status);
                  setSelectedSkills(result.skills);
                  syncInputs(result.skills.join(', '));
              }
          }
      };
      
      document.addEventListener('set-posts-feed-mode', handleSetMode);
      document.addEventListener('openSkillsModal', handleGlobalFilter);
      return () => {
          document.removeEventListener('set-posts-feed-mode', handleSetMode);
          document.removeEventListener('openSkillsModal', handleGlobalFilter);
      };
    }, [showMyPostsOnly, selectedSkills, statusFilter, syncInputs]);

  useEffect(() => {
    const titleEl = document.querySelector('#posts-feed-container h1[data-i18n-key="feed_posts_title"]');
    if (!titleEl) return; 
    if (showMyPostsOnly) titleEl.textContent = t('my_posts_title');
    else titleEl.textContent = t('feed_posts_title');
  }, [showMyPostsOnly]); 

  useEffect(() => {
      if (window.__DEEP_LINK_POST) { setPostToShow(window.__DEEP_LINK_POST); window.__DEEP_LINK_POST = null; }
      const handleDeepLink = (e) => { const post = e.detail?.post; if (post) setPostToShow(post); };
      document.addEventListener('open-deep-link-post', handleDeepLink);
      return () => document.removeEventListener('open-deep-link-post', handleDeepLink);
  }, []);

  // --- ФИЛЬТРАЦИЯ ---
  const filtered = useMemo(() => {
    const qLower = (debouncedSearchQuery || '').toLowerCase().trim();
    const hasSearch = qLower.length > 0;
    const hasSkills = selectedSkills && selectedSkills.length > 0;
    const hasStatus = !!statusFilter;

    if (!hasSearch && !hasSkills && !hasStatus) return posts;
    if (!posts || posts.length === 0) return [];

    const terms = hasSearch ? qLower.replace(/,/g, ' ').split(' ').map((s) => s.trim()).filter(Boolean) : [];
    
    return posts.filter((p) => {
        if (hasStatus && p.post_type !== statusFilter) return false;
        const postSkillsLower = (p.skill_tags || []).map((s) => s.toLowerCase());

        if (hasSkills) {
            const matchesAllSkills = selectedSkills.every((selSkill) => 
                postSkillsLower.includes(selSkill.toLowerCase())
            );
            if (!matchesAllSkills) return false;
        }
        
        if (hasSearch) {
            // Если поиск = навыкам, пропускаем текстовый фильтр
            const isSearchMatchingSkills = selectedSkills.length > 0 && selectedSkills.join(', ').toLowerCase() === qLower;
            if (isSearchMatchingSkills) return true;

            const authorNameLower = (p.author?.first_name || '').toLowerCase();
            const contentLower = (p.content || '').toLowerCase();
            const matchesTerms = terms.every((term) => 
                authorNameLower.includes(term) || 
                contentLower.includes(term) || 
                postSkillsLower.some((skill) => skill.includes(term))
            );
            if (!matchesTerms) return false;
        }
        return true;
    });
  }, [posts, debouncedSearchQuery, selectedSkills, statusFilter]);

  useEffect(() => {
    if (!overlayHost) return;
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (overlayHost.style.display === 'none') setSelectedSkills([]);
            }
        });
    });
    observer.observe(overlayHost, { attributes: true });
    return () => observer.disconnect();
  }, [overlayHost]);

  const handleResetFilters = () => {
        setSelectedSkills([]);
        setStatusFilter(null);
        syncInputs('');
        const statusInput = document.getElementById('posts-status-filter-input');
        if (statusInput) statusInput.value = '';
    };

  // --- БЫСТРЫЕ ТЕГИ ---
  const onToggleSkill = useCallback((skill) => {
    if (skill === null) { setSelectedSkills([]); syncInputs(''); return; }
    
    const lowerSkill = skill.toLowerCase();
    let newSkills;
    
    if (selectedSkills.some((s) => s.toLowerCase() === lowerSkill)) {
        newSkills = selectedSkills.filter((s) => s.toLowerCase() !== lowerSkill);
    } else {
        // Ищем в ПОЛНОМ словаре
        const canonical = ALL_RECOGNIZED_SKILLS.find(s => s.toLowerCase() === lowerSkill) || skill;
        newSkills = [...selectedSkills, canonical];
    }
    
    setSelectedSkills(newSkills);
    syncInputs(newSkills.join(', '));
  }, [selectedSkills, syncInputs]);

  // --- Handlers ---
  const handleOpenProfile = useCallback(async (author) => { if (!author || !author.user_id) return; if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light'); setPostToShow(null); setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setProfileToShow(author); try { const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: author.user_id }); if (resp?.ok && resp.profile) { setProfileToShow(prev => { if (prev && prev.user_id === author.user_id) return resp.profile; return prev; }); } } catch(e) {} }, [cfg]);
  const handleCloseProfile = useCallback(() => { setProfileToShow(null); }, []);
  const handleOpenPostSheet = useCallback((post) => { if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('medium'); setPostToShow(post); }, []);
  const handleClosePostSheet = useCallback(() => { setPostToShow(null); }, []);
  const handleOpenContextMenu = useCallback((post, element) => { if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy'); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setContextMenuState({ post: post, targetElement: element }); }, []);
  const handleCloseContextMenu = useCallback(() => { setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); }, []);
  const handleMenuLayout = useCallback((layout) => { setMenuLayout(layout); }, []);
  const handleRespond = useCallback((post) => { setContextMenuState({ post: null, targetElement: null }); tg.showAlert(t('action_respond_toast')); }, []);
  const handleRepost = useCallback((post) => { setContextMenuState({ post: null, targetElement: null }); setPostToShow(null); const bot = window.__CONFIG?.botUsername; const app = window.__CONFIG?.appSlug; if (!bot || !app) { if (tg) tg.showAlert('Ошибка: Не настроен botUsername'); return; } const startParam = `p_${post.post_id}`; const appLink = `https://t.me/${bot}/${app}?startapp=${startParam}`; const rawContent = post.content || ''; const preview = rawContent.slice(0, 150) + (rawContent.length > 150 ? '...' : ''); const text = `${t('repost_request_title')}\n${preview}\n\n${t('repost_request_cta')}`; const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`; if (tg && tg.openTelegramLink) tg.openTelegramLink(shareUrl); else navigator.clipboard.writeText(appLink); }, []);
  useEffect(() => {
    const handler = (e) => {
      const post = e.detail?.post;
      if (post) {
        handleRepost(post);
      }
    };

    document.addEventListener('repost-post', handler);
    return () => {
      document.removeEventListener('repost-post', handler);
    };
  }, [handleRepost]);
  const handleEditPost = useCallback((post) => {
  setContextMenuState({ post: null, targetElement: null });
  setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
  setPostToShow(null);
  setTimeout(() => {
    setEditingOrigin('posts-feed-container');
    setEditingPost(post);
  }, 50);
}, []);
  const handleCloseEditScreen = useCallback(() => {
      setEditingPost(null);
  }, []);
  const handleDeletePost = useCallback(
  async (post) => {
    setContextMenuState({ post: null, targetElement: null });
    setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });

    setTimeout(() => {
      if (tg?.showConfirm) {
        tg.showConfirm(t('confirm_delete') || 'Удалить?', async (ok) => {
          if (!ok) return;

          try {
            const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, {
              initData: tg?.initData,
              post_id: post.post_id,
            });

            if (resp?.ok) {
              if (tg?.HapticFeedback?.notificationOccurred) {
                tg.HapticFeedback.notificationOccurred('success');
              }

              setPostToShow(null);
              fetchPosts();

              if (window.UI && typeof window.UI.showToast === 'function') {
                window.UI.showToast(
                  t('post_deleted_success') || 'Ваш запрос удалён',
                  false
                );
              }
            } else {
              if (tg?.showAlert) tg.showAlert('Ошибка при удалении');
            }
          } catch (e) {
            if (tg?.showAlert) tg.showAlert('Ошибка связи с сервером');
          }
        });
      } else {
        if (confirm('Удалить?')) {
          // тут при необходимости можно продублировать запрос
        }
      }
    }, 50);
  },
  [cfg, fetchPosts]
);

  const handleSaveEdit = useCallback(
  async (postData) => {
    try {
      const resp = await postJSON(`${cfg.backendUrl}/api/update-post`, {
        initData: tg?.initData,
        post_id: editingPost.post_id,
        post_type: postData.post_type,
        content: postData.content,
        full_description: postData.full_description,
        skill_tags: postData.skill_tags,
        experience_years: postData.experience_years,
      });

      if (resp?.ok) {
        if (tg?.HapticFeedback?.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred('success');
        }

        // Закрываем экран редактирования
        setEditingPost(null);
        // Закрываем открытую шторку поста (если была)
        setPostToShow(null);
        // Перезагружаем ленту
        fetchPosts();

        if (window.UI && typeof window.UI.showToast === 'function') {
          window.UI.showToast(
            t('post_edited_success') || 'Ваш запрос отредактирован',
            false
          );
        }

        document.dispatchEvent(
          new CustomEvent('post-saved', {
            detail: { post_id: editingPost.post_id },
          })
        );
      } else {
        if (tg?.showAlert) tg.showAlert('Ошибка при сохранении');
      }
    } catch (e) {
      if (tg?.showAlert) tg.showAlert('Ошибка связи с сервером');
    }
  },
  [cfg, editingPost, fetchPosts]
);

  const preventSystemMenu = useCallback((e) => { const targetTag = e.target.tagName; if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return; e.preventDefault(); e.stopPropagation(); }, []);

  const filterKey = JSON.stringify({ s: debouncedSearchQuery, k: selectedSkills.length, t: selectedSkills.join(','), st: statusFilter });

  return h('div', { onContextMenu: preventSystemMenu, style: { padding: '0 12px 12px', position: 'relative', minHeight: '200px' } },
      h(AnimatePresence, { mode: 'wait' }, 
          (isLoading) 
              ? h(motion.div, { key: 'skeleton', initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, style: { position: 'absolute', top: 0, left: '12px', width: 'calc(100% - 24px)', zIndex: 10, pointerEvents: 'none'} }, h(SkeletonList, null))
              : h(PostsList, { key: `list-${filterKey}`, posts: filtered, onOpenProfile: handleOpenProfile, onOpenPostSheet: handleOpenPostSheet, onOpenContextMenu: handleOpenContextMenu, onTagClick: onToggleSkill, isMyPosts: showMyPostsOnly, onEditPost: handleEditPost, onDeletePost: handleDeletePost, containerRef: listContainerRef, contextMenuPost: contextMenuState.post, menuLayout: menuLayout })
      ),
      h(EmptyState, { text: t('feed_empty'), visible: !isLoading && filtered.length === 0, onReset: handleResetFilters }),
      h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, { mode: "sync" }, 
          profileToShow && h(ProfileSheet, { key: `profile-${profileToShow.user_id}`, user: profileToShow, onClose: handleCloseProfile }),
          postToShow && h(PostDetailSheet, { key: `post-${postToShow.post_id}`, post: postToShow, onClose: handleClosePostSheet, onOpenProfile: handleOpenProfile, isMyPost: showMyPostsOnly, onEdit: handleEditPost, onDelete: handleDeletePost, onRespond: handleRespond, onRepost: handleRepost }),
          contextMenuState.post && h(PostContextMenu, { key: `context-menu-${contextMenuState.post.post_id}`, post: contextMenuState.post, targetElement: contextMenuState.targetElement, onClose: handleCloseContextMenu, onOpenProfile: handleOpenProfile, onRespond: handleRespond, onRepost: handleRepost, onEdit: handleEditPost, onDelete: handleDeletePost, onLayout: handleMenuLayout }),
          editingPost &&
            h(EditPostScreen, {
                key: `edit-${editingPost.post_id}`,
                post: editingPost,
                onClose: handleCloseEditScreen,
                onSave: handleSaveEdit,
                originId: editingOrigin,
            })
        )
    ),
    quickFiltersHost && createPortal(h(QuickFilterTags, { skills: visibleQuickTags, selected: selectedSkills, onToggle: onToggleSkill, hasSearchText: searchQuery.trim().length > 0 }), quickFiltersHost)
  );
}

window.REACT_FEED_POSTS = true;
function mountReactPostsFeed() {
  if (!window.REACT_FEED_POSTS) return;
  const hostList = document.getElementById('posts-list'); 
  const overlayHost = document.getElementById('posts-feed-container'); 
  if (!hostList) return;
  if (window.__REACT_POSTS_ROOT__) { try { window.__REACT_POSTS_ROOT__.unmount(); } catch (e) { console.warn(e); } window.__REACT_POSTS_ROOT__ = null; }
  const zombies = document.querySelectorAll('.post-context-menu-backdrop, .post-context-menu-container, .react-sheet-content, .react-sheet-backdrop');
  zombies.forEach(el => { if (el.parentNode === document.body) el.remove(); });
  hostList.innerHTML = '';
  try { const root = createRoot(hostList); window.__REACT_POSTS_ROOT__ = root; root.render(h(PhoneShell, null, h(App, { mountInto: hostList, overlayHost }))); } catch (e) { console.error("REACT Posts: Failed to mount:", e); }
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mountReactPostsFeed); } else { mountReactPostsFeed(); }