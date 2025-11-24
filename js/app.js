// js/app.js

import { loadTranslations, t, supportedLangs } from './i18n.js';
import { getLuminance, shadeColor } from './vanilla_utils.js'; 
import { applyTheme, updateThemeButtons, applyGlass } from './theme.js';
import * as api from './api.js';
import * as ui  from './ui-helpers.js?v=1.4';
const UI = ui;

import { state, SKILL_CATEGORIES } from './app-state.js';
import { setupDynamicList } from './app-form-helpers.js';

window.t = t;

window.REACT_FEED = true;

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
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', setScale);
    }
  } catch (e) {
    console.warn('initUiScale error', e);
  }
}

const tg = window.Telegram.WebApp;
tg.expand();
initUiScale(tg);

document.addEventListener('DOMContentLoaded', () => {

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
            followersCount: document.getElementById('profile-followers').querySelector('.stat-value'),
            followingCount: document.getElementById('profile-following').querySelector('.stat-value'),
            logoutButton: document.getElementById('logout-button'),
            shareButton: document.getElementById('share-button'),
            viewFeedButton: document.getElementById('view-feed-button'),
            viewPostsFeedButton: document.getElementById('view-posts-feed-button'),
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
            followersCount: document.getElementById('detail-followers').querySelector('.stat-value'),
            followingCount: document.getElementById('detail-following').querySelector('.stat-value'),
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
            if (element.closest('template') || element.id === 'profile-skills-toggle' || element.id === 'detail-skills-toggle' || element.id === 'show-qr-button') {
                return;
            }
            element.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            if (element.closest('template')) {
                return;
            }
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
        
        if (elements.skills.modal.style.display !== 'none') {
            UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, (skill) => {
                if (state.selectedSkills.includes(skill)) {
                    state.selectedSkills = state.selectedSkills.filter(s => s !== skill);
                } else {
                    state.selectedSkills.push(skill);
                }
                UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, arguments.callee);
            });
        }
        
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

    let linksManager, experienceManager, educationManager;

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

    function setupEventListeners() {
            document.addEventListener('show-my-posts', () => loadMyPostsFeedData());
            document.addEventListener('show-all-posts', () => {
                loadPostsFeedData(); 
                document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { showMyPostsOnly: false } }));
            });
            document.addEventListener('openCreatePostModal', () => showCreatePostModal());

        if (elements.postModal.contentField && elements.postModal.contentCounter) {
            elements.postModal.contentField.addEventListener('input', () => {
                const limit = state.VALIDATION_LIMITS?.post_content || 500;
                elements.postModal.contentCounter.textContent = `${elements.postModal.contentField.value.length} / ${limit}`;
            });
        }
        if (elements.postModal.fullDescriptionField && elements.postModal.fullDescriptionCounter) {
            elements.postModal.fullDescriptionField.addEventListener('input', () => {
                const limit = state.VALIDATION_LIMITS?.post_full_description || 2000;
                elements.postModal.fullDescriptionCounter.textContent = `${elements.postModal.fullDescriptionField.value.length} / ${limit}`;
            });
        }

        tg.MainButton.onClick(() => {
            if (elements.formContainer.style.display === 'block') {
                saveProfileData();
            } else if (elements.postModal.modal.style.display === 'block') {
                savePostData();
            }
        });

        let modalSelectedStatus = null; 

        document.addEventListener('openSkillsModal', (event) => {
            const { source, skills } = event.detail;
            state.skillsModalSource = source; 
            state.selectedSkills = [...skills];
            modalSelectedStatus = null;
            const statusContainer = elements.skills.statusFilterContainer;
            
            if (state.skillsModalSource === 'postsFeed' || state.skillsModalSource === 'editPostModal') {
                let currentStatusKey = null;
                if (state.skillsModalSource === 'postsFeed') {
                    // ✅ БЕРЕМ АКТУАЛЬНЫЙ СТАТУС ИЗ ИНПУТА
                    currentStatusKey = elements.posts.postsStatusFilterInput ? elements.posts.postsStatusFilterInput.value : null;
                    statusContainer.style.display = 'block';
                } else {
                    statusContainer.style.display = 'none';
                }

                const statuses = [
                    { key: 'looking', text: t('post_type_looking') },
                    { key: 'offering', text: t('post_type_offering') },
                    { key: 'showcase', text: t('post_type_showcase') }
                ];
                if (currentStatusKey) {
                    modalSelectedStatus = statuses.find(s => s.key === currentStatusKey) || null;
                }
                const statusToggleCallback = (status) => {
                    if (modalSelectedStatus && modalSelectedStatus.key === status.key) {
                        modalSelectedStatus = null;
                    } else {
                        modalSelectedStatus = status;
                    }
                    UI.renderStatusFilters(statusContainer, t, statusToggleCallback, modalSelectedStatus ? modalSelectedStatus.key : null);
                };
                UI.renderStatusFilters(statusContainer, t, statusToggleCallback, modalSelectedStatus ? modalSelectedStatus.key : null);
            } else {
                statusContainer.style.display = 'none';
            }
            
            function onToggleSkillInModal(skill) {
                if (state.selectedSkills.includes(skill)) {
                    state.selectedSkills = state.selectedSkills.filter(s => s !== skill);
                } else {
                    state.selectedSkills.push(skill);
                }
                UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInModal);
            }
            UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInModal);
            
            elements.skills.modal.classList.remove('screen-fade-in');
            
            let onBackAction;
            if (state.skillsModalSource === 'form') {
                onBackAction = () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
            } else if (state.skillsModalSource === 'postModal') {
                onBackAction = () => UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
            } else if (state.skillsModalSource === 'feed') {
                onBackAction = loadFeedData;
            } else if (state.skillsModalSource === 'postsFeed') {
                onBackAction = () => {
                     UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                };
            } else if (state.skillsModalSource === 'editPostModal') {
                onBackAction = () => {
                    document.dispatchEvent(new CustomEvent('skills-modal-canceled'));
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                }; 
            } else {
                onBackAction = loadProfileData;
            }
            UI.showView(elements.skillsModal, elements.allViews, elements.spinner, tg, t, onBackAction);
        });

        linksManager = setupDynamicList(tg, t, elements.form.addLinkButton, elements.form.linksContainer, elements.form.linkTemplate, 5);
        experienceManager = setupDynamicList(tg, t, elements.form.addExperienceButton, elements.form.experienceContainer, elements.form.experienceTemplate, 10);
        educationManager = setupDynamicList(tg, t, elements.form.addEducationButton, elements.form.educationContainer, elements.form.educationTemplate, 5);

        elements.welcomeContainer.querySelector('#create-profile-button').addEventListener('click', () => {
            elements.form.nameField.value = tg.initDataUnsafe?.user?.first_name || t('default_user_name');
            elements.form.bioField.value = '';
            elements.form.skillsField.value = '';
            const previewImg = elements.form.avatarPreview;
            previewImg.src = 'https://t.me/i/userpic/320/null.jpg';
            UI.initAvatarFader(previewImg);
            state.selectedFile = null;
            if (linksManager?.renderItems) linksManager.renderItems([]);
            if (experienceManager?.renderItems) experienceManager.renderItems([]);
            if (educationManager?.renderItems) educationManager.renderItems([]);
            UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
        });

        if (elements.profile.viewFeedButton) elements.profile.viewFeedButton.addEventListener('click', loadFeedData);
        if (elements.profile.viewPostsFeedButton) elements.profile.viewPostsFeedButton.addEventListener('click', loadPostsFeedData);
        if (elements.profile.logoutButton) elements.profile.logoutButton.addEventListener('click', () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
        if (elements.detail.headerActionsButton) elements.detail.headerActionsButton.addEventListener('click', () => UI.showToast(t('actions_menu_placeholder', {defaultValue: "Меню действий (Пожаловаться и т.д.) в разработке."})));
        
        if (elements.detail.fabContactButton) {
            elements.detail.fabContactButton.addEventListener('click', async () => {
                if (!state.currentViewedUserId) return;
                try {
                    const userInfo = await api.getTelegramUserInfo(tg.initData, state.currentViewedUserId);
                    if (userInfo.ok && userInfo.username) {
                        tg.openTelegramLink(`https://t.me/${userInfo.username}`);
                    } else {
                        UI.showToast(t('error_open_chat_no_username'), true);
                    }
                } catch (error) {
                    console.error('Error opening chat:', error);
                    UI.showToast(t('error_open_chat_failed'), true);
                }
            });
        }

        if (elements.detail.fabFollowButton) {
            elements.detail.fabFollowButton.addEventListener('click', async () => {
                if (!state.currentViewedUserId) return;
                const button = elements.detail.fabFollowButton;
                const isCurrentlyFollowing = button.classList.contains('is-unfollow'); 
                const iconFollow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>`;
                const iconUnfollow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
                button.classList.toggle('is-unfollow');
                button.innerHTML = isCurrentlyFollowing ? iconFollow : iconUnfollow;
                button.title = t(isCurrentlyFollowing ? 'follow_button' : 'unfollow_button');
                try {
                    let result;
                    if (isCurrentlyFollowing) {
                        result = await api.unfollowUser(tg.initData, state.currentViewedUserId);
                    } else {
                        result = await api.followUser(tg.initData, state.currentViewedUserId);
                    }
                    if (!result.ok) throw new Error(result.error || 'Follow/unfollow failed');
                    if (tg.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
                } catch (error) {
                    console.error('Follow/Unfollow error:', error);
                    UI.showToast(t('error_follow_generic'), true);
                    button.classList.toggle('is-unfollow');
                    button.innerHTML = isCurrentlyFollowing ? iconUnfollow : iconFollow;
                    button.title = t(isCurrentlyFollowing ? 'unfollow_button' : 'follow_button');
                }
            });
        }
        
        if (elements.profile.settingsButton) elements.profile.settingsButton.addEventListener('click', () => UI.showView(elements.settingsContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
        if (elements.settings.langBtnRu) elements.settings.langBtnRu.addEventListener('click', () => setLanguage('ru'));
        if (elements.settings.langBtnEn) elements.settings.langBtnEn.addEventListener('click', () => setLanguage('en'));
        
        if (elements.settings.glassToggle) {
            elements.settings.glassToggle.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                const currentTheme = state.currentUserProfile.theme || 'auto';
                if (isEnabled && (currentTheme === 'auto' || currentTheme === 'custom')) {
                    e.target.checked = false;
                    if (elements.settings.glassToggleWrapper) {
                        elements.settings.glassToggleWrapper.classList.add('input-shake');
                        setTimeout(() => elements.settings.glassToggleWrapper.classList.remove('input-shake'), 600);
                    }
                    UI.showToast(t('glass_mode_error'), true);
                    return;
                }
                state.currentUserProfile.is_glass_enabled = isEnabled;
                applyGlass(isEnabled);
                try { await api.saveGlassPreference(tg.initData, isEnabled); } catch (error) { console.error("Error saving glass preference:", error); }
            });
        }

        if (elements.settings.controlBtnTaps && elements.settings.controlBtnSwipes) {
            const currentMode = localStorage.getItem('control_mode') || 'taps';
            elements.settings.controlBtnTaps.classList.toggle('active', currentMode === 'taps');
            elements.settings.controlBtnSwipes.classList.toggle('active', currentMode === 'swipes');

            const updateControlMode = (newMode) => {
                if (newMode === localStorage.getItem('control_mode')) return;
                
                localStorage.setItem('control_mode', newMode);
                
                elements.settings.controlBtnTaps.classList.toggle('active', newMode === 'taps');
                elements.settings.controlBtnSwipes.classList.toggle('active', newMode === 'swipes');
                
                window.dispatchEvent(new Event('control-mode-changed'));
                
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
            };

            elements.settings.controlBtnTaps.addEventListener('click', () => updateControlMode('taps'));
            elements.settings.controlBtnSwipes.addEventListener('click', () => updateControlMode('swipes'));
        }
        
        elements.settings.themeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', async () => {
                    const selectedTheme = button.dataset.theme;
                    if (!selectedTheme) return;
                    applyTheme(tg, t, elements.settings, state.currentUserProfile, selectedTheme, state.currentUserProfile.custom_theme);
                    state.currentUserProfile.theme = selectedTheme;
                    if (selectedTheme === 'auto' || selectedTheme === 'custom') {
                        if (elements.settings.glassToggle.checked) {
                            elements.settings.glassToggle.checked = false;
                            state.currentUserProfile.is_glass_enabled = false;
                            applyGlass(false);
                            try { await api.saveGlassPreference(tg.initData, false); } catch (error) { console.warn("Failed to auto-save glass preference:", error); }
                        }
                    }
                    if (selectedTheme !== 'custom') {
                        try { await api.saveThemeSelection(tg.initData, selectedTheme, state.currentLang); } catch (error) { UI.showToast(t('error_theme_save'), true); }
                    } else {
                        try { await api.activateCustomTheme(tg.initData, state.currentLang); } catch (error) { UI.showToast(t('error_theme_save'), true); }
                    }
                });
            }
        });

        if (elements.settings.saveCustomThemeButton) {
            elements.settings.saveCustomThemeButton.addEventListener('click', async () => {
                const customColors = { bg: elements.settings.colorInputBg.value, button: elements.settings.colorInputButton.value, text: elements.settings.colorInputText.value };
                applyTheme(tg, t, elements.settings, state.currentUserProfile, 'custom', JSON.stringify(customColors));
                try {
                    const result = await api.saveCustomTheme(tg.initData, customColors, state.currentLang);
                    if (result.ok) {
                        state.currentUserProfile.custom_theme = JSON.stringify(customColors);
                        state.currentUserProfile.theme = 'custom';
                        UI.showToast(t('theme_custom_saved_success'), false);
                    } else { throw new Error(result.error || 'Unknown error'); }
                } catch (error) { UI.showToast(t('error_theme_save'), true); applyTheme(tg, t, elements.settings, state.currentUserProfile, state.currentUserProfile.theme || 'auto', state.currentUserProfile.custom_theme); }
            });
        }
        if (elements.profile.shareButton) {
            elements.profile.shareButton.addEventListener('click', () => {
                if (!state.CONFIG.botUsername || !state.CONFIG.appSlug || !state.currentUserProfile.user_id) { UI.showToast(t('error_share_generic'), true); return; }
                const shareUrl = `https://t.me/${state.CONFIG.botUsername}/${state.CONFIG.appSlug}?startapp=${state.currentUserProfile.user_id}`;
                const text = t('share_text', { name: state.currentUserProfile.first_name || 'User' }); 
                tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`);
            });
        }
        if (elements.profile.showQrButton) elements.profile.showQrButton.addEventListener('click', () => { state.qrCodeInstance = UI.showQrCodeModal(elements.qr, state.CONFIG, state.currentUserProfile, t); });
        if (elements.qr.closeButton) elements.qr.closeButton.addEventListener('click', () => { elements.qr.modal.style.display = 'none'; });
        if (elements.qr.modal) elements.qr.modal.addEventListener('click', (event) => { if (event.target === elements.qr.modal) { elements.qr.modal.style.display = 'none'; }});
        [elements.form.nameField, elements.form.bioField, elements.form.skillsField].forEach(el => { if (el) el.addEventListener('input', () => tg.MainButton.show()); });
        if (elements.form.photoInput) {
        elements.form.photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                if (!['image/jpeg', 'image/png'].includes(file.type)) { UI.showToast(t('error_photo_type'), true); return; }
                if (file.size > 5 * 1024 * 1024) { UI.showToast(t('error_photo_size'), true); return; }
                state.selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => { elements.form.avatarPreview.src = e.target.result; UI.initAvatarFader(elements.form.avatarPreview); }
                reader.readAsDataURL(file);
                tg.MainButton.show();
            }
        });
    }
        if (elements.feed.searchInput) elements.feed.searchInput.addEventListener('input', () => { });
        if (elements.posts.searchInput) elements.posts.searchInput.addEventListener('input', () => { });
        if (elements.form.openSkillsModalButton) {
            elements.form.openSkillsModalButton.addEventListener('click', () => {
                state.skillsModalSource = 'form';
                
                if (elements.skills.statusFilterContainer) {
                    elements.skills.statusFilterContainer.style.display = 'none';
                }

                const currentSkills = elements.form.skillsField.value.split(',').map(s => s.trim()).filter(s => s);
                state.selectedSkills = [...currentSkills];
                function onToggleSkillInFormModal(skill) {
                    if (state.selectedSkills.includes(skill)) { state.selectedSkills = state.selectedSkills.filter(s => s !== skill); } else { state.selectedSkills.push(skill); }
                    UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInFormModal);
                }
                UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInFormModal);
                elements.skills.modal.classList.remove('screen-fade-in');
                UI.showView(elements.skillsModal, elements.allViews, elements.spinner, tg, t, () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
            });
        }

        if (elements.postModal.openSkillsModalButton && elements.skills.modal && elements.skills.listContainer) {
        elements.postModal.openSkillsModalButton.addEventListener('click', () => {
            state.skillsModalSource = 'postModal';
            const currentSkills = elements.postModal.skillsField.value.split(',').map((s) => s.trim()).filter((s) => s);
            state.selectedSkills = [...currentSkills];
            function onToggleSkillInPostModal(skill) {
            if (state.selectedSkills.includes(skill)) { state.selectedSkills = state.selectedSkills.filter((s) => s !== skill); } else { state.selectedSkills.push(skill); }
            UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInPostModal);
            }
            UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, onToggleSkillInPostModal);
            elements.skills.modal.classList.remove('screen-fade-in');
            const onBackAction = () => { UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData); };
            UI.showView(elements.skillsModal, elements.allViews, elements.spinner, tg, t, onBackAction);
        });
        }

        // ✅ ДОБАВЛЕНО: Слушатель для кнопки фильтров в ЛЕНТЕ ЗАПРОСОВ
        if (elements.posts.openSkillsModalButton) {
            elements.posts.openSkillsModalButton.addEventListener('click', () => {
                // Пытаемся получить текущие навыки из поисковой строки (как запасной вариант)
                const currentSearchVal = elements.posts.searchInput ? elements.posts.searchInput.value : '';
                const skillsFromInput = currentSearchVal.split(',').map(s => s.trim()).filter(Boolean);
                
                document.dispatchEvent(new CustomEvent('openSkillsModal', { 
                    detail: { 
                        source: 'postsFeed', 
                        skills: skillsFromInput 
                    } 
                }));
            });
        }

        if (elements.feed.openSkillsModalButtonFeed) {
            elements.feed.openSkillsModalButtonFeed.addEventListener('click', () => {
                const skills = Array.isArray(state.selectedSkills) ? state.selectedSkills : [];
                document.dispatchEvent(new CustomEvent('openSkillsModal', { detail: { source: 'feed', skills } }));
            });
        }
        
        if (elements.postModal.saveButton) elements.postModal.saveButton.addEventListener('click', () => savePostData());
        
        if (elements.skills.saveButton) {
            elements.skills.saveButton.addEventListener('click', () => {
                if (state.skillsModalSource === 'form') {
                    elements.form.skillsField.value = state.selectedSkills.join(', ');
                    tg.MainButton.show();
                    UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                } else if (state.skillsModalSource === 'postModal') {
                     elements.postModal.skillsField.value = state.selectedSkills.join(', ');
                    UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
                } else if (state.skillsModalSource === 'feed') {
                   document.dispatchEvent(new CustomEvent('set-feed-mode', { detail: { skills: state.selectedSkills } }));
                   UI.showView(elements.feedContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                } else if (state.skillsModalSource === 'postsFeed') {
                    const status = modalSelectedStatus ? modalSelectedStatus.key : null;
                    
                    // ✅ ИСПРАВЛЕНО: Обновляем скрытый инпут статуса, чтобы модалка "запомнила" его
                    if (elements.posts.postsStatusFilterInput) {
                        elements.posts.postsStatusFilterInput.value = status || '';
                    }
                    
                    // ✅ ИСПРАВЛЕНО: Обновляем поисковую строку, чтобы пользователь видел выбранные навыки
                    if (elements.posts.searchInput) {
                        elements.posts.searchInput.value = state.selectedSkills.join(', ');
                    }

                    document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { skills: state.selectedSkills, status: status } }));
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                } else if (state.skillsModalSource === 'editPostModal') {
                    document.dispatchEvent(new CustomEvent('skills-updated-for-post', { detail: { skills: state.selectedSkills } }));
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                } else {
                    UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                }
            });
        }
    }

    // --- ОБРАБОТКА ОФЛАЙНА ---
    function handleOffline() {
        UI.showToast('📡 Нет соединения с интернетом', true); // true = красный/ошибка
        // Опционально: заблокировать MainButton
        if (tg.MainButton.isVisible) tg.MainButton.disable();
    }

    function handleOnline() {
        UI.showToast('🟢 Соединение восстановлено', false); // false = обычный/успех
        if (tg.MainButton.isVisible) tg.MainButton.enable();
        
        // Если мы были в ленте, можно попробовать перезагрузить данные
        // if (state.activeTab === 'feed') loadFeedData(); 
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Проверка при запуске
    if (!navigator.onLine) {
        handleOffline();
    }

    async function main() {
    UI.showSpinner(elements.spinner, elements.allViews);
    try {
        const initialLang = getInitialLanguage();
        await setLanguage(initialLang, true);
        console.log("⏳ Загрузка конфига..."); 
        const configData = await api.loadConfig(); 
        state.CONFIG = configData; 
        state.CONFIG.backendUrl = state.CONFIG.backendUrl || window.location.origin; 
        api.setApiConfig(state.CONFIG);
        state.VALIDATION_LIMITS = configData.validationLimits || {};
        window.__CONFIG = state.CONFIG;
        window.__CONFIG.VALIDATION_LIMITS = state.VALIDATION_LIMITS; 
        console.log("⏳ Загрузка React-островков...");
        await loadReactIslands(); 

        const MAX_CONTENT = state.VALIDATION_LIMITS.post_content || 500;
        const MAX_FULL_DESC = state.VALIDATION_LIMITS.post_full_description || 2000;

        if (elements.postModal.contentField) {
            elements.postModal.contentField.maxLength = MAX_CONTENT;
            const contentCounter = document.createElement('div');
            contentCounter.className = 'char-counter';
            elements.postModal.contentField.insertAdjacentElement('afterend', contentCounter);
            elements.postModal.contentCounter = contentCounter; 
        }

        if (elements.postModal.fullDescriptionField) {
            elements.postModal.fullDescriptionField.maxLength = MAX_FULL_DESC;
            const fullDescCounter = document.createElement('div');
            fullDescCounter.className = 'char-counter';
            elements.postModal.fullDescriptionField.insertAdjacentElement('afterend', fullDescCounter);
            elements.postModal.fullDescriptionCounter = fullDescCounter; 
        }
        setupEventListeners();
        state.targetUserIdFromLink = tg.initDataUnsafe?.start_param;
        console.log("⏳ Загрузка профиля...");
        await loadProfileData();
        
        // === ЛОГИКА DEEP LINKS (ROUTING) ===
        const startParam = tg.initDataUnsafe?.start_param;
        
        if (startParam && state.isRegistered) {
            console.log("🔗 Deep Link detected:", startParam);
            
            // СЦЕНАРИЙ 1: Ссылка на ПОСТ (p_123)
            if (startParam.startsWith('p_')) {
                // trim() убирает лишние пробелы
                const postId = startParam.replace('p_', '').trim();
                
                // 1. Грузим Ленту Постов (фон)
                await loadPostsFeedData();
                
                try {
                    // 2. Грузим данные поста
                    const postResult = await api.getPostById(tg.initData, postId);
                   if (postResult.ok && postResult.post) {
                        console.log("✅ Post loaded:", postResult.post.post_id);
                        
                        // 1. Сохраняем пост в глобальную переменную (Надежный способ)
                        // React проверит её при загрузке
                        window.__DEEP_LINK_POST = postResult.post;

                        // 2. На всякий случай кидаем событие (если React уже был загружен)
                        setTimeout(() => {
                            document.dispatchEvent(new CustomEvent('open-deep-link-post', { 
                                detail: { post: postResult.post } 
                            }));
                        }, 500);
                    } else {
                        UI.showToast('Пост не найден или удален', true);
                    }
                } catch (e) {
                    console.error("Deep link post error:", e);
                    UI.showToast('Не удалось загрузить пост по ссылке', true);
                }
            } 
            // СЦЕНАРИЙ 2: Ссылка на ПРОФИЛЬ (просто ID)
            else {
                const targetUserId = startParam;
                
                // 1. Грузим Ленту Людей (фон) - ВМЕСТО отдельного экрана
                await loadFeedData();
                
                try {
                    // 2. Грузим данные пользователя
                    const userResult = await api.loadTargetUserProfile(tg.initData, targetUserId);
                    if (userResult.ok && userResult.profile) {
                        // 3. Ждем React и открываем Шторку
                        setTimeout(() => {
                            document.dispatchEvent(new CustomEvent('open-deep-link-profile', { 
                                detail: { user: userResult.profile } 
                            }));
                        }, 500);
                    } else {
                        UI.showToast(t('error_profile_not_found'), true);
                    }
                } catch (e) {
                    console.error("Deep link profile error:", e);
                    UI.showToast(t('error_load_profile_generic'), true);
                }
            }
            
            // Сбрасываем, чтобы при релоаде не открывалось снова
            state.targetUserIdFromLink = null;
        }
        // Обработка незарегистрированных (оставляем как было)
        else if (startParam && !state.isRegistered) { 
            UI.showToast(t('error_must_create_profile'), true);
            UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData); 
            state.targetUserIdFromLink = null; 
        }
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        if (isMobileDevice() && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
            try {
                if (typeof tg.requestFullscreen === 'function') {
                    await tg.requestFullscreen();
                        setTimeout(() => {
                        const screens = document.querySelectorAll('.screen');
                        screens.forEach(screen => {
                            screen.style.paddingTop = '60px';
                        });
                    }, 300);
                }
            } catch (e) {
                console.warn('⚠️ Fullscreen недоступен:', e);
            }
        }
    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в main:', error); 
        const fallbackError = "Не удалось загрузить приложение."; 
        try { UI.showToast(t('error_critical', {error: error.message || fallbackError}), true); } catch { alert(`Критическая ошибка: ${error.message || fallbackError}`); }
        UI.hideSpinner(elements.spinner); 
            UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, undefined);
    }
}
    main();
});