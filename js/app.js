// js/app.js

import { loadTranslations, t, supportedLangs } from './i18n.js';
import { applyTheme, applyGlass } from './theme.js';
import * as api from './api.js';

import * as uiRaw from './ui-helpers.js?v=1.6';
const UI = { ...uiRaw }; 

import { state, SKILL_CATEGORIES } from './app-state.js';
import { setupDynamicList } from './app-form-helpers.js';

window.t = t;
window.REACT_FEED = true;

// Масштабирование UI
function initUiScale(tg) {
  try {
    const setScale = () => {
      const vw = (tg && typeof tg.viewportWidth === 'number')
        ? tg.viewportWidth
        : (typeof window !== 'undefined' ? window.innerWidth : 390);

      let scale = vw / 390;
      if (scale < 0.9) scale = 0.9;
      if (scale > 1.15) scale = 1.15;

      document.documentElement.style.setProperty('--ui-scale', String(scale));
    };
    setScale();
    if (tg && typeof tg.onEvent === 'function') {
      tg.onEvent('viewportChanged', setScale);
    }
    window.addEventListener('resize', setScale);
  } catch (e) {
    console.warn('initUiScale error', e);
  }
}

const tg = window.Telegram.WebApp;
tg.expand();
initUiScale(tg);

document.addEventListener('DOMContentLoaded', () => {

    // Глобальные переменные
    let linksManager, experienceManager, educationManager;

    const elements = {
        welcomeContainer: document.getElementById('welcome-container'),
        formContainer: document.getElementById('form-container'),
        profileViewContainer: document.getElementById('profile-view-container'),
        feedContainer: document.getElementById('feed-container'),
        userDetailContainer: document.getElementById('user-detail-container'),
        settingsContainer: document.getElementById('settings-container'),
        skillsModal: document.getElementById('skills-modal'),
        spinner: document.getElementById('loading-spinner'),

        posts: {
            container: document.getElementById('posts-feed-container'),
            list: document.getElementById('posts-list'),
            searchInput: document.getElementById('posts-search-input'),
            postsStatusFilterInput: document.getElementById('posts-status-filter-input'), 
            quickFilters: document.getElementById('posts-quick-filters'),
            openSkillsModalButton: document.getElementById('open-skills-modal-button-posts'),
        },
        
        postModal: {
            modal: document.getElementById('create-post-modal'),
            saveButton: document.getElementById('save-post-button'),
            typeSelect: document.getElementById('post-type-select'),
            contentField: document.getElementById('post-content-field'),
            fullDescriptionField: document.getElementById('post-full-description-field'),
            skillsField: document.getElementById('post-skills-field'),
            openSkillsModalButton: document.getElementById('select-post-skills-button')
        },

        form: {
            nameField: document.getElementById('name-field'),
            bioField: document.getElementById('bio-field'),
            skillsField: document.getElementById('skills-field'),
            photoInput: document.getElementById('photo-input'),
            avatarPreview: document.getElementById('avatar-preview'),
            // Кнопка в форме редактирования профиля
            openSkillsModalButton: document.getElementById('open-skills-modal-button'),
            linksContainer: document.getElementById('links-container'),
            addLinkButton: document.getElementById('add-link-button'),
            experienceContainer: document.getElementById('experience-container'),
            addExperienceButton: document.getElementById('add-experience-button'),
            educationContainer: document.getElementById('education-container'),
            addEducationButton: document.getElementById('add-education-button'),
            linkTemplate: document.getElementById('link-template'),
            experienceTemplate: document.getElementById('experience-template'),
            educationTemplate: document.getElementById('education-template')
        },

        profile: {
            username: document.getElementById('profile-username'),
            bio: document.getElementById('profile-bio'),
            avatarContainer: document.querySelector('.profile-avatar-container'),
            avatar: document.getElementById('profile-avatar'),
            skillsContainer: document.getElementById('profile-skills'),
            skillsToggleBtn: document.getElementById('profile-skills-toggle'),
            experienceContainer: document.getElementById('profile-experience'),
            educationContainer: document.getElementById('profile-education'),
            linksContainer: document.getElementById('profile-links'),
            followersCount: document.getElementById('profile-followers')?.querySelector('.stat-value'),
            followingCount: document.getElementById('profile-following')?.querySelector('.stat-value'),
            logoutButton: document.getElementById('logout-button'),
            shareButton: document.getElementById('share-button'),
            settingsButton: document.getElementById('settings-button'),
            showQrButton: document.getElementById('show-qr-button')
        },

        feed: {
            list: document.getElementById('feed-list'),
            searchInput: document.getElementById('feed-search-input'),
            quickFilters: document.getElementById('feed-quick-filters'),
            openSkillsModalButtonFeed: document.getElementById('open-skills-modal-button-feed')
        },

        detail: {
            headerActionsButton: document.getElementById('detail-header-actions-button'),
            avatar: document.getElementById('detail-avatar'),
            avatarContainer: document.querySelector('.detail-avatar-container'),
            username: document.getElementById('detail-username'),
            bio: document.getElementById('detail-bio'),
            experienceContainer: document.getElementById('detail-experience'),
            educationContainer: document.getElementById('detail-education'),
            linksContainer: document.getElementById('detail-links'),
            skillsContainer: document.getElementById('detail-skills'),
            skillsToggleBtn: document.getElementById('detail-skills-toggle'),
            followersCount: document.getElementById('detail-followers')?.querySelector('.stat-value'),
            followingCount: document.getElementById('detail-following')?.querySelector('.stat-value'),
            fabContainer: document.getElementById('detail-fab-container'),
            fabContactButton: document.getElementById('fab-contact-button'),
            fabFollowButton: document.getElementById('fab-follow-button')
        },

        settings: {
            langBtnRu: document.getElementById('lang-btn-ru'),
            langBtnEn: document.getElementById('lang-btn-en'),
            glassToggleWrapper: document.getElementById('glass-toggle-wrapper'),
            glassToggle: document.getElementById('glass-toggle-switch'),
            controlBtnTaps: document.getElementById('control-btn-taps'),
            controlBtnSwipes: document.getElementById('control-btn-swipes'),
            themeButtons: [
                document.getElementById('theme-btn-auto'),
                document.getElementById('theme-btn-light'),
                document.getElementById('theme-btn-dark'),
                document.getElementById('theme-btn-custom')
            ],
            customThemeGroup: document.getElementById('custom-theme-group'),
            colorInputBg: document.getElementById('color-input-bg'),
            colorInputButton: document.getElementById('color-input-button'),
            colorInputText: document.getElementById('color-input-text'),
            saveCustomThemeButton: document.getElementById('save-custom-theme-button')
        },

        qr: {
            modal: document.getElementById('qr-code-modal'),
            output: document.getElementById('qrcode-output'),
            linkDisplay: document.getElementById('qr-link-display'),
            closeButton: document.getElementById('close-qr-modal-button')
        },

        skills: {
            modal: document.getElementById('skills-modal'),
            saveButton: document.getElementById('save-skills-modal-button'),
            listContainer: document.getElementById('skills-modal-list-container'),
            statusFilterContainer: document.getElementById('status-filter-container')
        },

        allViews: [
            document.getElementById('welcome-container'),
            document.getElementById('form-container'),
            document.getElementById('profile-view-container'),
            document.getElementById('feed-container'),
            document.getElementById('user-detail-container'),
            document.getElementById('settings-container'),
            document.getElementById('skills-modal'),
            document.getElementById('posts-feed-container'),
            document.getElementById('create-post-modal')
        ],
         skeletonTemplate: document.getElementById('skeleton-card-template')
    };

    // --- FIX: ВЫТАСКИВАЕМ МОДАЛКИ В КОРЕНЬ (ЧТОБЫ НЕ ПЕРЕКРЫВАЛИСЬ) ---
    // Это решает проблему, когда QR код или другие окна не открывались
    if (elements.qr.modal && elements.qr.modal.parentNode !== document.body) {
        document.body.appendChild(elements.qr.modal);
    }
    if (elements.postModal.modal && elements.postModal.modal.parentNode !== document.body) {
        document.body.appendChild(elements.postModal.modal);
    }

    async function setLanguage(lang, isInitialLoad = false) {
        lang = supportedLangs.includes(lang) ? lang : 'ru';
        state.currentLang = lang;
        localStorage.setItem('userLanguage', lang);
        await loadTranslations(lang);
        updateUIText();
        if (!isInitialLoad && state.currentUserProfile?.user_id) {
            try {
                await api.saveLanguagePreference(tg.initData, lang);
                state.currentUserProfile.language_code = lang;
            } catch (e) {
                console.warn("Failed to save lang", e);
            }
        }
    }

    function getInitialLanguage() {
        let lang = localStorage.getItem('userLanguage');
        if (lang && supportedLangs.includes(lang)) {
            return lang;
        }
        lang = tg.initDataUnsafe?.user?.language_code;
        if (lang) {
            lang = lang.split('-')[0];
            if (supportedLangs.includes(lang)) {
                return lang;
            }
        }
        return 'ru';
    }

    function updateUIText() {
        document.documentElement.lang = state.currentLang;
        
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.dataset.i18nKey;
            if (element.closest('template') || 
                element.id === 'profile-skills-toggle' || 
                element.id === 'detail-skills-toggle' || 
                element.id === 'show-qr-button') {
                return;
            }
            element.textContent = t(key);
        });
        
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            if (element.closest('template')) return;
            element.placeholder = t(element.dataset.i18nPlaceholder);
        });

        if (tg.MainButton.isVisible) {
            if (elements.formContainer.style.display === 'block') {
                tg.MainButton.setText(t('save_button'));
            } else if (elements.postModal.modal.style.display === 'block') {
                tg.MainButton.setText(t('publish'));
            }
        }
        
        document.title = t('my_profile');
        
        if (elements.settings.langBtnRu) elements.settings.langBtnRu.classList.toggle('active', state.currentLang === 'ru');
        if (elements.settings.langBtnEn) elements.settings.langBtnEn.classList.toggle('active', state.currentLang === 'en');
        
        if (elements.settings.controlBtnTaps) elements.settings.controlBtnTaps.textContent = t('control_mode_taps') || "Кнопки";
        if (elements.settings.controlBtnSwipes) elements.settings.controlBtnSwipes.textContent = t('control_mode_swipes') || "Жесты";

        [elements.profile.skillsToggleBtn, elements.detail.skillsToggleBtn].forEach(toggleButton => {
            if (toggleButton) {
                const textSpan = toggleButton.querySelector('span:not(.arrow)');
                if (textSpan) {
                    const isLess = toggleButton.classList.contains('less');
                    textSpan.textContent = t(isLess ? 'skills_show_less' : 'skills_show_more');
                }
            }
        });

        const updateSectionTitle = (containerId, titleKey) => {
            const container = document.getElementById(containerId);
            if (container) {
                const title = container.querySelector('.profile-section-title');
                if (title) title.textContent = t(titleKey);
            }
        };
        updateSectionTitle('profile-experience', 'experience_section_title');
        updateSectionTitle('profile-education', 'education_section_title');
        updateSectionTitle('detail-experience', 'experience_section_title');
        updateSectionTitle('detail-education', 'education_section_title');
        
        // Шаблоны
        [elements.form.linkTemplate, elements.form.experienceTemplate, elements.form.educationTemplate].forEach(template => {
            if (template) {
                template.content.querySelectorAll('[data-i18n-key]').forEach(el => el.textContent = t(el.dataset.i18nKey));
                template.content.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
            }
        });
        
        [elements.form.linksContainer, elements.form.experienceContainer, elements.form.educationContainer].forEach(container => {
            if (container) {
                container.querySelectorAll('[data-i18n-key]').forEach(el => el.textContent = t(el.dataset.i18nKey));
                container.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
            }
        });
    }

    async function loadProfileData() {
        UI.showSpinner(elements.spinner, elements.allViews);
        try {
            console.log("🔥 loadProfileData: start");
            const data = await api.loadProfileData(tg.initData);
            if (data.ok && data.profile.user_id) {
                state.currentUserProfile = data.profile;
                state.isRegistered = true;
                window.__CURRENT_USER_ID = data.profile.user_id;
                const savedLang = state.currentUserProfile.language_code;
                if (savedLang && savedLang !== state.currentLang && supportedLangs.includes(savedLang)) {
                    await setLanguage(savedLang, true);
                }
                
                applyTheme(
                    tg, 
                    t, 
                    elements.settings, 
                    state.currentUserProfile, 
                    state.currentUserProfile.theme || 'auto', 
                    state.currentUserProfile.custom_theme
                );
                
                const isGlassEnabled = !!state.currentUserProfile.is_glass_enabled;
                if (elements.settings.glassToggle) {
                    elements.settings.glassToggle.checked = isGlassEnabled;
                }
                
                const currentTheme = state.currentUserProfile.theme || 'auto';
                if (isGlassEnabled && (currentTheme === 'light' || currentTheme === 'dark')) {
                    applyGlass(true);
                } else if (isGlassEnabled) {
                    state.currentUserProfile.is_glass_enabled = false;
                    if (elements.settings.glassToggle) elements.settings.glassToggle.checked = false;
                    applyGlass(false);
                }

                elements.form.nameField.value = state.currentUserProfile.first_name || tg.initDataUnsafe?.user?.first_name || '';
                elements.form.bioField.value = state.currentUserProfile.bio || '';
                
                try {
                    const skills = state.currentUserProfile.skills ? JSON.parse(state.currentUserProfile.skills) : [];
                    elements.form.skillsField.value = skills.join(', ');
                } catch {
                    elements.form.skillsField.value = state.currentUserProfile.skills || '';
                }
                
                const profileLinks = [
                    state.currentUserProfile.link1, state.currentUserProfile.link2, state.currentUserProfile.link3, state.currentUserProfile.link4, state.currentUserProfile.link5
                ].filter(link => link);
                
                if (linksManager?.renderItems) linksManager.renderItems(profileLinks);
                if (experienceManager?.renderItems) experienceManager.renderItems(state.currentUserProfile.experience || []);
                if (educationManager?.renderItems) educationManager.renderItems(state.currentUserProfile.education || []);
                
                UI.showProfileView(state.currentUserProfile, elements.profile, state.CONFIG, t, (container, skills, btn) => UI.renderSkillTags(container, skills, btn, t));
                
                const headerImg = document.getElementById('header-avatar-img');
                if (headerImg && state.currentUserProfile?.photo_path) {
                    headerImg.src = `${state.CONFIG.backendUrl}/${state.currentUserProfile.photo_path}`;
                }

                UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
                
            } else {
                state.isRegistered = false;
                applyTheme(tg, t, elements.settings, state.currentUserProfile, 'auto');
                applyGlass(false);
                UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
            }
        } catch (error) {
            console.error("❌ Network error /get-profile:", error);
            UI.showToast(t('error_load_profile_network'), true);
            state.isRegistered = false;
            applyTheme(tg, t, elements.settings, state.currentUserProfile, 'auto');
            applyGlass(false);
            UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
        } finally {
            UI.hideSpinner(elements.spinner);
        }
    }

    async function loadTargetUserProfile(targetUserId) {
        UI.showSpinner(elements.spinner, elements.allViews); 
        try { 
            const data = await api.loadTargetUserProfile(tg.initData, targetUserId); 
            if (data.ok) { 
                state.currentViewedUserId = data.profile.user_id; 
                UI.showUserDetailView(data.profile, elements.detail, state.CONFIG, t, (container, skills, btn) => UI.renderSkillTags(container, skills, btn, t), state.currentUserProfile.user_id); 
                UI.showView(elements.userDetailContainer, elements.allViews, elements.spinner, tg, t, loadFeedData); 
            } else { 
                UI.showToast(t('error_profile_not_found'), true); 
                await loadProfileData(); 
            } 
        } catch (error) { 
            console.error(`❌ Error /get-user-by-id for ${targetUserId}:`, error); 
            UI.showToast(t('error_load_profile_generic'), true); 
            await loadProfileData(); 
        } finally { 
            UI.hideSpinner(elements.spinner); 
        }
    }

    async function saveProfileData() {
        tg.MainButton.showProgress();

        const listValidationErrorKey = validateDynamicLists();
        if (listValidationErrorKey) {
            tg.MainButton.hideProgress();
            UI.showToast(t(listValidationErrorKey), true);
            return; 
        }

        const formData = new FormData(); 
        formData.append('initData', tg.initData); 
        elements.form.nameField.classList.remove('input-shake'); 
        elements.form.bioField.classList.remove('input-shake');
        elements.form.skillsField.classList.remove('input-shake');
        
        const nameToSave = elements.form.nameField.value.trim(); 
        if (!nameToSave) { 
            tg.MainButton.hideProgress(); 
            UI.showToast(t('error_name_empty') || 'Введите имя', true); 
            elements.form.nameField.classList.add('input-shake'); 
            return; 
        } 

        const bioToSave = elements.form.bioField.value.trim();
        if (!bioToSave || bioToSave.length < 10) {
            tg.MainButton.hideProgress();
            UI.showToast('Напишите о себе хотя бы пару слов (мин. 10 символов)', true);
            elements.form.bioField.classList.add('input-shake');
            elements.form.bioField.focus();
            return;
        }

        const skillsValue = elements.form.skillsField.value.trim();
        if (!skillsValue) {
            tg.MainButton.hideProgress();
            UI.showToast('Выберите хотя бы один навык', true);
            elements.form.skillsField.classList.add('input-shake');
            return;
        }

        formData.append('first_name', nameToSave || tg.initDataUnsafe?.user?.first_name || ''); 
        formData.append('bio', elements.form.bioField.value.trim()); 
        const linksData = linksManager?.getItemsData ? linksManager.getItemsData() : []; 
        for (let i = 0; i < 5; i++) { formData.append(`link${i + 1}`, linksData[i] || ''); } 
        const experienceData = experienceManager?.getItemsData ? experienceManager.getItemsData() : []; 
        formData.append('experience', JSON.stringify(experienceData)); 
        const educationData = educationManager?.getItemsData ? educationManager.getItemsData() : []; 
        formData.append('education', JSON.stringify(educationData)); 
        const skillsArray = elements.form.skillsField.value.split(',').map(s => s.trim()).filter(s => s); 
        formData.append('skills', JSON.stringify(skillsArray)); 
        if (state.selectedFile) formData.append('photo', state.selectedFile); 
        formData.append('lang', state.currentLang);
        
        try { 
            const data = await api.saveProfileData(formData); 
            await loadProfileData();
            if (state.targetUserIdFromLink && state.isRegistered) { 
                await loadTargetUserProfile(state.targetUserIdFromLink); 
                state.targetUserIdFromLink = null; 
            } else if (state.isRegistered) { 
                UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
            } 
        } catch (error) { 
            console.error('Error saving profile:', error); 
            if (error && error.error === 'validation' && error.details) {
                const message = t(error.details.key, { limit: error.details.limit });
                UI.showToast(message, true);
            } else {
                UI.showToast(t('error_save_network'), true);
            }
        } finally { 
            tg.MainButton.hideProgress(); 
            state.selectedFile = null; 
        }
    }

    async function loadFeedData() {
        UI.showView(elements.feedContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
        elements.feed.searchInput.value = '';
        document.dispatchEvent(new CustomEvent('set-feed-mode', { detail: { skills: [] } }));
    }

    async function loadPostsFeedData() {
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { showMyPostsOnly: false, skills: [], status: null } }));
        elements.posts.searchInput.value = '';
        if (elements.posts.postsStatusFilterInput) elements.posts.postsStatusFilterInput.value = '';
        UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
    }

    async function loadMyPostsFeedData() {
        UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
        elements.posts.searchInput.value = '';
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { showMyPostsOnly: true } }));
    }

    function showCreatePostModal() {
        elements.postModal.typeSelect.value = 'looking';
        elements.postModal.contentField.value = '';
        elements.postModal.fullDescriptionField.value = '';
        elements.postModal.skillsField.value = '';
        if (elements.postModal.contentCounter) {
            const limit = state.VALIDATION_LIMITS?.post_content || 500;
            elements.postModal.contentField.maxLength = limit;
            elements.postModal.contentCounter.textContent = `0 / ${limit}`;
        }
        if (elements.postModal.fullDescriptionCounter) {
            const limit = state.VALIDATION_LIMITS?.post_full_description || 2000;
            elements.postModal.fullDescriptionField.maxLength = limit;
            elements.postModal.fullDescriptionCounter.textContent = `0 / ${limit}`;
        }
        UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
    }

    async function savePostData() {
        tg.MainButton.showProgress();
        const postData = {
            initData: tg.initData,
            post_type: elements.postModal.typeSelect.value,
            content: elements.postModal.contentField.value.trim(),
            full_description: elements.postModal.fullDescriptionField.value.trim(),
            skill_tags: elements.postModal.skillsField.value.split(',').map(s => s.trim()).filter(Boolean)
        };
        if (!postData.content) {
            tg.MainButton.hideProgress();
            UI.showToast(t('error_post_content_empty'), true);
            return;
        }
        try {
            const result = await api.createPost(postData);
            if (result.ok) {
                UI.showToast(t('post_created_success'), false);
                document.dispatchEvent(new CustomEvent('posts-updated'));
                loadPostsFeedData();
            } else {
                UI.showToast(t('error_save', {error: result.error || 'Unknown error'}), true);
            }
        } catch (error) {
            if (error && error.error === 'validation' && error.details) {
                const message = t(error.details.key, { limit: error.details.limit });
                UI.showToast(message, true);
            } else {
                UI.showToast(t('error_save_network'), true);
            }
        } finally {
            tg.MainButton.hideProgress();
        }
    }

    function validateDynamicLists() {
        const expItems = elements.form.experienceContainer.querySelectorAll('.dynamic-item');
        for (const item of expItems) {
            const jobTitle = item.querySelector('.experience-job-title')?.value.trim();
            const company = item.querySelector('.experience-company')?.value.trim();
            if ((jobTitle || company) && (!jobTitle || !company)) {
                return 'error_experience_incomplete';
            }
        }
        const eduItems = elements.form.educationContainer.querySelectorAll('.dynamic-item');
        for (const item of eduItems) {
            const institution = item.querySelector('.education-institution')?.value.trim();
            const degree = item.querySelector('.education-degree')?.value.trim();
            const fieldOfStudy = item.querySelector('.education-field-of-study')?.value.trim();
            const startDate = item.querySelector('.education-start-date')?.value.trim();
            const endDate = item.querySelector('.education-end-date')?.value.trim();
            const anyOtherFieldFilled = degree || fieldOfStudy || startDate || endDate;
            if (anyOtherFieldFilled && !institution) {
                return 'error_education_incomplete';
            }
        }
        return null;
    }

    async function loadReactIslands() {
        if (window.REACT_ISLANDS_LOADED) return;
        window.REACT_ISLANDS_LOADED = true;
        console.log("🔄 Начинаем СИНХРОННУЮ загрузку React-островков...");
        try {
            await loadScript('/js/react/feed/FeedApp.js?v=1.4');
            await loadScript('/js/react/posts/PostsApp.js?v=1.4');
            console.log("✅ Все React-островки успешно загружены.");
        } catch (e) {
            console.error("❌ КРИТИЧЕСКАЯ ОШИБКА при загрузке React-скриптов:", e);
            window.REACT_ISLANDS_LOADED = false;
            throw e;
        }
    }

    function loadScript(src, retries = 3) {
        console.log(`⏳ Загружается скрипт: ${src}`);
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.type = 'module';
            script.src = src;
            let attempts = 0;
            const tryLoad = () => {
                attempts++;
                script.onload = () => resolve();
                script.onerror = () => {
                    if (attempts < retries) {
                        setTimeout(() => {
                            document.body.removeChild(script);
                            const newScript = script.cloneNode();
                            newScript.onload = script.onload;
                            newScript.onerror = script.onerror;
                            document.body.appendChild(newScript);
                        }, 1000);
                    } else {
                        reject(new Error(`Failed to load script ${src}`));
                    }
                };
            };
            document.body.appendChild(script);
            tryLoad();
        });
    }

    // 1. Функция управления видимостью Хедера и Таббара
    const appHeader = document.getElementById('app-header');
    const appTabbar = document.getElementById('app-tabbar');
    const mainScroll = document.getElementById('main-scroll-container');

    const updateLayoutVisibility = (activeViewId) => {
        // 1. Хедер (Поиск) показываем ТОЛЬКО в лентах (People, Hub)
        const showHeader = (
            activeViewId === 'feed-container' || 
            activeViewId === 'posts-feed-container'
        );

        // 2. Таббар показываем в лентах И в профиле
        const showTabbar = (
            activeViewId === 'feed-container' || 
            activeViewId === 'posts-feed-container' || 
            activeViewId === 'profile-view-container'
        );

        // Применяем видимость
    if (appHeader) appHeader.style.display = showHeader ? 'flex' : 'none';
    if (appTabbar) appTabbar.style.display = showTabbar ? 'flex' : 'none';

    // 3. ИСПРАВЛЕННЫЙ РАСЧЕТ ОТСТУПА
    if (mainScroll) {
        if (showHeader && appHeader) {
            const headerHeight = appHeader.offsetHeight;
            mainScroll.style.paddingTop = (headerHeight + 10) + 'px';
        } else {
            mainScroll.style.paddingTop = 'calc(env(safe-area-inset-top, 20px) + 20px)';
        }
    }
    };

    // Перехватываем стандартный showView
    const originalShowView = UI.showView;
    UI.showView = function(target, allViews, spinner, tg, t, backAction) {
        originalShowView(target, allViews, spinner, tg, t, backAction);
        if (target) updateLayoutVisibility(target.id);
    };


    function setupEventListeners() {
        // --- 1. ОБНОВЛЕННАЯ ЛОГИКА ТАБОВ ---
        const tabPeople = document.getElementById('tab-people');
        const tabHub = document.getElementById('tab-hub');
        const tabProfile = document.getElementById('tab-profile');
        const mainScroll = document.getElementById('main-scroll-container');

        const resetTabs = () => {
            [tabPeople, tabHub, tabProfile].forEach(t => t?.classList.remove('active'));
        };

        const headerTitle = document.getElementById('header-title');

        if (tabPeople) {
            tabPeople.addEventListener('click', () => {
                resetTabs();
                tabPeople.classList.add('active');
                loadFeedData();
                if (headerTitle) headerTitle.textContent = 'People';
                if (mainScroll) mainScroll.scrollTop = 0;
            });
        }

        if (tabHub) {
            tabHub.addEventListener('click', () => {
                resetTabs();
                tabHub.classList.add('active');
                loadPostsFeedData();
                if (headerTitle) headerTitle.textContent = 'Hub';
                if (mainScroll) mainScroll.scrollTop = 0;
            });
        }

        if (tabProfile) {
            tabProfile.addEventListener('click', () => {
                resetTabs();
                tabProfile.classList.add('active');
                UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, null);
                if (headerTitle) headerTitle.textContent = t('profile_title');
            });
        }

        // --- 2. FAB MENU LOGIC ---
        const fabMain = document.getElementById('fab-main-trigger');
        const fabMenu = document.getElementById('fab-menu-container');
        const fabOverlay = document.getElementById('fab-menu-overlay');
        let isFabOpen = false;

        const toggleFabMenu = () => {
            isFabOpen = !isFabOpen;
            if (isFabOpen) {
                fabMenu.classList.add('open');
                fabOverlay.style.display = 'block';
                fabMain.classList.add('fab-rotate-active');
                fabMain.classList.remove('fab-rotate-reset');
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            } else {
                fabMenu.classList.remove('open');
                fabOverlay.style.display = 'none';
                fabMain.classList.remove('fab-rotate-active');
                fabMain.classList.add('fab-rotate-reset');
            }
        };

        if (fabMain) {
            fabMain.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFabMenu();
            });
        }

        if (fabOverlay) {
            fabOverlay.addEventListener('click', () => {
                if (isFabOpen) toggleFabMenu();
            });
        }

        // ДЕЙСТВИЯ FAB МЕНЮ
        const actionCreate = document.getElementById('fab-action-create');
        if (actionCreate) {
            actionCreate.addEventListener('click', () => {
                toggleFabMenu();
                showCreatePostModal();
            });
        }

        const actionMyPosts = document.getElementById('fab-action-my-posts');
        if (actionMyPosts) {
            actionMyPosts.addEventListener('click', () => {
                toggleFabMenu();
                if (tabHub) tabHub.click(); 
                loadMyPostsFeedData();
            });
        }

        const actionSaved = document.getElementById('fab-action-saved');
        if (actionSaved) {
            actionSaved.addEventListener('click', () => {
                toggleFabMenu();
                UI.showToast('Раздел "Сохраненное" в разработке', false);
            });
        }

        const actionSubs = document.getElementById('fab-action-subs');
        if (actionSubs) {
            actionSubs.addEventListener('click', () => {
                toggleFabMenu();
                UI.showToast('Раздел "Подписки" в разработке', false);
            });
        }


        // --- 3. QR И ШЕРИНГ ---
        if (elements.profile.showQrButton) {
            elements.profile.showQrButton.addEventListener('click', () => {
                if (!state.currentUserProfile) return;
                // QR модал теперь тоже в корне, будет виден
                UI.showQrCodeModal(elements.qr, state.CONFIG, state.currentUserProfile, t);
            });
        }
        if (elements.qr.closeButton) {
            elements.qr.closeButton.addEventListener('click', () => {
                elements.qr.modal.classList.remove('modal-overlay-animate');
                setTimeout(() => { elements.qr.modal.style.display = 'none'; }, 200);
            });
        }

        if (elements.profile.shareButton) {
            elements.profile.shareButton.addEventListener('click', () => {
                if (!state.currentUserProfile) return;
                const bot = state.CONFIG.botUsername;
                const app = state.CONFIG.appSlug;
                if (bot && app) {
                    const link = `https://t.me/${bot}/${app}?startapp=${state.currentUserProfile.user_id}`;
                    const text = t('share_profile_text', { name: state.currentUserProfile.first_name });
                    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
                    tg.openTelegramLink(url);
                } else {
                    UI.showToast(t('error_share_generic'), true);
                }
            });
        }

        // --- 4. ОСТАЛЬНЫЕ ХЕНДЛЕРЫ ---
        const globalSearchInput = document.getElementById('global-search-input');
        if (globalSearchInput) {
            globalSearchInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (tabHub && tabHub.classList.contains('active')) {
                    if (elements.posts.searchInput) {
                        elements.posts.searchInput.value = val;
                        elements.posts.searchInput.dispatchEvent(new Event('input'));
                    }
                } else {
                    if (elements.feed.searchInput) {
                        elements.feed.searchInput.value = val;
                        elements.feed.searchInput.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        const globalFilterBtn = document.getElementById('global-filter-btn');
        if (globalFilterBtn) {
            globalFilterBtn.addEventListener('click', () => {
                const isHub = tabHub && tabHub.classList.contains('active');
                const currentSearch = globalSearchInput ? globalSearchInput.value : '';
                const skills = currentSearch ? currentSearch.split(',').map(s => s.trim()).filter(Boolean) : [];

                if (isHub) {
                    document.dispatchEvent(new CustomEvent('openSkillsModal', { 
                        detail: { source: 'postsFeed', skills: skills } 
                    }));
                } else {
                    document.dispatchEvent(new CustomEvent('openSkillsModal', { 
                        detail: { source: 'feed', skills: skills } 
                    }));
                }
            });
        }

        // --- 5. КНОПКИ ОТКРЫТИЯ СКИЛЛОВ (ДОБАВЛЕНО ИСПРАВЛЕНИЕ ДЛЯ ПРОФИЛЯ) ---

        // Для модалки создания поста
        if (elements.postModal.openSkillsModalButton) {
            elements.postModal.openSkillsModalButton.addEventListener('click', () => {
                const currentVal = elements.postModal.skillsField.value || '';
                const currentSkills = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
                document.dispatchEvent(new CustomEvent('openSkillsModal', { detail: { source: 'postModal', skills: currentSkills } }));
            });
        }

        // ✅ ИСПРАВЛЕНО: Для формы редактирования профиля (этого не было)
        if (elements.form.openSkillsModalButton) {
            elements.form.openSkillsModalButton.addEventListener('click', () => {
                const currentVal = elements.form.skillsField.value || '';
                const currentSkills = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
                document.dispatchEvent(new CustomEvent('openSkillsModal', { detail: { source: 'form', skills: currentSkills } }));
            });
        }

        if (elements.postModal.contentField) {
            elements.postModal.contentField.addEventListener('input', () => {
                const limit = state.VALIDATION_LIMITS?.post_content || 500;
                if(elements.postModal.contentCounter) elements.postModal.contentCounter.textContent = `${elements.postModal.contentField.value.length} / ${limit}`;
            });
        }
        if (elements.postModal.fullDescriptionField) {
            elements.postModal.fullDescriptionField.addEventListener('input', () => {
                const limit = state.VALIDATION_LIMITS?.post_full_description || 2000;
                if(elements.postModal.fullDescriptionCounter) elements.postModal.fullDescriptionCounter.textContent = `${elements.postModal.fullDescriptionField.value.length} / ${limit}`;
            });
        }

        tg.MainButton.onClick(() => {
            if (elements.formContainer.style.display === 'block') {
                saveProfileData();
            } else if (elements.postModal.modal.style.display === 'block' || elements.postModal.modal.style.display === 'flex') {
                savePostData();
            }
        });

        // --- 6. МОДАЛКА СКИЛЛОВ (BRUTE FORCE REMOVE & CREATE) ---
        // Это гарантирует, что окно всегда будет поверх остальных (Z-index win)
        document.addEventListener('openSkillsModal', (event) => {
            console.log('🔵 openSkillsModal EVENT CAUGHT!', event.detail);

            try {
                const { source, skills } = event.detail;
                state.skillsModalSource = source;
                state.selectedSkills = Array.isArray(skills) ? [...skills] : [];

                // 1. УБИВАЕМ ЗОМБИ: Находим ВСЕ элементы с таким ID и удаляем их
                const zombies = document.querySelectorAll('#skills-modal');
                zombies.forEach(el => el.remove());

                console.log('💀 Zombies removed. Creating fresh modal...');

                // 2. Создаем чистую модалку
                const skillsModal = document.createElement('div');
                skillsModal.id = 'skills-modal';
                skillsModal.className = 'screen'; 
                skillsModal.style.display = 'none'; 
                
                skillsModal.innerHTML = `
                    <div class="form-header">
                        <h1 data-i18n-key="skills_modal_title">Навыки</h1>
                    </div>
                    <div id="status-filter-container" class="status-filter-group" style="display: none"></div>
                    <div id="skills-modal-list-container"></div>
                    <div class="fab-modal-save-container">
                        <button id="save-skills-modal-button" class="action-button fab-modal-save" data-i18n-key="select">Готово</button>
                    </div>
                `;
                
                // Вставляем В КОНЕЦ body, чтобы перекрыть все
                document.body.appendChild(skillsModal);

                // 3. ОБНОВЛЯЕМ ССЫЛКИ
                elements.skills.modal = skillsModal;
                elements.skills.listContainer = skillsModal.querySelector('#skills-modal-list-container');
                elements.skills.statusFilterContainer = skillsModal.querySelector('#status-filter-container');
                elements.skills.saveButton = skillsModal.querySelector('#save-skills-modal-button');

                if (elements.allViews) {
                    elements.allViews = elements.allViews.filter(v => v && v.id !== 'skills-modal');
                    elements.allViews.push(skillsModal);
                }

                // 4. ЛОГИКА ОТОБРАЖЕНИЯ ФИЛЬТРОВ
                const statusContainer = elements.skills.statusFilterContainer;
                if (statusContainer) {
                    if (source === 'postsFeed') {
                        statusContainer.style.display = 'block'; 
                        const currentStatus = elements.posts.postsStatusFilterInput 
                            ? elements.posts.postsStatusFilterInput.value 
                            : null;
                        
                        UI.renderStatusFilters(statusContainer, t, (statusObj) => {
                            const btns = statusContainer.querySelectorAll('.status-tag');
                            btns.forEach(b => {
                                if (b.dataset.status === statusObj.key) {
                                    b.classList.toggle('active');
                                } else {
                                    b.classList.remove('active');
                                }
                            });
                        }, currentStatus);
                    } else {
                        statusContainer.style.display = 'none';
                    }
                }

                // 5. ОПРЕДЕЛЯЕМ КНОПКУ "НАЗАД"
                let backAction = () => loadFeedData();
                if (source === 'postsFeed') backAction = () => loadPostsFeedData();
                else if (source === 'form') backAction = () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                else if (source === 'postModal') backAction = () => UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
                else if (source === 'editPostModal') backAction = () => document.dispatchEvent(new CustomEvent('skills-modal-canceled'));

                // 6. ПОКАЗЫВАЕМ
                requestAnimationFrame(() => {
                    UI.showView(skillsModal, elements.allViews, elements.spinner, tg, t, backAction);
                    skillsModal.style.display = 'flex';
                    skillsModal.classList.add('screen-fade-in');
                });

                // 7. РЕНДЕРИМ СПИСОК
                setTimeout(() => {
                    const container = elements.skills.listContainer;
                    if (!container || !SKILL_CATEGORIES) return;

                    const renderList = () => {
                        UI.renderSkillSelectionForm(
                            container,
                            state.selectedSkills,
                            SKILL_CATEGORIES,
                            t,
                            (skill) => {
                                if (state.selectedSkills.includes(skill)) {
                                    state.selectedSkills = state.selectedSkills.filter(s => s !== skill);
                                } else {
                                    state.selectedSkills.push(skill);
                                }
                                renderList();
                            }
                        );
                    };
                    renderList();
                }, 10);

            } catch (error) {
                console.error('❌ Error inside openSkillsModal:', error);
                UI.showToast('Ошибка интерфейса', true);
            }
        });

        // 7. СОХРАНЕНИЕ НАВЫКОВ (ДЕЛЕГИРОВАНИЕ)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'save-skills-modal-button') {
                e.preventDefault();
                e.stopPropagation();

                console.log('💾 Нажата кнопка Сохранить навыки. Источник:', state.skillsModalSource);

                if (state.skillsModalSource === 'postsFeed') {
                    const globalSearchInput = document.getElementById('global-search-input');
                    if (globalSearchInput) globalSearchInput.value = state.selectedSkills.join(', ');
                    
                    const postsSearchInput = document.getElementById('posts-search-input');
                    if (postsSearchInput) {
                        postsSearchInput.value = state.selectedSkills.join(', ');
                        postsSearchInput.dispatchEvent(new Event('input'));
                    }
                    
                    const statusContainer = document.getElementById('status-filter-container');
                    const activeStatusBtn = statusContainer ? statusContainer.querySelector('.status-tag.active') : null;
                    const status = activeStatusBtn ? activeStatusBtn.dataset.status : null;
                    
                    const postsStatusInput = document.getElementById('posts-status-filter-input');
                    if (postsStatusInput) {
                        postsStatusInput.value = status || '';
                    }

                    document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { skills: state.selectedSkills, status: status } }));
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                } 
                else if (state.skillsModalSource === 'feed') {
                    const globalSearchInput = document.getElementById('global-search-input');
                    if (globalSearchInput) globalSearchInput.value = state.selectedSkills.join(', ');
                    
                    const feedSearchInput = document.getElementById('feed-search-input');
                    if (feedSearchInput) {
                        feedSearchInput.value = state.selectedSkills.join(', ');
                        feedSearchInput.dispatchEvent(new Event('input'));
                    }
                    document.dispatchEvent(new CustomEvent('set-feed-mode', { detail: { skills: state.selectedSkills } }));
                    UI.showView(elements.feedContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                }
                else if (state.skillsModalSource === 'form') {
                    elements.form.skillsField.value = state.selectedSkills.join(', ');
                    tg.MainButton.show();
                    UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                }
                else if (state.skillsModalSource === 'postModal') {
                     elements.postModal.skillsField.value = state.selectedSkills.join(', ');
                    UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
                }
                else if (state.skillsModalSource === 'editPostModal') {
                    document.dispatchEvent(new CustomEvent('skills-updated-for-post', { detail: { skills: state.selectedSkills } }));
                    document.dispatchEvent(new CustomEvent('skills-modal-canceled'));
                }
            }
        });
        
        linksManager = setupDynamicList(tg, t, elements.form.addLinkButton, elements.form.linksContainer, elements.form.linkTemplate, 5);
        experienceManager = setupDynamicList(tg, t, elements.form.addExperienceButton, elements.form.experienceContainer, elements.form.experienceTemplate, 10);
        educationManager = setupDynamicList(tg, t, elements.form.addEducationButton, elements.form.educationContainer, elements.form.educationTemplate, 5);

        const welcomeCreateBtn = elements.welcomeContainer.querySelector('#create-profile-button');
        if(welcomeCreateBtn) {
            welcomeCreateBtn.addEventListener('click', () => {
                UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
            });
        }
        
        if (elements.profile.settingsButton) elements.profile.settingsButton.addEventListener('click', () => UI.showView(elements.settingsContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
        if (elements.profile.logoutButton) elements.profile.logoutButton.addEventListener('click', () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
        
        if (elements.settings.glassToggle) {
            elements.settings.glassToggle.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                state.currentUserProfile.is_glass_enabled = isEnabled;
                applyGlass(isEnabled);
                try { await api.saveGlassPreference(tg.initData, isEnabled); } catch (error) { console.error("Error saving glass preference:", error); }
            });
        }
        
        elements.settings.themeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', async () => {
                    const selectedTheme = button.dataset.theme;
                    if (!selectedTheme) return;
                    applyTheme(tg, t, elements.settings, state.currentUserProfile, selectedTheme, state.currentUserProfile.custom_theme);
                    state.currentUserProfile.theme = selectedTheme;
                    try { await api.saveThemeSelection(tg.initData, selectedTheme, state.currentLang); } catch (error) {}
                });
            }
        });
        
        if (elements.detail.fabContactButton) {
            elements.detail.fabContactButton.addEventListener('click', async () => {
                if (!state.currentViewedUserId) return;
                try {
                    const userInfo = await api.getTelegramUserInfo(tg.initData, state.currentViewedUserId);
                    if (userInfo.ok && userInfo.username) tg.openTelegramLink(`https://t.me/${userInfo.username}`);
                    else UI.showToast(t('error_open_chat_no_username'), true);
                } catch (error) { UI.showToast(t('error_open_chat_failed'), true); }
            });
        }

        const allInputs = document.querySelectorAll('input, textarea');
        const tabbar = document.getElementById('app-tabbar');
        
        const handleFocus = () => {
            if (tabbar) tabbar.classList.add('hide-on-keyboard');
        };
        const handleBlur = () => {
            if (tabbar) tabbar.classList.remove('hide-on-keyboard');
        };

        allInputs.forEach(input => {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('blur', handleBlur);
        });

        document.body.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                handleFocus();
            }
        });
        document.body.addEventListener('focusout', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                handleBlur();
            }
        });
        if (elements.detail.fabFollowButton) {
            elements.detail.fabFollowButton.addEventListener('click', async () => {
                if (!state.currentViewedUserId) return;
                const button = elements.detail.fabFollowButton;
                const isCurrentlyFollowing = button.classList.contains('is-unfollow'); 
                try {
                    const result = isCurrentlyFollowing ? await api.unfollowUser(tg.initData, state.currentViewedUserId) : await api.followUser(tg.initData, state.currentViewedUserId);
                    if (result.ok) {
                        button.classList.toggle('is-unfollow');
                        if (tg.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
                    }
                }
                 catch (e) {}
            });
        }
    }

    // --- ОБРАБОТКА ОФЛАЙНА ---
    function handleOffline() {
        UI.showToast('📡 Нет соединения с интернетом', true);
        if (tg.MainButton.isVisible) tg.MainButton.disable();
    }

    function handleOnline() {
        UI.showToast('🟢 Соединение восстановлено', false);
        if (tg.MainButton.isVisible) tg.MainButton.enable();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    if (!navigator.onLine) handleOffline();

    // --- ЗАПУСК ---
    async function main() {
        UI.showSpinner(elements.spinner, elements.allViews);
        try {
            const initialLang = getInitialLanguage();
            await setLanguage(initialLang, true);
            
            const configData = await api.loadConfig(); 
            state.CONFIG = configData; 
            state.CONFIG.backendUrl = state.CONFIG.backendUrl || window.location.origin; 
            api.setApiConfig(state.CONFIG);
            state.VALIDATION_LIMITS = configData.validationLimits || {};
            window.__CONFIG = state.CONFIG;
            window.__CONFIG.VALIDATION_LIMITS = state.VALIDATION_LIMITS; 

            await loadReactIslands(); 

            // Настройка лимитов UI
            const MAX_CONTENT = state.VALIDATION_LIMITS.post_content || 500;
            const MAX_FULL_DESC = state.VALIDATION_LIMITS.post_full_description || 2000;

            if (elements.postModal.contentField) {
                elements.postModal.contentField.maxLength = MAX_CONTENT;
                const oldC = elements.postModal.contentField.parentNode.querySelector('.char-counter');
                if(oldC) oldC.remove();
                const contentCounter = document.createElement('div');
                contentCounter.className = 'char-counter';
                elements.postModal.contentField.insertAdjacentElement('afterend', contentCounter);
                elements.postModal.contentCounter = contentCounter; 
            }

            if (elements.postModal.fullDescriptionField) {
                elements.postModal.fullDescriptionField.maxLength = MAX_FULL_DESC;
                const oldC = elements.postModal.fullDescriptionField.parentNode.querySelector('.char-counter');
                if(oldC) oldC.remove();
                const fullDescCounter = document.createElement('div');
                fullDescCounter.className = 'char-counter';
                elements.postModal.fullDescriptionField.insertAdjacentElement('afterend', fullDescCounter);
                elements.postModal.fullDescriptionCounter = fullDescCounter; 
            }
            
            setupEventListeners();
            state.targetUserIdFromLink = tg.initDataUnsafe?.start_param;
            
            await loadProfileData();
            
            const startParam = tg.initDataUnsafe?.start_param;
            
            if (startParam && state.isRegistered) {
                if (startParam.startsWith('p_')) {
                    const postId = startParam.replace('p_', '').trim();
                    const tabHub = document.getElementById('tab-hub');
                    if(tabHub) tabHub.click();
                    
                    try {
                        const postResult = await api.getPostById(tg.initData, postId);
                        if (postResult.ok && postResult.post) {
                            window.__DEEP_LINK_POST = postResult.post;
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent('open-deep-link-post', { detail: { post: postResult.post } }));
                            }, 500);
                        } else {
                            UI.showToast('Пост не найден', true);
                        }
                    } catch (e) { UI.showToast('Ошибка загрузки поста', true); }
                } else {
                    const targetUserId = startParam;
                    await loadFeedData();
                    try {
                        const userResult = await api.loadTargetUserProfile(tg.initData, targetUserId);
                        if (userResult.ok && userResult.profile) {
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent('open-deep-link-profile', { detail: { user: userResult.profile } }));
                            }, 500);
                        }
                    } catch (e) { UI.showToast(t('error_profile_not_found'), true); }
                }
                state.targetUserIdFromLink = null;
            } else if (startParam && !state.isRegistered) {
                UI.showToast(t('error_must_create_profile'), true);
                UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
            } else if (!state.isRegistered) {
                UI.showView(elements.welcomeContainer, elements.allViews, elements.spinner, tg, t, undefined);
            } else {
                loadFeedData();
            }

            function isMobileDevice() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }
            if (isMobileDevice() && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
                try { if (typeof tg.requestFullscreen === 'function') tg.requestFullscreen(); } catch (e) {}
            }

        } catch (error) {
            console.error('💥 CRITICAL ERROR:', error); 
            const fallbackError = "Ошибка загрузки."; 
            try { UI.showToast(t('error_critical', {error: error.message || fallbackError}), true); } catch {}
            UI.hideSpinner(elements.spinner); 
            UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
        }
    }

    main();
});