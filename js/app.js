// js/app.js

import { loadTranslations, t, supportedLangs } from './i18n.js';
import { applyTheme, applyGlass } from './theme.js';
import * as api from './api.js';

import * as uiRaw from './ui-helpers.js?v=1.6';
const UI = { ...uiRaw }; 
window.UI = UI;

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
            openSkillsModalButton: document.getElementById('select-post-skills-button'),
            expContainer: document.getElementById('post-experience-container'),
            expInput: document.getElementById('post-experience-input')
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

    if (elements.qr.modal && elements.qr.modal.parentNode !== document.body) {
        document.body.appendChild(elements.qr.modal);
    }
    if (elements.postModal.modal && elements.postModal.modal.parentNode !== document.body) {
        document.body.appendChild(elements.postModal.modal);
    }

    // ==========================================================
    // 🔥 NEW SKILLS MANAGER (SINGLETON)
    // ==========================================================
    const SkillsManager = {
        elements: {
            modal: document.getElementById('skills-modal'),
            listContainer: document.getElementById('skills-modal-list-container'),
            statusContainer: document.getElementById('skills-modal-status-container'),
            saveButton: document.getElementById('save-skills-modal-button')
        },
        state: {
            selectedSkills: [],
            selectedStatus: null,
            resolvePromise: null, 
            renderStatus: false,
            returnToId: null
        },

        init() {
            if (!this.elements.modal) return;
            
            if (this.elements.saveButton) {
                const newBtn = this.elements.saveButton.cloneNode(true);
                this.elements.saveButton.parentNode.replaceChild(newBtn, this.elements.saveButton);
                this.elements.saveButton = newBtn;
                
                this.elements.saveButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleSave();
                });
            }
            window.SkillsManager = this;
            console.log("✅ SkillsManager initialized");
        },

        select(initialSkills = [], options = {}) {
            return new Promise((resolve) => {
                if (this.state.resolvePromise) this.state.resolvePromise(null);
                
                this.state.resolvePromise = resolve;
                this.state.selectedSkills = [...(Array.isArray(initialSkills) ? initialSkills : [])];
                this.state.selectedStatus = options.initialStatus || null;
                this.state.renderStatus = !!options.showStatus;
                this.state.returnToId = options.returnTo || null;

                this.render();

                UI.showView(this.elements.modal, elements.allViews, elements.spinner, tg, t, () => {
                    this.handleCancel();
                });
            });
        },

        render() {
            const categories = SKILL_CATEGORIES || {};
            
            if (this.elements.listContainer) {
                UI.renderSkillSelectionForm(
                    this.elements.listContainer,
                    this.state.selectedSkills,
                    categories, 
                    t,
                    (skill) => {
                        if (this.state.selectedSkills.includes(skill)) {
                            this.state.selectedSkills = this.state.selectedSkills.filter(s => s !== skill);
                        } else {
                            this.state.selectedSkills.push(skill);
                        }
                    }
                );
            }

            if (this.elements.statusContainer) {
                if (this.state.renderStatus) {
                    this.elements.statusContainer.style.display = 'block';
                    UI.renderStatusFilters(
                        this.elements.statusContainer,
                        this.state.selectedStatus,
                        t,
                        (status) => { this.state.selectedStatus = status; }
                    );
                } else {
                    this.elements.statusContainer.style.display = 'none';
                }
            }
        },

        restorePreviousView() {
            this.elements.modal.style.display = 'none';
            if (this.state.returnToId) {
                const target = document.getElementById(this.state.returnToId);
                if (target) {
                    let backAction = null;
                    if (this.state.returnToId === 'create-post-modal') {
                        backAction = loadPostsFeedData;
                    } else if (this.state.returnToId === 'form-container') {
                        backAction = loadProfileData;
                    }
                    UI.showView(target, elements.allViews, elements.spinner, tg, t, backAction);
                }
            }
        },

        handleSave() {
            if (this.state.resolvePromise) {
                this.state.resolvePromise({
                    skills: this.state.selectedSkills,
                    status: this.state.selectedStatus
                });
                this.state.resolvePromise = null;
            }
            this.restorePreviousView();
        },

        handleCancel() {
            if (this.state.resolvePromise) {
                this.state.resolvePromise(null);
                this.state.resolvePromise = null;
            }
            this.restorePreviousView();
            document.dispatchEvent(new CustomEvent('skills-modal-canceled'));
        }
    };

    SkillsManager.init();


    async function setLanguage(lang, isInitialLoad = false) {
        lang = supportedLangs.includes(lang) ? lang : 'ru';
        state.currentLang = lang;
        localStorage.setItem('userLanguage', lang);

        await loadTranslations(lang);
        updateUIText();

        // 🔹 сообщаем React-компонентам, что язык сменился
        document.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));

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
                  // 🔔 Сообщаем React-профилю, что профиль обновился
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                    new CustomEvent('profile-updated', {
                        detail: { profile: state.currentUserProfile },
                    })
                    );
                }
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
        UI.showView(elements.feedContainer, elements.allViews, elements.spinner, tg, t, null);
        elements.feed.searchInput.value = '';
        document.dispatchEvent(new CustomEvent('set-feed-mode', { detail: { skills: [] } }));
    }

    async function loadPostsFeedData() {
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { showMyPostsOnly: false, skills: [], status: null } }));
        elements.posts.searchInput.value = '';
        if (elements.posts.postsStatusFilterInput) elements.posts.postsStatusFilterInput.value = '';
        UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, null);
    }

    async function loadMyPostsFeedData() {
        UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
        
        elements.posts.searchInput.value = '';
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', { detail: { showMyPostsOnly: true } }));
    }

    function showCreatePostModal() {
        // Сброс полей
        elements.postModal.typeSelect.value = 'looking';
        elements.postModal.contentField.value = '';
        elements.postModal.fullDescriptionField.value = '';
        elements.postModal.skillsField.value = '';
        
        // --- 🔥 НОВАЯ ЛОГИКА: Отрисовка кнопок опыта ---
        if (elements.postModal.expInput) elements.postModal.expInput.value = ''; // Сбрасываем значение
        
        if (elements.postModal.expContainer) {
            elements.postModal.expContainer.innerHTML = ''; // Чистим контейнер
            
            // Варианты выбора
            const opts = [
                { val: 'no_exp', label: 'Без опыта' },
                { val: 'less_1', label: 'До 1 года' },
                { val: '1-3', label: '1–3 года' },
                { val: '3-5', label: '3–5 лет' },
                { val: '5+', label: '5+ лет' }
            ];
            
            opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'exp-pill'; // Класс берется из feed.css
                
                // Если есть переводчик t(), используем его, иначе дефолтный текст
                // Ключи в i18n должны быть: exp_no, exp_less_1, exp_1_3, и т.д.
                // Пока используем label напрямую, если перевода нет
                btn.textContent = (typeof t === 'function' && t('exp_' + opt.val.replace('+','_plus').replace('1-3', '1_3').replace('3-5', '3_5'))) || opt.label;
                
                btn.onclick = (e) => {
                    e.preventDefault(); 
                    // 1. Убираем класс selected у всех кнопок
                    Array.from(elements.postModal.expContainer.children).forEach(c => c.classList.remove('selected'));
                    // 2. Добавляем текущей
                    btn.classList.add('selected');
                    // 3. Пишем значение в скрытый инпут
                    if (elements.postModal.expInput) elements.postModal.expInput.value = opt.val;
                    
                    // Вибрация
                    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                };
                elements.postModal.expContainer.appendChild(btn);
            });
        }
        // --- 🔥 КОНЕЦ НОВОЙ ЛОГИКИ ---

        // Счетчики символов (если есть)
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
        
        // Показываем окно
        UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
    }

    async function savePostData() {
        tg.MainButton.showProgress();
        const postData = {
            initData: tg.initData,
            post_type: elements.postModal.typeSelect.value,
            content: elements.postModal.contentField.value.trim(),
            full_description: elements.postModal.fullDescriptionField.value.trim(),
            skill_tags: elements.postModal.skillsField.value.split(',').map(s => s.trim()).filter(Boolean),
            experience_years: elements.postModal.expInput ? elements.postModal.expInput.value : null
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
    await loadScript('js/react/feed/FeedApp.js?v1.5');
    await loadScript('js/react/posts/PostsApp.js?v1.5');
    await loadScript('js/react/posts/MyProfileScreen.js?v1.0');

    console.log('React islands loaded');
    } catch (e) {
        console.error('React islands load error', e);
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
        // 1. Показываем фиксированный хедер ТОЛЬКО в лентах
        const isFeedMode = (
            activeViewId === 'feed-container' || 
            activeViewId === 'posts-feed-container'
        );

        // 2. Таббар показываем везде в основных разделах
        const showTabbar = (
            isFeedMode ||
            activeViewId === 'profile-view-container' ||
            activeViewId === 'settings-container'
        );

        // Применяем видимость
        if (appHeader) appHeader.style.display = isFeedMode ? 'flex' : 'none';
        if (appTabbar) appTabbar.style.display = showTabbar ? 'flex' : 'none';

        // Отступы контента
        if (mainScroll) {
            if (isFeedMode) {
                // Ленты: Отступ под большой хедер (~110px)
                mainScroll.style.paddingTop = 'calc(env(safe-area-inset-top, 40px) + 110px)';
            } else {
                // Профиль и Настройки: Хедера нет, минимальный отступ от "челки"
                mainScroll.style.paddingTop = 'calc(env(safe-area-inset-top, 20px) + 10px)';
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
        const tabSettings = document.getElementById('tab-settings');
        const mainScroll = document.getElementById('main-scroll-container');

        const resetTabs = () => {
            [tabPeople, tabHub, tabProfile, tabSettings].forEach(t => t?.classList.remove('active'));
        };

        const headerTitle = document.getElementById('header-title');

        if (tabPeople) {
        tabPeople.addEventListener('click', () => {
            resetTabs();
            tabPeople.classList.add('active');
            loadFeedData();
            if (headerTitle) headerTitle.textContent = t('tab_people') || 'People';
            if (mainScroll) mainScroll.scrollTop = 0;
        });
        }

        if (tabHub) {
        tabHub.addEventListener('click', () => {
            resetTabs();
            tabHub.classList.add('active');
            loadPostsFeedData();
            if (headerTitle) headerTitle.textContent = t('tab_hub') || 'Hub';
            if (mainScroll) mainScroll.scrollTop = 0;
        });
        }

        if (tabProfile) {
        tabProfile.addEventListener('click', () => {
            resetTabs();
            tabProfile.classList.add('active');
            UI.showView(elements.profileViewContainer, elements.allViews, elements.spinner, tg, t, null);
            if (headerTitle) headerTitle.textContent = t('tab_profile') || t('your_profile_title');
            localStorage.setItem('last-active-tab', 'profile');
        });
        }

        if (tabSettings) {
        tabSettings.addEventListener('click', () => {
            resetTabs();
            tabSettings.classList.add('active');
            UI.showView(elements.settingsContainer, elements.allViews, elements.spinner, tg, t, null);
            if (headerTitle) headerTitle.textContent = t('tab_settings') || t('settings_title');
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
        // --- 4. ОСТАЛЬНЫЕ ХЕНДЛЕРЫ (С УЛУЧШЕННЫМ ПОИСКОМ) ---
        const globalSearchInput = document.getElementById('global-search-input');
        
        if (globalSearchInput) {
            // 1. Создаем кнопку очистки (если её нет)
            const wrapper = globalSearchInput.parentElement;
            let clearBtn = wrapper.querySelector('.header-search-clear');
            
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.className = 'header-search-clear';
                // SVG крестик
                clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                wrapper.appendChild(clearBtn);
            }

            // Функция обновления видимости крестика
            const updateClearBtn = () => {
                if (globalSearchInput.value.trim().length > 0) {
                    wrapper.classList.add('has-text');
                } else {
                    wrapper.classList.remove('has-text');
                }
            };

            // 2. Обработчик ввода (GLOBAL INPUT)
            globalSearchInput.addEventListener('input', (e) => {
                updateClearBtn(); // Обновляем крестик
                
                const val = e.target.value;
                
                // Лента постов (Posts Feed)
                if (tabHub && tabHub.classList.contains('active')) {
                    if (elements.posts.searchInput) {
                        // 🔥 FIX: Check if values differ before firing event.
                        // React has likely already updated the local input via useEffect.
                        if (elements.posts.searchInput.value !== val) {
                            elements.posts.searchInput.value = val;
                            elements.posts.searchInput.dispatchEvent(new Event('input'));
                        }
                    }
                } 
                // Лента людей (People Feed)
                else {
                    if (elements.feed.searchInput) {
                        // Same check for People Feed
                        if (elements.feed.searchInput.value !== val) {
                            elements.feed.searchInput.value = val;
                            elements.feed.searchInput.dispatchEvent(new Event('input'));
                        }
                    }
                }
            });

            // 3. Обработчик клика по крестику (ПОЛНЫЙ СБРОС)
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Очищаем визуал
                globalSearchInput.value = '';
                updateClearBtn();
                globalSearchInput.focus(); // Возвращаем фокус

                // Запускаем логику сброса
                if (tabHub && tabHub.classList.contains('active')) {
                    // Для ленты постов: очищаем скрытый инпут и диспатчим input
                    // React поймает пустую строку и сделает setSelectedSkills([])
                    if (elements.posts.searchInput) {
                        elements.posts.searchInput.value = '';
                        elements.posts.searchInput.dispatchEvent(new Event('input'));
                    }
                } else {
                    // Для ленты людей
                    if (elements.feed.searchInput) {
                        elements.feed.searchInput.value = '';
                        elements.feed.searchInput.dispatchEvent(new Event('input'));
                        // Сбрасываем массив скиллов в ленте людей (если там есть отдельная логика)
                        document.dispatchEvent(new CustomEvent('set-feed-mode', { detail: { skills: [] } }));
                    }
                }
            });
            
            // Инициализация при загрузке (если там уже есть текст)
            updateClearBtn();
        }

        const globalFilterBtn = document.getElementById('global-filter-btn');
        if (globalFilterBtn) {
            globalFilterBtn.addEventListener('click', () => {
                const isHub = tabHub && tabHub.classList.contains('active');
                const currentSearch = globalSearchInput ? globalSearchInput.value : '';
                const skills = currentSearch ? currentSearch.split(',').map(s => s.trim()).filter(Boolean) : [];

                // С Глобальным фильтром нужно явно указывать куда возвращаться
                const returnId = isHub ? 'posts-feed-container' : 'feed-container';

                if (isHub) {
                    document.dispatchEvent(new CustomEvent('openSkillsModal', { 
                        detail: { source: 'postsFeed', skills: skills, returnTo: returnId } 
                    }));
                } else {
                    document.dispatchEvent(new CustomEvent('openSkillsModal', { 
                        detail: { source: 'feed', skills: skills, returnTo: returnId } 
                    }));
                }
            });
        }

        // --- 5. КНОПКИ ОТКРЫТИЯ СКИЛЛОВ ---

        // A. Лента ЛЮДЕЙ
        if (elements.feed.openSkillsModalButtonFeed) {
             elements.feed.openSkillsModalButtonFeed.addEventListener('click', async () => {
                const currentSearch = elements.feed.searchInput ? elements.feed.searchInput.value : '';
                const currentSkills = currentSearch ? currentSearch.split(',').map(s => s.trim()).filter(Boolean) : [];
                
                // ✅ ПЕРЕДАЕМ returnTo
                const result = await SkillsManager.select(currentSkills, { 
                    showStatus: false,
                    returnTo: 'feed-container' 
                });

                if (result) {
                    const skillsStr = result.skills.join(', ');
                    if (elements.feed.searchInput) {
                        elements.feed.searchInput.value = skillsStr;
                        elements.feed.searchInput.dispatchEvent(new Event('input'));
                    }
                    if (globalSearchInput) {
                        globalSearchInput.value = skillsStr;
                    }
                }
                // Авто-восстановление уже сработает внутри SkillsManager
            });
        }

        // C. Создание поста
        if (elements.postModal.openSkillsModalButton) {
            elements.postModal.openSkillsModalButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;

            elements.postModal.openSkillsModalButton.addEventListener('click', async () => {
                const currentVal = elements.postModal.skillsField.value || '';
                const currentSkills = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
                
                // ✅ ПЕРЕДАЕМ returnTo: 'create-post-modal'
                const result = await SkillsManager.select(currentSkills, { 
                    showStatus: false,
                    returnTo: 'create-post-modal'
                });

                if (result) {
                    elements.postModal.skillsField.value = result.skills.join(', ');
                }
            });
        }

        // D. Редактирование профиля
        if (elements.form.openSkillsModalButton) {
            elements.form.openSkillsModalButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;

            elements.form.openSkillsModalButton.addEventListener('click', async () => {
                const currentVal = elements.form.skillsField.value || '';
                const currentSkills = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
                
                // ✅ ПЕРЕДАЕМ returnTo: 'form-container'
                const result = await SkillsManager.select(currentSkills, { 
                    showStatus: false,
                    returnTo: 'form-container'
                });

                if (result) {
                    elements.form.skillsField.value = result.skills.join(', ');
                }
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
        
        linksManager = setupDynamicList(tg, t, elements.form.addLinkButton, elements.form.linksContainer, elements.form.linkTemplate, 5);
        experienceManager = setupDynamicList(tg, t, elements.form.addExperienceButton, elements.form.experienceContainer, elements.form.experienceTemplate, 10);
        educationManager = setupDynamicList(tg, t, elements.form.addEducationButton, elements.form.educationContainer, elements.form.educationTemplate, 5);

        const welcomeCreateBtn = elements.welcomeContainer.querySelector('#create-profile-button');
        if(welcomeCreateBtn) {
            welcomeCreateBtn.addEventListener('click', () => {
                UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
            });
        }
        
        if (elements.profile.logoutButton) elements.profile.logoutButton.addEventListener('click', () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData));
        
        if (elements.settings.glassToggle) {
            elements.settings.glassToggle.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                state.currentUserProfile.is_glass_enabled = isEnabled;
                applyGlass(isEnabled);
                try { await api.saveGlassPreference(tg.initData, isEnabled); } catch (error) { console.error("Error saving glass preference:", error); }
            });
        }
        
        if (elements.postModal.saveButton) {
            elements.postModal.saveButton.addEventListener('click', (e) => {
                e.preventDefault(); // На всякий случай
                savePostData();
            });
        }

        // 1. Язык (Language)
        if (elements.settings.langBtnRu) {
            elements.settings.langBtnRu.addEventListener('click', () => {
                if (state.currentLang !== 'ru') {
                    setLanguage('ru');
                    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                }
            });
        }

        if (elements.settings.langBtnEn) {
            elements.settings.langBtnEn.addEventListener('click', () => {
                if (state.currentLang !== 'en') {
                    setLanguage('en');
                    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                }
            });
        }

        // 2. Режим управления (Control Mode)
        const CONTROL_MODE_KEY = 'control_mode';

        const updateControlModeUI = () => {
        const mode = localStorage.getItem(CONTROL_MODE_KEY) || 'swipes';
        if (elements.settings.controlBtnTaps) {
            elements.settings.controlBtnTaps.classList.toggle('active', mode === 'taps');
        }
        if (elements.settings.controlBtnSwipes) {
            elements.settings.controlBtnSwipes.classList.toggle('active', mode === 'swipes');
        }
        };

        // Инициализируем UI при загрузке
        updateControlModeUI();

        if (elements.settings.controlBtnTaps) {
            elements.settings.controlBtnTaps.addEventListener('click', () => {
                localStorage.setItem(CONTROL_MODE_KEY, 'taps');
                window.dispatchEvent(new Event('control-mode-changed'));
                updateControlModeUI();
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            });
        }

        if (elements.settings.controlBtnSwipes) {
            elements.settings.controlBtnSwipes.addEventListener('click', () => {
                localStorage.setItem(CONTROL_MODE_KEY, 'swipes');
                window.dispatchEvent(new Event('control-mode-changed'));
                updateControlModeUI();
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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

          // --- REACT Профиль → Vanilla мост ---

        // Открытие формы редактирования из нового React-профиля
        document.addEventListener('open-edit-profile-form', () => {
            UI.showView(
            elements.formContainer,
            elements.allViews,
            elements.spinner,
            tg,
            t,
            loadProfileData
            );
        });

        // Открытие QR-модалки из нового React-профиля
        document.addEventListener('open-profile-qr', () => {
            if (!state.currentUserProfile) return;

            UI.showQrCodeModal(
            elements.qr,
            state.CONFIG,
            state.currentUserProfile,
            t
            );
        });

        // --- УМНОЕ СКРЫТИЕ ТАББАРА (ТОЛЬКО НА МОБИЛКАХ) ---
        const allInputs = document.querySelectorAll('input, textarea');
        const tabbar = document.getElementById('app-tabbar');
        
        // Проверка: является ли устройство мобильным (Android, iOS и т.д.)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const handleFocus = () => {
            // Скрываем бар ТОЛЬКО если это реальное мобильное устройство
            // На ПК (даже в узком окне) бар останется
            if (isMobile && tabbar) {
                tabbar.classList.add('hide-on-keyboard');
            }
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
            
            // --- ЛОГИКА СТАРТА ПРИЛОЖЕНИЯ (ПОЛНАЯ ВЕРСИЯ) ---
            const startParam = tg.initDataUnsafe?.start_param;
            
            // 1. Сценарий Deep Link (Высший приоритет)
            if (startParam && state.isRegistered) {
                if (startParam.startsWith('p_')) {
                    // --- ОТКРЫТИЕ ПОСТА ---
                    const postId = startParam.replace('p_', '').trim();
                    // Переходим в HUB
                    const tabHub = document.getElementById('tab-hub');
                    if(tabHub) tabHub.click();
                    
                    try {
                        const postResult = await api.getPostById(tg.initData, postId);
                        if (postResult.ok && postResult.post) {
                            // Сохраняем пост глобально или кидаем событие
                            window.__DEEP_LINK_POST = postResult.post;
                            // Небольшая задержка, чтобы React успел смонтироваться
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent('open-deep-link-post', { detail: { post: postResult.post } }));
                            }, 500);
                        } else {
                            UI.showToast('Пост не найден', true);
                        }
                    } catch (e) { 
                        UI.showToast('Ошибка загрузки поста', true); 
                    }

                } else {
                    // --- ОТКРЫТИЕ ПРОФИЛЯ ---
                    const targetUserId = startParam;
                    // Переходим в PEOPLE
                    const tabPeople = document.getElementById('tab-people');
                    if(tabPeople) tabPeople.click();
                    
                    try {
                        const userResult = await api.loadTargetUserProfile(tg.initData, targetUserId);
                        if (userResult.ok && userResult.profile) {
                            setTimeout(() => {
                                // Событие может слушать FeedApp (если реализуем) или просто старая логика
                                // В текущей архитектуре FeedApp это пока не обрабатывает, но логика остается для совместимости
                                document.dispatchEvent(new CustomEvent('open-deep-link-profile', { detail: { user: userResult.profile } }));
                                
                                // ПРЯМОЙ ВЫЗОВ (Fallback): Показываем профиль поверх ленты
                                state.currentViewedUserId = userResult.profile.user_id;
                                UI.showUserDetailView(
                                    userResult.profile, 
                                    elements.detail, 
                                    state.CONFIG, 
                                    t, 
                                    (container, skills, btn) => UI.renderSkillTags(container, skills, btn, t), 
                                    state.currentUserProfile.user_id
                                );
                                UI.showView(elements.userDetailContainer, elements.allViews, elements.spinner, tg, t, loadFeedData);
                            }, 500);
                        }
                    } catch (e) { 
                        UI.showToast(t('error_profile_not_found'), true); 
                    }
                }
                state.targetUserIdFromLink = null;
            
            // 2. Если не зарегистрирован -> Welcome Screen
            } else if (!state.isRegistered) {
                UI.showView(elements.welcomeContainer, elements.allViews, elements.spinner, tg, t, undefined);
            
            // 3. Обычный вход -> ВСЕГДА HUB (Лента запросов)
            } else {
                const tabHub = document.getElementById('tab-hub');
                if (tabHub) {
                    tabHub.click(); // Это вызовет loadPostsFeedData()
                } else {
                    // Фоллбэк на случай проблем с DOM
                    loadPostsFeedData();
                }
            }

            // Расширение на весь экран (для Android)
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