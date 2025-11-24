// react/posts/PostsApp.js
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

import {
    t, postJSON, useDebounce, POPULAR_SKILLS, isIOS, QuickFilterTags, ProfileFallback, PhoneShell, EmptyState,
} from './posts_utils.js';

import { SkeletonList } from './Skeleton.js';
import PostsList from './PostsList.js';
import FABMenu from './FABMenu.js';
import PostContextMenu from './PostContextMenu.js';
import EditPostModal from './EditPostModal.js';
import PostDetailSheet from './PostDetailSheet.js';

const quickFiltersHost = document.getElementById('posts-quick-filters');

function App({ mountInto, overlayHost }) {
  const [cfg, setCfg] = useState(null);
  const [posts, setPosts] = useState([]);
  // filtered вычисляется через useMemo
  
  const [profileToShow, setProfileToShow] = useState(null);
  const [postToShow, setPostToShow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [contextMenuState, setContextMenuState] = useState({ post: null, targetElement: null });
  const [menuLayout, setMenuLayout] = useState({ verticalAdjust: 0, menuHeight: 0 });
  
  const [allSkills] = useState(POPULAR_SKILLS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  
  const listContainerRef = useRef(null);
  
  // --- ЗАГРУЗКА ---
  const fetchPosts = useCallback(async () => {
    if (!cfg?.backendUrl) return; 
    setIsLoading(true);
    try {
      const endpoint = showMyPostsOnly ? '/api/get-my-posts' : '/api/get-posts-feed';
      const resp = await postJSON(`${cfg.backendUrl}${endpoint}`, { initData: tg?.initData });
      if (resp?.ok) {
        const postsWithKeys = (resp.posts || []).map((p, index) => {
             const uniqueLayoutPrefix = `post-${p.post_id || 'no-id'}-author-${p.author?.user_id || 'unknown'}`;
             return { ...p, post_id: p.post_id || `generated-${index}-${uniqueLayoutPrefix}`, uniqueLayoutPrefix: uniqueLayoutPrefix };
        });
        setPosts(postsWithKeys); 
      } else { setPosts([]); }
    } catch (e) { setPosts([]); }
    finally { setIsLoading(false); }
  }, [cfg, showMyPostsOnly]);

  // --- ИНИЦИАЛИЗАЦИЯ ---
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

  // --- ВНЕШНИЕ СОБЫТИЯ ---
  useEffect(() => {
      const handleSetMode = (event) => {
          if (!event.detail) return;
          
          // Логика переключения "Мои посты" / "Все"
          if (typeof event.detail.showMyPostsOnly === 'boolean') {
              const newMode = event.detail.showMyPostsOnly;
              if (newMode !== showMyPostsOnly) {
                  setPosts([]); 
                  setShowMyPostsOnly(newMode);
              }
          }
          
          if (Array.isArray(event.detail.skills)) {
              setSelectedSkills(event.detail.skills);
          }
          
          if (event.detail.status !== undefined) {
              setStatusFilter(event.detail.status);
          }
      };
      
      document.addEventListener('set-posts-feed-mode', handleSetMode);
      return () => document.removeEventListener('set-posts-feed-mode', handleSetMode);
    }, [showMyPostsOnly]);

  useEffect(() => {
    const titleEl = document.querySelector('#posts-feed-container h1[data-i18n-key="feed_posts_title"]');
    if (!titleEl) return; 
    if (showMyPostsOnly) titleEl.textContent = t('my_posts_title');
    else titleEl.textContent = t('feed_posts_title');
  }, [showMyPostsOnly]); 

  // --- СЛУШАТЕЛЬ DEEP LINK (POST) ---
  useEffect(() => {
      // 1. Проверяем, не ждет ли нас пост в "почтовом ящике" (при холодном старте)
      if (window.__DEEP_LINK_POST) {
          console.log("📬 React found pending deep link post");
          setPostToShow(window.__DEEP_LINK_POST);
          window.__DEEP_LINK_POST = null; // Забираем почту (очищаем)
      }

      // 2. Настраиваем слушатель для будущих событий (если перешли по ссылке внутри аппа)
      const handleDeepLink = (e) => {
          const post = e.detail?.post;
          if (post) {
              setPostToShow(post); // Открываем шторку с этим постом
          }
      };
      
      document.addEventListener('open-deep-link-post', handleDeepLink);
      return () => document.removeEventListener('open-deep-link-post', handleDeepLink);
  }, []);

  // --- ФИЛЬТРАЦИЯ (SYNC via useMemo) ---
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
        if (hasSkills) {
            const postSkillsLower = (p.skill_tags || []).map((s) => s.toLowerCase());
            if (!selectedSkills.every((selSkill) => postSkillsLower.includes(selSkill.toLowerCase()))) return false;
        }
        if (hasSearch) {
            const authorNameLower = (p.author?.first_name || '').toLowerCase();
            const contentLower = (p.content || '').toLowerCase();
            const postSkillsForSearch = (p.skill_tags || []).map((s) => s.toLowerCase());
            if (!terms.every((term) => 
                authorNameLower.includes(term) || 
                contentLower.includes(term) || 
                postSkillsForSearch.some((skill) => skill.includes(term))
            )) return false;
        }
        return true;
    });
  }, [posts, debouncedSearchQuery, selectedSkills, statusFilter]);

  useEffect(() => {
    if (!overlayHost) return;
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (overlayHost.style.display === 'none') {
                    // Экран скрылся — чистим всё, пока никто не видит
                    setSearchQuery('');
                    // setStatusFilter(null); // Если хочешь сбрасывать и фильтр типа
                }
            }
        });
    });
    observer.observe(overlayHost, { attributes: true });
    return () => observer.disconnect();
  }, [overlayHost]);

  const handleResetFilters = () => {
        setSearchQuery(''); // Очищаем поиск
        setSelectedSkills([]); // Очищаем навыки
        setStatusFilter(null); // Сбрасываем фильтр типа (Ищу/Предлагаю)
        
        // Чистим нативные инпуты
        const searchInput = document.getElementById('posts-search-input');
        if (searchInput) searchInput.value = '';
        
        const statusInput = document.getElementById('posts-status-filter-input');
        if (statusInput) statusInput.value = '';
    };

  // --- UI СВЯЗКИ ---
  useEffect(() => {
    const input = document.getElementById('posts-search-input');
    if (!input) return;
    const onInput = () => { setSearchQuery(input.value || ''); };
    input.addEventListener('input', onInput); 
    return () => { input.removeEventListener('input', onInput); };
  }, []);

  useEffect(() => {
    const input = document.getElementById('posts-search-input');
    if (!input) return;
    const newVal = selectedSkills.join(', ');
    if (input.value !== newVal) {
        input.value = newVal;
        setSearchQuery(newVal);
    }
  }, [selectedSkills]);

  useEffect(() => {
    const skillButton = document.getElementById('open-skills-modal-button-posts'); if (!skillButton) return;
    const handleClick = () => { 
        document.dispatchEvent(new CustomEvent('openSkillsModal', { 
            detail: { source: 'postsFeed', skills: selectedSkills } 
        })); 
    };
    skillButton.addEventListener('click', handleClick); 
    return () => skillButton.removeEventListener('click', handleClick);
  }, [selectedSkills]);

  const onToggleSkill = useCallback((skill) => {
    const lowerSkill = skill.toLowerCase();
    let newSelectedSkills;
    const isSelected = selectedSkills.some((s) => s.toLowerCase() === lowerSkill);
    if (isSelected) {
        newSelectedSkills = selectedSkills.filter((s) => s.toLowerCase() !== lowerSkill);
    } else {
      const canonicalSkill = allSkills.find((s) => s.toLowerCase() === lowerSkill) || skill;
      newSelectedSkills = [...selectedSkills, canonicalSkill].sort((a, b) => a.localeCompare(b));
    }
    setSelectedSkills(newSelectedSkills);
  }, [selectedSkills, allSkills]);

  // Handlers (копия)
  const handleOpenProfile = useCallback(async (author) => { if (!author || !author.user_id) return; if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light'); setPostToShow(null); setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setProfileToShow(author); try { const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: author.user_id }); if (resp?.ok && resp.profile) { setProfileToShow(prev => { if (prev && prev.user_id === author.user_id) return resp.profile; return prev; }); } } catch(e) {} }, [cfg]);
  const handleCloseProfile = useCallback(() => { setProfileToShow(null); }, []);
  const handleOpenPostSheet = useCallback((post) => { if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('medium'); setPostToShow(post); }, []);
  const handleClosePostSheet = useCallback(() => { setPostToShow(null); }, []);
  const handleOpenContextMenu = useCallback((post, element) => { if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy'); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setContextMenuState({ post: post, targetElement: element }); }, []);
  const handleCloseContextMenu = useCallback(() => { setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); }, []);
  const handleMenuLayout = useCallback((layout) => { setMenuLayout(layout); }, []);
  useEffect(() => { const handleScroll = () => { if (contextMenuState.post) handleCloseContextMenu(); }; window.addEventListener('scroll', handleScroll, { passive: true }); return () => window.removeEventListener('scroll', handleScroll); }, [contextMenuState.post, handleCloseContextMenu]);
  const handleRespond = useCallback((post) => { setContextMenuState({ post: null, targetElement: null }); tg.showAlert(t('action_respond_toast')); }, []);

  const handleRepost = useCallback((post) => { 
        // 1. Закрываем все меню
        setContextMenuState({ post: null, targetElement: null }); 
        setPostToShow(null); 

        const bot = window.__CONFIG?.botUsername;
        const app = window.__CONFIG?.appSlug;

        if (!bot || !app) {
            if (tg) tg.showAlert('Ошибка: Не настроен botUsername в конфиге');
            return;
        }

        // 2. Генерируем ссылку (p_ID)
        const startParam = `p_${post.post_id}`;
        const appLink = `https://t.me/${bot}/${app}?startapp=${startParam}`;
        
        // 3. Формируем красивый текст для предпросмотра
        const rawContent = post.content || '';
        const preview = rawContent.slice(0, 150) + (rawContent.length > 150 ? '...' : '');
        
        // ✅ ТЕПЕРЬ ПЕРЕВОДИТСЯ:
        const text = `${t('repost_request_title')}\n${preview}\n\n${t('repost_request_cta')}`;
        
        // 4. Открываем нативное окно выбора чата в Telegram
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`;
        
        if (tg && tg.openTelegramLink) {
            tg.openTelegramLink(shareUrl);
        } else {
            navigator.clipboard.writeText(appLink);
            alert(t('link_copied'));
        }
        
    }, []);

  const handleCreatePost = useCallback(() => { document.dispatchEvent(new CustomEvent('openCreatePostModal')); }, []);
  const handleMyPosts = useCallback(() => { document.dispatchEvent(new CustomEvent('show-my-posts')); }, []);
  const handleSaved = useCallback(() => { tg.showAlert('Сохраненное - в разработке'); }, []);
  const handleSubscriptions = useCallback(() => { tg.showAlert('Лента подписок - в разработке'); }, []);
  const handleEditPost = useCallback((post) => { setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setPostToShow(null); setTimeout(() => { setEditingPost(post); }, 50); }, []);
  const handleDeletePost = useCallback(async (post) => { setContextMenuState({ post: null, targetElement: null }); setMenuLayout({ verticalAdjust: 0, menuHeight: 0 }); setTimeout(() => { if (tg?.showConfirm) { tg.showConfirm(t('confirm_delete') || "Удалить?", async (ok) => { if (!ok) return; try { const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, { initData: tg?.initData, post_id: post.post_id }); if (resp?.ok) { if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success'); setPostToShow(null); fetchPosts(); } else { tg.showAlert('Ошибка при удалении'); } } catch (e) { tg.showAlert('Ошибка связи с сервером'); } }); } else { if(confirm("Удалить?")) { /*...*/ } } }, 50); }, [cfg, fetchPosts]);
  const handleSaveEdit = useCallback(async (postData) => { try { const resp = await postJSON(`${cfg.backendUrl}/api/update-post`, { initData: tg?.initData, post_id: editingPost.post_id, post_type: postData.post_type, content: postData.content, full_description: postData.full_description, skill_tags: postData.skill_tags }); if (resp?.ok) { if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success'); setEditingPost(null); fetchPosts(); } else { tg.showAlert('Ошибка при сохранении'); } } catch (e) { tg.showAlert('Ошибка связи с сервером'); } }, [cfg, editingPost, fetchPosts]);
  const preventSystemMenu = useCallback((e) => { const targetTag = e.target.tagName; if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return; e.preventDefault(); e.stopPropagation(); }, []);

  // КЛЮЧ-СИГНАТУРА
  const filterKey = JSON.stringify({
      s: debouncedSearchQuery,
      k: selectedSkills.length,
      t: selectedSkills.join(','),
      st: statusFilter
  });

  return h('div', { 
      onContextMenu: preventSystemMenu, 
      style: { 
          padding: '0 12px 12px',
          position: 'relative', 
          minHeight: '200px'
      } 
  },
      // 🔥 mode="wait": Сначала старый список пропадает, потом появляется новый.
      h(AnimatePresence, { mode: 'wait' }, 
          (isLoading) 
              ? h(motion.div, {
                  key: 'skeleton',
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 }, 
                  style: { position: 'absolute', top: 0, left: '12px', width: 'calc(100% - 24px)', zIndex: 10, pointerEvents: 'none'}
                }, h(SkeletonList, null))
              
              : h(PostsList, { 
                  key: `list-${filterKey}`,
                  posts: filtered, 
                  onOpenProfile: handleOpenProfile, 
                  onOpenPostSheet: handleOpenPostSheet, 
                  onOpenContextMenu: handleOpenContextMenu, 
                  onTagClick: onToggleSkill, 
                  isMyPosts: showMyPostsOnly, 
                  onEditPost: handleEditPost, 
                  onDeletePost: handleDeletePost, 
                  containerRef: listContainerRef, 
                  contextMenuPost: contextMenuState.post, 
                  menuLayout: menuLayout
              })
      ),
      
      h(EmptyState, { 
        text: t('feed_empty'), 
        visible: !isLoading && filtered.length === 0,
        onReset: handleResetFilters // <-- Добавляем обработчик
    }),
    
    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, { mode: "sync" }, 
          profileToShow && h(ProfileSheet, { key: `profile-${profileToShow.user_id}`, user: profileToShow, onClose: handleCloseProfile }),
          postToShow && h(PostDetailSheet, { key: `post-${postToShow.post_id}`, post: postToShow, onClose: handleClosePostSheet, onOpenProfile: handleOpenProfile, isMyPost: showMyPostsOnly, onEdit: handleEditPost, onDelete: handleDeletePost, onRespond: handleRespond, onRepost: handleRepost }),
          contextMenuState.post && h(PostContextMenu, { key: `context-menu-${contextMenuState.post.post_id}`, post: contextMenuState.post, targetElement: contextMenuState.targetElement, onClose: handleCloseContextMenu, onOpenProfile: handleOpenProfile, onRespond: handleRespond, onRepost: handleRepost, onEdit: handleEditPost, onDelete: handleDeletePost, onLayout: handleMenuLayout }),
          editingPost && h(EditPostModal, { key: `edit-${editingPost.post_id}`, post: editingPost, onClose: () => setEditingPost(null), onSave: handleSaveEdit })
        )
    ),
    h('div', { onContextMenu: preventSystemMenu }, h(FABMenu, { onCreatePost: handleCreatePost, onMyPosts: handleMyPosts, onSaved: handleSaved, onSubscriptions: handleSubscriptions })),
    quickFiltersHost && createPortal(h(QuickFilterTags, { skills: allSkills, selected: selectedSkills, onToggle: onToggleSkill }), quickFiltersHost)
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
  try {
      const root = createRoot(hostList);
      window.__REACT_POSTS_ROOT__ = root;
      root.render(h(PhoneShell, null, h(App, { mountInto: hostList, overlayHost })));
  } catch (e) { console.error("REACT Posts: Failed to mount:", e); }
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mountReactPostsFeed); } else { mountReactPostsFeed(); }