// react/posts/PostsApp.js (ESM)
// (Бывший /js/react-posts-feed.js)
// 
// Этот файл был очищен от ~2000 строк кода компонентов.
// Он теперь содержит ТОЛЬКО главный компонент App (логику)
// и импортирует все UI-компоненты из этой же папки.

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, Suspense, memo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence, useAnimation } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

// --- ИМПОРТ ОБЩЕГО КОМПОНЕНТА ---
// Путь изменился, т.к. мы теперь в /react/posts/
const ProfileSheet = React.lazy(() => import('../shared/ProfileSheet.js').then(module => ({ default: module.ProfileSheet })));

// --- ИМПОРТЫ ИЗ ЛОКАЛЬНЫХ УТИЛИТ ---
import {
    t,
    postJSON,
    useDebounce,
    POPULAR_SKILLS,
    isIOS,
    QuickFilterTags,
    ProfileFallback,
    PhoneShell,
    EmptyState,
} from './posts_utils.js';

// --- ИМПОРТЫ ЛОКАЛЬНЫХ КОМПОНЕНТОВ ---
import { SkeletonList } from './Skeleton.js';
import PostsList from './PostsList.js';
import FABMenu from './FABMenu.js';
import PostContextMenu from './PostContextMenu.js';
import EditPostModal from './EditPostModal.js';
import PostDetailSheet from './PostDetailSheet.js';


// --- Находим хост для быстрых фильтров ---
const quickFiltersHost = document.getElementById('posts-quick-filters');
if (!quickFiltersHost) { console.warn("REACT Posts: Host element #posts-quick-filters not found!"); }

/**
 * * Главный компонент-контейнер
 * (Содержит всю логику и состояние)
 * */
function App({ mountInto, overlayHost }) {
  const [cfg, setCfg] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [profileToShow, setProfileToShow] = useState(null);
  const [postToShow, setPostToShow] = useState(null);
  
  // Состояние загрузки (для скелетонов)
  const [isLoading, setIsLoading] = useState(true);

  // Состояние для контекстного меню
  const [contextMenuState, setContextMenuState] = useState({ post: null, targetElement: null });
  const [menuLayout, setMenuLayout] = useState({ verticalAdjust: 0, menuHeight: 0 });
  
  const [allSkills] = useState(POPULAR_SKILLS);
  
  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState('');        // сырая строка из input
  const [selectedSkills, setSelectedSkills] = useState([]);  // выбранные навыки (клики + модалка)
  const [statusFilter, setStatusFilter] = useState(null);    // выбранный статус

  // Дебаунсим ТОЛЬКО текстовый ввод,
  // чтобы не бомбить сервер / тяжёлую фильтрацию при печати
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const inputRef = useRef(null);
  const statusFilterInputRef = useRef(null);

  const listContainerRef = useRef(null);
  
  const handleBackToAllPosts = useCallback(() => {
    console.log("Back to all posts");
    document.dispatchEvent(new CustomEvent('show-all-posts'));
  }, []);
  
  // Рефы на DOM-элементы (инпуты)
  useEffect(() => { 
    inputRef.current = document.getElementById('posts-search-input'); 
    statusFilterInputRef.current = document.getElementById('posts-status-filter-input');
  }, [handleBackToAllPosts]);

  // Коллбэк для загрузки постов
  const fetchPosts = useCallback(async () => {
    if (!cfg?.backendUrl) return; 
    
    setIsLoading(true);
    
    console.log("REACT Posts: Fetching posts...");
    try {
      const endpoint = showMyPostsOnly ? '/api/get-my-posts' : '/api/get-posts-feed';
      const resp = await postJSON(`${cfg.backendUrl}${endpoint}`, { initData: tg?.initData });
      if (resp?.ok) {
        const postsWithKeys = (resp.posts || []).map((p, index) => {
             const uniqueLayoutPrefix = `post-${p.post_id || 'no-id'}-author-${p.author?.user_id || 'unknown'}`;
             return { ...p, post_id: p.post_id || `generated-${index}-${uniqueLayoutPrefix}`, uniqueLayoutPrefix: uniqueLayoutPrefix };
        });
        setPosts(postsWithKeys); 
        console.log("REACT Posts: Posts fetched:", postsWithKeys.length);
      } else { console.error("REACT Posts: Failed to fetch posts:", resp); setPosts([]); }
    } catch (e) { console.error("REACT Posts: Error fetching posts:", e); setPosts([]); }
    finally {
      setIsLoading(false);
    }
  }, [cfg, showMyPostsOnly]);

  // Загрузка конфига
  useEffect(() => {
    (async () => {
        try {
            if (!window.__CONFIG) {
                 console.error("React-posts: Конфиг не найден!");
                 await new Promise(resolve => setTimeout(resolve, 500));
                 if (!window.__CONFIG) {
                     console.error("React-posts: Конфиг все еще не найден!");
                     return;
                 }
            }
            const c = window.__CONFIG;
            setCfg(c);
        } catch (error) {
            console.error("React-posts: Ошибка в useEffect init:", error);
        }
    })();
  }, []);

  // Загрузка постов при готовности конфига или смене режима
  useEffect(() => { if (cfg) { fetchPosts(); } }, [cfg, fetchPosts]);

  // Слушатель для принудительного обновления (когда создан/удален пост)
  useEffect(() => { const handleUpdate = () => { fetchPosts(); }; document.addEventListener('posts-updated', handleUpdate); return () => document.removeEventListener('posts-updated', handleUpdate); }, [fetchPosts]);

  // Слушатель смены режима (из app.js)
  useEffect(() => {
    const handleSetMode = (event) => {
        if (!event.detail) return;

        // 1. Обработка переключения "Мои посты"
        if (typeof event.detail.showMyPostsOnly === 'boolean') {
            const newMode = event.detail.showMyPostsOnly;
            
            if (newMode !== showMyPostsOnly) {
                console.log("REACT (Posts): Смена режима", newMode);
                setPosts([]);
                setFiltered([]);
                setShowMyPostsOnly(newMode);
            } else {
                 console.log("REACT (Posts): Получена команда set-posts-feed-mode, но режим не изменился.", newMode);
            }
        }

        // 2. Обработка фильтра по НАВЫКАМ (из модального окна)
        if (Array.isArray(event.detail.skills)) {
             console.log("REACT (Posts): Получена команда set-posts-feed-mode (skills)", event.detail.skills);
             setSelectedSkills(event.detail.skills);
             if (inputRef.current) {
                inputRef.current.value = event.detail.skills.join(', ');
             }
        }
        
        // 3. Обработка фильтра по СТАТУСУ (из модального окна)
        if (event.detail.status !== undefined) {
            console.log("REACT (Posts): Получена команда set-posts-feed-mode (status)", event.detail.status);
            setStatusFilter(event.detail.status);
            if (statusFilterInputRef.current) {
                statusFilterInputRef.current.value = event.detail.status || '';
            }
        }
    };
    document.addEventListener('set-posts-feed-mode', handleSetMode);
    return () => {
        document.removeEventListener('set-posts-feed-mode', handleSetMode);
    };
  }, [showMyPostsOnly]); // Зависим, чтобы if (newMode !== showMyPostsOnly) работал

  // Обновление заголовка h1 (Мои запросы / Лента)
  useEffect(() => {
    const titleEl = document.querySelector('#posts-feed-container h1[data-i18n-key="feed_posts_title"]');
    if (!titleEl) return; 

    if (showMyPostsOnly) {
        titleEl.textContent = t('my_posts_title');
    } else {
        titleEl.textContent = t('feed_posts_title');
    }
  }, [showMyPostsOnly]); 

  // Фильтрация постов (поиск + теги + статус)
  useEffect(() => {
    // Поиск по тексту — С ДЕБАУНСОМ
    const qLower = (debouncedSearchQuery || '').toLowerCase().trim();

    const terms = qLower
      ? qLower
          .replace(/,/g, ' ')
          .split(' ')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Теги — БЕЗ дебаунса, как в ленте людей
    const selectedSkillsLower = (selectedSkills || []).map((s) =>
      s.toLowerCase(),
    );

    // Статус — тоже БЕЗ дебаунса
    const currentStatus = statusFilter;

    if (!posts || posts.length === 0) {
      setFiltered([]);
      return;
    }

    const newFiltered = posts.filter((p) => {
      const postSkillsLower = (p.skill_tags || []).map((s) =>
        s.toLowerCase(),
      );
      const authorNameLower = (p.author?.first_name || '').toLowerCase();
      const contentLower = (p.content || '').toLowerCase();

      // Фильтр по статусу
      const statusMatch =
        !currentStatus || p.post_type === currentStatus;

      // Фильтр по тегам (каждый выбранный скилл должен быть в посте)
      const tagMatch =
        selectedSkillsLower.length === 0 ||
        selectedSkillsLower.every((selSkill) =>
          postSkillsLower.includes(selSkill),
        );

      // Фильтр по тексту (имя, текст, навыки)
      const textMatch =
        terms.length === 0 ||
        terms.every(
          (term) =>
            authorNameLower.includes(term) ||
            contentLower.includes(term) ||
            postSkillsLower.some((skill) => skill.includes(term)),
        );

      return statusMatch && tagMatch && textMatch;
    });

    setFiltered(newFiltered);
  }, [posts, debouncedSearchQuery, selectedSkills, statusFilter]);

  // Слушатель инпута поиска
  useEffect(() => {
    const input = inputRef.current; 
    if (!input) return;
    
    const handleInput = () => {
      const currentQuery = input.value; 
      setSearchQuery(currentQuery);
      
      const currentStatus = statusFilterInputRef.current ? statusFilterInputRef.current.value : null;
      setStatusFilter(currentStatus);
      
      const potentialSkills = currentQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const allPotentialAreKnown = potentialSkills.length > 0 && potentialSkills.every(ps => allSkills.some(as => as.toLowerCase() === ps));
      if (!allPotentialAreKnown || currentQuery.trim().length === 0) { 
          if (selectedSkills.length > 0) { 
              setSelectedSkills([]); 
          } 
      } else {
        const skillsFromInput = potentialSkills.map(ps => allSkills.find(as => as.toLowerCase() === ps) || ps).sort((a,b) => a.localeCompare(b));
        const currentSelectedSorted = [...selectedSkills].sort((a,b) => a.localeCompare(b));
        if (JSON.stringify(skillsFromInput) !== JSON.stringify(currentSelectedSorted)) { 
            setSelectedSkills(skillsFromInput); 
        }
      }
    };
    
    input.addEventListener('input', handleInput); 
    return () => { if (input) input.removeEventListener('input', handleInput); };
  }, [allSkills, selectedSkills]);

  // Слушатель кнопки "Навыки" (для app.js)
  useEffect(() => {
    const skillButton = document.getElementById('open-skills-modal-button-posts'); if (!skillButton) return;
    const handleClick = () => { const event = new CustomEvent('openSkillsModal', { detail: { source: 'postsFeed', skills: selectedSkills } }); document.dispatchEvent(event); };
    skillButton.addEventListener('click', handleClick); return () => skillButton.removeEventListener('click', handleClick);
  }, [selectedSkills]);

  // Коллбэк для нажатия на тег (БЕЗ дебаунса для тегов)
  const onToggleSkill = useCallback((skill) => {
    const lowerSkill = skill.toLowerCase();
    let newSelectedSkills;

    const isSelected = selectedSkills.some(
      (s) => s.toLowerCase() === lowerSkill,
    );

    if (isSelected) {
      // снимаем тег
      newSelectedSkills = selectedSkills.filter(
        (s) => s.toLowerCase() !== lowerSkill,
      );
    } else {
      // добавляем тег в каноническом виде из POPULAR_SKILLS (если есть)
      const canonicalSkill =
        allSkills.find((s) => s.toLowerCase() === lowerSkill) || skill;

      newSelectedSkills = [...selectedSkills, canonicalSkill].sort((a, b) =>
        a.localeCompare(b),
      );
    }

    // 1. Мгновенно обновляем список выбранных тегов
    setSelectedSkills(newSelectedSkills);

    // 2. Обновляем value у текстового поля (для визуальной синхронизации)
    const newInputValue = newSelectedSkills.join(', ');
    if (inputRef.current && inputRef.current.value !== newInputValue) {
      inputRef.current.value = newInputValue;
    }

    // 3. Сбрасываем фильтр по статусу (как и раньше)
    if (statusFilterInputRef.current) {
      statusFilterInputRef.current.value = '';
    }
    setStatusFilter(null);

    // ВАЖНО: НЕ трогаем searchQuery здесь.
    // Дебаунс теперь влияет только на реальный ввод с клавиатуры,
    // а клики по тегам фильтруют список сразу.
  }, [selectedSkills, allSkills]);

  // --- Коллбэки для модальных окон (ИСПРАВЛЕНО: Optimistic UI) ---
  const handleOpenProfile = useCallback(async (author) => {
    if (!author || !author.user_id) { 
        console.error("REACT Posts: Invalid author data:", author); 
        return; 
    }
    
    if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
    
    // 1. Мгновенное открытие с тем, что есть
    setPostToShow(null);
    setContextMenuState({ post: null, targetElement: null });
    setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
    
    // Сразу ставим базовый профиль (чтобы шторка поехала)
    setProfileToShow(author);

    // 2. В фоне подгружаем детали
    try {
      const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: author.user_id });
      if (resp?.ok && resp.profile) { 
          // Обновляем стейт, если пользователь все еще смотрит этот профиль
          setProfileToShow(prev => {
              if (prev && prev.user_id === author.user_id) {
                  return resp.profile;
              }
              return prev;
          });
      } 
    } catch(e) { 
        console.error("REACT Posts: Error loading full profile:", e); 
        // Оставляем как есть (базовые данные лучше, чем ошибка)
    }
  }, [cfg]);
  const handleCloseProfile = useCallback(() => { setProfileToShow(null); }, []);
  
  const handleOpenPostSheet = useCallback((post) => {
    if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('medium');
    setPostToShow(post);
  }, []);
  const handleClosePostSheet = useCallback(() => { setPostToShow(null); }, []);

  // --- Коллбэки для Контекстного меню ---
  const handleOpenContextMenu = useCallback((post, element) => {
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('heavy');
      setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
      setContextMenuState({ post: post, targetElement: element });
  }, []);
  
  const handleCloseContextMenu = useCallback(() => {
      setContextMenuState({ post: null, targetElement: null });
      setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
  }, []);

  const handleMenuLayout = useCallback((layout) => {
      setMenuLayout(layout);
  }, []);
  
  useEffect(() => {
      const handleScroll = () => {
        if (contextMenuState.post) {
          handleCloseContextMenu();
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
  }, [contextMenuState.post, handleCloseContextMenu]);

  // --- Коллбэки для Действий (Редактировать, Удалить, etc.) ---
  const handleRespond = useCallback((post) => {
      setContextMenuState({ post: null, targetElement: null });
      setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
      tg.showAlert(t('action_respond_toast'));
  }, []);
  
  const handleRepost = useCallback((post) => {
      setContextMenuState({ post: null, targetElement: null });
      setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
      tg.showAlert(t('action_repost_toast'));
  }, []);

  const handleCreatePost = useCallback(() => {
    console.log("FAB: Create post clicked");
    document.dispatchEvent(new CustomEvent('openCreatePostModal'));
  }, []);

  const handleMyPosts = useCallback(() => {
    console.log("FAB: My posts clicked");
    document.dispatchEvent(new CustomEvent('show-my-posts'));
  }, []);

  const handleSaved = useCallback(() => {
    console.log("FAB: Saved clicked");
    tg.showAlert('Сохраненное - в разработке');
  }, []);

  const handleSubscriptions = useCallback(() => {
    console.log("FAB: Subscriptions clicked");
    tg.showAlert('Лента подписок - в разработке');
  }, []);

  const handleEditPost = useCallback((post) => {
    console.log("Edit post:", post.post_id);
    setEditingPost(post);
    setPostToShow(null);
    setContextMenuState({ post: null, targetElement: null });
    setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
  }, []);
  
  const handleDeletePost = useCallback(async (post) => {
    setContextMenuState({ post: null, targetElement: null });
    setMenuLayout({ verticalAdjust: 0, menuHeight: 0 });
    
    if (tg?.showConfirm) {
        tg.showConfirm("Удалить этот запрос?", async (ok) => {
            if (!ok) return;
            try {
              const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, {
                initData: tg?.initData,
                post_id: post.post_id
              });
              if (resp?.ok) {
                if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success');
                setPostToShow(null);
                fetchPosts();
              } else {
                tg.showAlert('Ошибка при удалении');
              }
            } catch (e) {
              console.error("Delete error:", e);
              tg.showAlert('Ошибка связи с сервером');
            }
        });
    } else {
        // Fallback for desktop/unsupported
        if (!confirm('Удалить этот запрос?')) return;
        try {
          const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, {
            initData: tg?.initData,
            post_id: post.post_id
          });
          if (resp?.ok) {
            if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success');
            setPostToShow(null);
            fetchPosts(); 
          } else {
            tg.showAlert('Ошибка при удалении');
          }
        } catch (e) {
          console.error("Delete error:", e);
          tg.showAlert('Ошибка связи с сервером');
        }
    }
  }, [cfg, fetchPosts]);

  const handleSaveEdit = useCallback(async (postData) => {
    try {
      const resp = await postJSON(`${cfg.backendUrl}/api/update-post`, {
        initData: tg?.initData,
        post_id: editingPost.post_id,
        post_type: postData.post_type,
        content: postData.content,
        full_description: postData.full_description,
        skill_tags: postData.skill_tags
      });
      
      if (resp?.ok) {
        if (tg?.HapticFeedback?.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred('success');
        }
        setEditingPost(null);
        fetchPosts();
      } else {
        tg.showAlert('Ошибка при сохранении');
      }
    } catch (e) {
      console.error("Update error:", e);
      tg.showAlert('Ошибка связи с сервером');
    }
  }, [cfg, editingPost, fetchPosts]);

  const preventSystemMenu = useCallback((e) => {
      const targetTag = e.target.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
          return;
      }
      e.preventDefault();
      e.stopPropagation();
  }, []);


  // --- РЕНДЕРИНГ ---
  return h('div', { 
      onContextMenu: preventSystemMenu,
      style: { 
          padding: '0 12px 12px'
      } 
  },
    
    // Показываем скелетоны или список постов
    (isLoading && filtered.length === 0)
      ? h(SkeletonList, null)
      : h(PostsList, { 
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
        }),

    // Пустое состояние (НЕ во время загрузки)
    h(EmptyState, {
      text: t('feed_empty'),
      visible: !isLoading && filtered.length === 0,
    }),
    
    // Модальные окна
    h(Suspense, { fallback: h(ProfileFallback) },
        h(AnimatePresence, {
            mode: "sync"
        }, 
          profileToShow && h(ProfileSheet, { key: `profile-${profileToShow.user_id}`, user: profileToShow, onClose: handleCloseProfile }),
          
          postToShow && h(PostDetailSheet, { 
            key: `post-${postToShow.post_id}`, 
            post: postToShow, 
            onClose: handleClosePostSheet, 
            onOpenProfile: handleOpenProfile,
            isMyPost: showMyPostsOnly,
            onEdit: handleEditPost,
            onDelete: handleDeletePost,
            onRespond: handleRespond,
            onRepost: handleRepost
          }),
          
          editingPost && h(EditPostModal, {
            key: `edit-${editingPost.post_id}`,
            post: editingPost,
            onClose: () => setEditingPost(null),
            onSave: handleSaveEdit
          }),
          
          contextMenuState.post && h(PostContextMenu, {
            key: `context-menu-${contextMenuState.post.post_id}`,
            post: contextMenuState.post,
            targetElement: contextMenuState.targetElement,
            onClose: handleCloseContextMenu,
            onOpenProfile: handleOpenProfile,
            onRespond: handleRespond,
            onRepost: handleRepost,
            onEdit: handleEditPost,
            onDelete: handleDeletePost,
            onLayout: handleMenuLayout
          })
        )
    ),
    
    // FAB Меню
    h('div', {
        onContextMenu: preventSystemMenu,
    }, 
        h(FABMenu, {
          onCreatePost: handleCreatePost,
          onMyPosts: handleMyPosts,
          onSaved: handleSaved,
          onSubscriptions: handleSubscriptions
        })
    ),
    
    // Портал для быстрых фильтров
    quickFiltersHost && createPortal(h(QuickFilterTags, { skills: allSkills, selected: selectedSkills, onToggle: onToggleSkill }), quickFiltersHost)
  );
}

// --- Монтирование ---
window.REACT_FEED_POSTS = true;
function mountReactPostsFeed() {
  if (!window.REACT_FEED_POSTS) { 
       console.warn("REACT Posts: Global flag window.REACT_FEED_POSTS is false. Skipping mount.");
       return; 
  }
  const hostList = document.getElementById('posts-list'); 
  if (!hostList) { 
      console.error("REACT Posts: Host element #posts-list not found!"); 
      return; 
  }
  if (!quickFiltersHost) { 
      console.error("REACT Posts: Host element #posts-quick-filters not found for portal!"); 
  }
  
  hostList.innerHTML = '';
  
  try {
      const root = createRoot(hostList);
      // Используем PhoneShell из utils.js
      root.render(h(PhoneShell, null, h(App, { mountInto: hostList })));
      console.log("REACT Posts: Component mounted successfully into #posts-list.");
      return () => { try { root.unmount(); } catch(e) { console.error("REACT Posts: Unmount failed:", e); } };
  } catch (e) { 
      console.error("REACT Posts: Failed to mount component:", e); 
  }
}

if (document.readyState === 'loading') { 
    document.addEventListener('DOMContentLoaded', mountReactPostsFeed); 
} else { 
    mountReactPostsFeed(); 
}