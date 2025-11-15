// js/app.js
// ОБНОВЛЕНО: Добавлена обработка ошибок валидации через showToast
// ОБНОВЛЕНО: Удален счетчик "Группы"
// ОБНОВЛЕНО (Glass): Добавлена логика переключателя "Стекла"
// УДАЛЕНО: Вся логика "Last Seen" и "Nationality"
// ОБНОВЛЕНО (Задача 2): Добавлена валидация `validateDynamicLists`
// ОБНОВЛЕНО (Задача 3): Добавлена логика для `skillsModalSource: 'editPostModal'`
// ✅ НОВОЕ: Добавлена логика для кнопки "Назад" (Back Button)
// ✅ НОВОЕ (Задача 6): Добавлен 'listener' для события openCreatePostModal и удалены старые ссылки на createPostFab
// ✅ ИСПРАВЛЕНИЕ (Задача 4): Исправлен ID кнопки 'select-post-skills-button' в 'elements'
// --- ИЗМЕНЕНИЕ: Полностью удалена логика TomSelect (postTypeSelectInstance, initPostTypeSelect) ---
// --- ИЗМЕНЕНИЕ: Добавлена синхронизация ручного ввода тегов в модалке поста ---
// --- ИЗМЕНЕНИЕ: Добавлен обработчик для кнопки #save-post-button ---
// ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Перестроена вся логика навигации на tg.BackButton

// --- ИМПОРТ МОДУЛЕЙ ---
import { loadTranslations, t, supportedLangs } from './i18n.js';
// import { getLuminance, shadeColor, formatLastSeen } from './utils.js'; // УДАЛЕНО formatLastSeen
import { getLuminance, shadeColor } from './vanilla_utils.js'; // (utils.js был почищен)
// (НОВОЕ) Импортируем applyGlass
import { applyTheme, updateThemeButtons, applyGlass } from './theme.js';
// import { initCountrySelector, updateCountryListText, getTomSelectInstance, preloadFlags } from './countries.js?v=2'; // УДАЛЕНО
import * as api from './api.js';
// ИСПРАВЛЕНО: v=1.4
import * as ui  from './ui-helpers.js?v=1.4';
const UI = ui;

// --- (ИЗМЕНЕНИЕ) ---
// Импортируем состояние и помощники из новых файлов
import { state, SKILL_CATEGORIES } from './app-state.js';
import { setupDynamicList } from './app-form-helpers.js';
// --- (КОНЕЦ ИЗМЕНЕНИЯ) ---


// ✅ АКТИВИРУЕМ REACT-ОСТРОВ ДЛЯ ЛЕНТЫ
window.REACT_FEED = true;

// --- ИНИЦИАЛИЗАЦИЯ ---
const tg = window.Telegram.WebApp;

// Расширяем viewport
tg.expand();

document.addEventListener('DOMContentLoaded', () => {

    // --- ЭЛЕМЕНТЫ СТРАНИЦЫ (Константы) ---
    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Удалены все кнопки "Назад"
    const elements = {
        // Контейнеры
        welcomeContainer: document.getElementById('welcome-container'),
        formContainer: document.getElementById('form-container'),
        profileViewContainer: document.getElementById('profile-view-container'),
        feedContainer: document.getElementById('feed-container'),
        userDetailContainer: document.getElementById('user-detail-container'),
        settingsContainer: document.getElementById('settings-container'),
        skillsModal: document.getElementById('skills-modal'),
        spinner: document.getElementById('loading-spinner'),

        // (НОВЫЙ БЛОК) Лента Запросов
        posts: {
            container: document.getElementById('posts-feed-container'),
            list: document.getElementById('posts-list'),
            searchInput: document.getElementById('posts-search-input'),
            // (ВОТ ЭТО ДОБАВЛЕНО)
            postsStatusFilterInput: document.getElementById('posts-status-filter-input'), 
            quickFilters: document.getElementById('posts-quick-filters'),
            // backToProfileButton: (УДАЛЕНО)
            openSkillsModalButton: document.getElementById('open-skills-modal-button-posts'),
            // createPostFab: (УДАЛЕНО)
        },
        
        // (НОВЫЙ БЛОК) Модальное окно создания поста
        postModal: {
            modal: document.getElementById('create-post-modal'),
            // closeButton: (УДАЛЕНО)
            saveButton: document.getElementById('save-post-button'), // Этот ID не используется, но пусть будет
            typeSelect: document.getElementById('post-type-select'),
            contentField: document.getElementById('post-content-field'),
            fullDescriptionField: document.getElementById('post-full-description-field'), // НОВОЕ ПОЛЕ
            skillsField: document.getElementById('post-skills-field'),
            openSkillsModalButton: document.getElementById('select-post-skills-button')
        },

        // --- Элементы формы ---
        form: {
            nameField: document.getElementById('name-field'),
            bioField: document.getElementById('bio-field'),
            // nationalityField: (УДАЛЕНО)
            skillsField: document.getElementById('skills-field'),
            photoInput: document.getElementById('photo-input'),
            avatarPreview: document.getElementById('avatar-preview'),
            openSkillsModalButton: document.getElementById('open-skills-modal-button'),
            // backToProfileFromEditButton: (УДАЛЕНО)
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

        // Элементы просмотра профиля
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
            // groupsCount: (УДАЛЕНО)
            logoutButton: document.getElementById('logout-button'), // Edit button
            shareButton: document.getElementById('share-button'),
            viewFeedButton: document.getElementById('view-feed-button'), // Feed FAB (Люди)
            viewPostsFeedButton: document.getElementById('view-posts-feed-button'), // Posts FAB (Запросы)
            settingsButton: document.getElementById('settings-button'),
            showQrButton: document.getElementById('show-qr-button')
        },

        // Элементы ленты (ЛЮДИ) - (ИСПРАВЛЕНЫ ID)
        feed: {
            list: document.getElementById('feed-list'),
            searchInput: document.getElementById('feed-search-input'),
            quickFilters: document.getElementById('feed-quick-filters'),
            // backToProfileButton: (УДАЛЕНО)
            openSkillsModalButtonFeed: document.getElementById('open-skills-modal-button-feed')
        },

        // --- Элементы просмотра пользователя ---
        detail: {
            // headerBackButton: (УДАЛЕНО)
            headerActionsButton: document.getElementById('detail-header-actions-button'),
            avatar: document.getElementById('detail-avatar'),
            avatarContainer: document.querySelector('.detail-avatar-container'),
            username: document.getElementById('detail-username'),
            // lastSeen: (УДАЛЕНО)
            bio: document.getElementById('detail-bio'),
            experienceContainer: document.getElementById('detail-experience'),
            educationContainer: document.getElementById('detail-education'),
            linksContainer: document.getElementById('detail-links'),
            skillsContainer: document.getElementById('detail-skills'),
            skillsToggleBtn: document.getElementById('detail-skills-toggle'),
            followersCount: document.getElementById('detail-followers').querySelector('.stat-value'),
            followingCount: document.getElementById('detail-following').querySelector('.stat-value'),
            // groupsCount: (УДАЛЕНО)
            fabContainer: document.getElementById('detail-fab-container'),
            fabContactButton: document.getElementById('fab-contact-button'),
            fabFollowButton: document.getElementById('fab-follow-button')
        },

        // Элементы настроек
        settings: {
            // backToProfileFromSettingsButton: (УДАЛЕНО)
            langBtnRu: document.getElementById('lang-btn-ru'),
            langBtnEn: document.getElementById('lang-btn-en'),
            glassToggleWrapper: document.getElementById('glass-toggle-wrapper'),
            glassToggle: document.getElementById('glass-toggle-switch'),
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

        // Модальное окно QR
        qr: {
            modal: document.getElementById('qr-code-modal'),
            output: document.getElementById('qrcode-output'),
            linkDisplay: document.getElementById('qr-link-display'),
            closeButton: document.getElementById('close-qr-modal-button')
        },

        // Модальное окно навыков
        skills: {
            modal: document.getElementById('skills-modal'),
            // closeButton: (УДАЛЕНО)
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

    // --- (ИЗМЕНЕНИЕ) ---
    // ГЛОБАЛЬНОЕ СОСТОЯНИЕ и SKILL_CATEGORIES теперь импортируются из ./app-state.js
    // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---

    // --- (ИЗМЕНЕНИЕ) ---
    // Функция setupDynamicList теперь импортируется из ./app-form-helpers.js
    // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---


    // --- УПРАВЛЕНИЕ ЯЗЫКОМ (i18n) ---
    async function setLanguage(lang, isInitialLoad = false) {
        lang = supportedLangs.includes(lang) ? lang : 'ru'; state.currentLang = lang; localStorage.setItem('userLanguage', lang); await loadTranslations(lang); updateUIText(); if (!isInitialLoad && state.currentUserProfile?.user_id) { try { await api.saveLanguagePreference(tg.initData, lang); state.currentUserProfile.language_code = lang; } catch (e) { console.warn("Failed to save lang", e); } }
    }
    function getInitialLanguage() {
        let lang = localStorage.getItem('userLanguage'); if (lang && supportedLangs.includes(lang)) { return lang; } lang = tg.initDataUnsafe?.user?.language_code; if (lang) { lang = lang.split('-')[0]; if (supportedLangs.includes(lang)) { return lang; } } return 'ru';
    }
    function updateUIText() {
        document.documentElement.lang = state.currentLang; document.querySelectorAll('[data-i18n-key]').forEach(element => { const key = element.dataset.i18nKey; if (element.closest('template') || element.id === 'profile-skills-toggle' || element.id === 'detail-skills-toggle' || element.id === 'show-qr-button') { return; } element.textContent = t(key); }); document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { if (element.closest('template')) { return; } 
        // (УДАЛЕНО) Блок if (element.id === 'nationality-field')
        element.placeholder = t(element.dataset.i18nPlaceholder); 
    }); if (tg.MainButton.isVisible) { if (elements.formContainer.style.display === 'block') { tg.MainButton.setText(t('save_button')); } else if (elements.postModal.modal.style.display === 'block') { tg.MainButton.setText(t('publish')); } } document.title = t('my_profile'); if (elements.settings.langBtnRu) elements.settings.langBtnRu.classList.toggle('active', state.currentLang === 'ru'); if (elements.settings.langBtnEn) elements.settings.langBtnEn.classList.toggle('active', state.currentLang === 'en'); [elements.profile.skillsToggleBtn, elements.detail.skillsToggleBtn].forEach(toggleButton => { if (toggleButton && toggleButton.style.display !== 'none') { const textSpan = toggleButton.querySelector('span:not(.arrow)'); if(textSpan) { const isLess = toggleButton.classList.contains('less'); textSpan.textContent = t(isLess ? 'skills_show_less' : 'skills_show_more'); } } }); if (elements.skills.modal.style.display !== 'none') { UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, (skill) => { if (state.selectedSkills.includes(skill)) { state.selectedSkills = state.selectedSkills.filter(s => s !== skill); } else { state.selectedSkills.push(skill); } UI.renderSkillSelectionForm(elements.skills.listContainer, state.selectedSkills, SKILL_CATEGORIES, t, arguments.callee); }); } 
        // (УДАЛЕНО) updateCountryListText(...)
        [elements.form.linkTemplate, elements.form.experienceTemplate, elements.form.educationTemplate].forEach(template => { if (template) { template.content.querySelectorAll('[data-i18n-key]').forEach(el => el.textContent = t(el.dataset.i18nKey)); template.content.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder)); } }); [elements.form.linksContainer, elements.form.experienceContainer, elements.form.educationContainer].forEach(container => { if(container) { container.querySelectorAll('[data-i18n-key]').forEach(el => el.textContent = t(el.dataset.i18nKey)); container.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder)); } });
    }

    // --- ОСНОВНЫЕ ФУНКЦИИ ЛОГИКИ ---
    let linksManager, experienceManager, educationManager;
    console.log('UI exports:', Object.keys(UI));

    // --- ИЗМЕНЕНИЕ: Вся логика TomSelect удалена ---
    // let postTypeSelectInstance = null;
    // function initPostTypeSelect() { ... }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    /**
     * Загружает основной профиль пользователя (с UI.showSpinner)
     */
    async function loadProfileData() {
        UI.showSpinner(elements.spinner, elements.allViews);
        
        try {
            console.log("🔥 loadProfileData: start");
            
            const data = await api.loadProfileData(tg.initData);
            console.log("🔥 loadProfileData: received", data);
            
            if (data.ok && data.profile.user_id) {
                state.currentUserProfile = data.profile;
                state.isRegistered = true;
                
                window.__CURRENT_USER_ID = data.profile.user_id;
                
                const savedLang = state.currentUserProfile.language_code;
                if (savedLang && savedLang !== state.currentLang && supportedLangs.includes(savedLang)) {
                    await setLanguage(savedLang, true);
                }
                
                // (НОВОЕ) Логика "Стекла"
                // 1. Сначала применяем основную тему
                applyTheme(
                    tg, 
                    t, 
                    elements.settings, 
                    state.currentUserProfile, 
                    state.currentUserProfile.theme || 'auto', 
                    state.currentUserProfile.custom_theme
                );
                
                // 2. Считываем настройку "Стекла"
                const isGlassEnabled = !!state.currentUserProfile.is_glass_enabled;
                if (elements.settings.glassToggle) {
                    elements.settings.glassToggle.checked = isGlassEnabled;
                }
                
                // 3. Применяем "Стекло" (если тема совместима)
                const currentTheme = state.currentUserProfile.theme || 'auto';
                if (isGlassEnabled && (currentTheme === 'light' || currentTheme === 'dark')) {
                    applyGlass(true);
                } else if (isGlassEnabled) {
                    // "Стекло" было включено, но тема несовместима (auto/custom).
                    // Принудительно отключаем его.
                    console.warn("Glass mode was enabled but is incompatible with current theme. Disabling.");
                    state.currentUserProfile.is_glass_enabled = false;
                    if (elements.settings.glassToggle) {
                        elements.settings.glassToggle.checked = false;
                    }
                    applyGlass(false);
                    // (Не сохраняем в БД, чтобы не спамить API, 
                    // пользователь исправит это в настройках)
                }
                // --- Конец логики "Стекла" ---

                
                elements.form.nameField.value = state.currentUserProfile.first_name || tg.initDataUnsafe?.user?.first_name || '';
                elements.form.bioField.value = state.currentUserProfile.bio || '';
                
                // (УДАЛЕНО) Блок if (state.tomSelectInstance)
                
                try {
                    const skills = state.currentUserProfile.skills ? JSON.parse(state.currentUserProfile.skills) : [];
                    elements.form.skillsField.value = skills.join(', ');
                } catch {
                    elements.form.skillsField.value = state.currentUserProfile.skills || '';
                }
                
                const profileLinks = [
                    state.currentUserProfile.link1,
                    state.currentUserProfile.link2,
                    state.currentUserProfile.link3,
                    state.currentUserProfile.link4,
                    state.currentUserProfile.link5
                ].filter(link => link);
                
                if (linksManager?.renderItems) {
                    linksManager.renderItems(profileLinks);
                }
                
                if (experienceManager?.renderItems) {
                    experienceManager.renderItems(state.currentUserProfile.experience || []);
                }
                
                if (educationManager?.renderItems) {
                    educationManager.renderItems(state.currentUserProfile.education || []);
                }
                
                console.log("👤 loadProfileData: showing profile view");
                UI.showProfileView(
                    state.currentUserProfile, 
                    elements.profile, 
                    state.CONFIG, 
                    t, 
                    (container, skills, btn) => UI.renderSkillTags(container, skills, btn, t)
                );
                
                // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
                // ✅ (Fullscreen Nav) onBackAction = () => tg.close() (кнопка "Close")
                UI.showView(
                elements.profileViewContainer,
                elements.allViews,
                elements.spinner,
                tg,
                t,
                undefined // Теперь !onBackAction: скрываем Back, показываем Settings с tg.close()
                );
                
            } else {
                state.isRegistered = false;
                applyTheme(tg, t, elements.settings, state.currentUserProfile, 'auto');
                // (НОВОЕ) Убедимся, что стекло выключено для нового пользователя
                applyGlass(false);
                
                // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
                // ✅ (Fullscreen Nav) onBackAction = () => tg.close() (кнопка "Close")
                UI.showView(
                elements.profileViewContainer,
                elements.allViews,
                elements.spinner,
                tg,
                t,
                undefined // Теперь !onBackAction: скрываем Back, показываем Settings с tg.close()
                );
            }
            
        } catch (error) {
            console.error("❌ Network error /get-profile:", error);
            // ИСПОЛЬЗУЕМ TOAST
            UI.showToast(t('error_load_profile_network'), true);
            
            state.isRegistered = false;
            applyTheme(tg, t, elements.settings, state.currentUserProfile, 'auto');
            // (НОВОЕ) Убедимся, что стекло выключено при ошибке
            applyGlass(false);
            
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // ✅ (Fullscreen Nav) onBackAction = () => tg.close() (кнопка "Close")
                UI.showView(
                elements.profileViewContainer,
                elements.allViews,
                elements.spinner,
                tg,
                t,
                undefined // Теперь !onBackAction: скрываем Back, показываем Settings с tg.close()
                );
            
        } finally {
            UI.hideSpinner(elements.spinner);
        }
    }

    /**
     * Загружает профиль другого пользователя (с UI.showSpinner)
     */
    async function loadTargetUserProfile(targetUserId) {
        UI.showSpinner(elements.spinner, elements.allViews); try { console.log(`📥 loadTargetUserProfile: loading user ${targetUserId}`); const data = await api.loadTargetUserProfile(tg.initData, targetUserId); if (data.ok) { state.currentViewedUserId = data.profile.user_id; console.log(`👤 loadTargetUserProfile: showing profile for ${targetUserId}`); 
        // (УДАЛЕНО) formatLastSeen
        UI.showUserDetailView(
            data.profile, 
            elements.detail, 
            state.CONFIG, 
            t, 
            (container, skills, btn) => UI.renderSkillTags(container, skills, btn, t), 
            state.currentUserProfile.user_id
        ); 
        
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Кнопка "Назад" должна возвращать в Ленту Людей
        UI.showView(
            elements.userDetailContainer, 
            elements.allViews, 
            elements.spinner, 
            tg, 
            t,
            loadFeedData // Вернуться в ленту
        ); 
        
        } else { console.warn(`⚠️ loadTargetUserProfile: User ${targetUserId} not found.`); UI.showToast(t('error_profile_not_found'), true); await loadProfileData(); } } catch (error) { console.error(`❌ Error /get-user-by-id for ${targetUserId}:`, error); UI.showToast(t('error_load_profile_generic'), true); await loadProfileData(); } finally { UI.hideSpinner(elements.spinner); }
    }

    /**
     * Сохраняет данные профиля (с анимацией "тряски")
     */
    async function saveProfileData() {
        tg.MainButton.showProgress();

        // --- НОВАЯ ВАЛИДАЦИЯ ДИНАМИЧЕСКИХ СПИСКОВ ---
        const listValidationErrorKey = validateDynamicLists();
        if (listValidationErrorKey) {
            tg.MainButton.hideProgress();
            UI.showToast(t(listValidationErrorKey), true);
            // Прерываем сохранение
            return; 
        }
        // --- КОНЕЦ ВАЛИДАЦИИ ---

        const formData = new FormData(); 
        formData.append('initData', tg.initData); 
        elements.form.nameField.classList.remove('input-shake'); 
        const nameToSave = elements.form.nameField.value.trim(); 
        
        // --- ИЗМЕНЕНИЕ ЗДЕСЬ (ИСПРАВЛЕНИЕ БАГА) ---
        if (!nameToSave) { 
            tg.MainButton.hideProgress(); 
            // Используем НОВЫЙ, правильный ключ
            UI.showToast(t('error_name_empty'), true); 
            elements.form.nameField.classList.add('input-shake'); 
            return; 
        } 
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        formData.append('first_name', nameToSave || tg.initDataUnsafe?.user?.first_name || ''); formData.append('bio', elements.form.bioField.value.trim()); const linksData = linksManager?.getItemsData ? linksManager.getItemsData() : []; for (let i = 0; i < 5; i++) { formData.append(`link${i + 1}`, linksData[i] || ''); } const experienceData = experienceManager?.getItemsData ? experienceManager.getItemsData() : []; formData.append('experience', JSON.stringify(experienceData)); const educationData = educationManager?.getItemsData ? educationManager.getItemsData() : []; formData.append('education', JSON.stringify(educationData)); 
        // (УДАЛЕНО) formData.append('nationality_code', ...)
        const skillsArray = elements.form.skillsField.value.split(',').map(s => s.trim()).filter(s => s); formData.append('skills', JSON.stringify(skillsArray)); if (state.selectedFile) formData.append('photo', state.selectedFile); formData.append('lang', state.currentLang);
        
        try { 
            // 'api.js' (из Шага 13.4) "выбросит" ошибку, если 'response.ok === false'
            const data = await api.saveProfileData(formData); 
            
            // Эта часть выполнится, только если 'data.ok === true'
            await loadProfileData(); // loadProfileData() сама установит кнопку "Назад" на tg.close()
            
            if (state.targetUserIdFromLink && state.isRegistered) { 
                await loadTargetUserProfile(state.targetUserIdFromLink); // loadTargetUserProfile() установит "Назад" на loadFeedData
                state.targetUserIdFromLink = null; 
            } else if (state.isRegistered) { 
                // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
                // Эта ветка теперь дублирует loadProfileData, но мы вызовем 
                // ✅ (Fullscreen Nav) onBackAction = () => tg.close() (кнопка "Close")
                UI.showView(
                elements.profileViewContainer,
                elements.allViews,
                elements.spinner,
                tg,
                t,
                undefined // Теперь !onBackAction: скрываем Back, показываем Settings с tg.close()
                );
            } 
        } catch (error) { 
            console.error('Error saving profile:', error); 
            // --- НОВАЯ ОБРАБОТКА ОШИБОК ---
            if (error && error.error === 'validation' && error.details) {
                // Это наша ошибка валидации с сервера
                const message = t(error.details.key, { limit: error.details.limit });
                UI.showToast(message, true);
            } else {
                // Это сетевая или другая ошибка
                UI.showToast(t('error_save_network'), true);
            }
            // --- КОНЕЦ ОБРАБОТКИ ---
        } finally { 
            tg.MainButton.hideProgress(); 
            state.selectedFile = null; 
        }
    }

    /**
     * Загружает ленту профилей
     */
    async function loadFeedData() {
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Кнопка "Назад" должна возвращать в Профиль
        UI.showView(
            elements.feedContainer, 
            elements.allViews, 
            elements.spinner, 
            tg, 
            t,
            loadProfileData // Вернуться в профиль
        );
        elements.feed.searchInput.value = '';
        // Сбрасываем React-фильтры
        document.dispatchEvent(new CustomEvent('set-feed-mode', {
            detail: { skills: [] }
        }));
    }

    /**
     * Загружает ленту запросов (постов)
     */
    async function loadPostsFeedData() {
        // --- ✅ ИЗМЕНЕНИЕ: Поменяли порядок ---
        
        // 1. СНАЧАЛА отправляем React-компоненту команду
        //    переключиться на "все посты" и сбросить фильтры.
        //    React обработает это *пока* он еще скрыт.
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', {
            detail: { showMyPostsOnly: false, skills: [], status: null }
        }));
        
        // 2. СБРАСЫВАЕМ инпут (React не управляет им напрямую)
        elements.posts.searchInput.value = '';

        // 3. ПОТОМ показываем экран.
        //    К этому моменту React уже очистил список (благодаря нашему фиксу в react-posts-feed.js)
        //    и готов загружать "все посты".
        UI.showView(
            elements.posts.container, 
            elements.allViews, 
            elements.spinner, 
            tg, 
            t,
            loadProfileData // Вернуться в профиль
        );
        
        // --- 🔴 СТАРАЯ ЛОГИКА (была здесь) ---
        // elements.posts.searchInput.value = '';
        // document.dispatchEvent(...);
    }

    /**
     * Загружает ленту ТОЛЬКО своих запросов
     */
    async function loadMyPostsFeedData() {
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Кнопка "Назад" должна возвращать в Профиль
        UI.showView(
            elements.posts.container, 
            elements.allViews, 
            elements.spinner, 
            tg, 
            t,
            loadProfileData // Вернуться в профиль
        );
        elements.posts.searchInput.value = '';
        
        // (ИСПРАВЛЕНО) Отправляем React-компоненту команду
        // переключиться на "мои посты"
        document.dispatchEvent(new CustomEvent('set-posts-feed-mode', {
            detail: { showMyPostsOnly: true }
        }));
    }

    /**
     * Показывает модальное окно создания поста
     */
    function showCreatePostModal() {
        elements.postModal.typeSelect.value = 'looking';
        elements.postModal.contentField.value = '';
        elements.postModal.fullDescriptionField.value = ''; // Очищаем новое поле
        elements.postModal.skillsField.value = '';

        // --- ИЗМЕНЕНИЕ: TomSelect удален ---
        // initPostTypeSelect();
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Кнопка "Назад" (вместо "Отмена") должна возвращать в Ленту Постов
        UI.showView(
            elements.postModal.modal, 
            elements.allViews, 
            elements.spinner, 
            tg, 
            t,
            loadPostsFeedData // Вернуться в ленту постов
        );
        // Кнопка управляется из showView
    }

    /**
     * Сохраняет новый пост (запрос)
     */
    async function savePostData() {
        tg.MainButton.showProgress();
        
        const postData = {
            initData: tg.initData,
            post_type: elements.postModal.typeSelect.value,
            content: elements.postModal.contentField.value.trim(), // Краткое описание
            full_description: elements.postModal.fullDescriptionField.value.trim(), // НОВОЕ: Полное описание
            skill_tags: elements.postModal.skillsField.value.split(',').map(s => s.trim()).filter(Boolean)
        };

        if (!postData.content) {
            tg.MainButton.hideProgress();
            // ИСПОЛЬЗУЕМ TOAST
            UI.showToast(t('error_post_content_empty'), true);
            return;
        }

        try {
            const result = await api.createPost(postData);
            if (result.ok) {
                // ИСПОЛЬЗУЕМ TOAST
                UI.showToast(t('post_created_success'), false); // false = не ошибка
                document.dispatchEvent(new CustomEvent('posts-updated'));
                loadPostsFeedData(); // Эта функция сама установит правильную кнопку "Назад"
            } else {
                 // Эта ветка больше не используется
                UI.showToast(t('error_save', {error: result.error || 'Unknown error'}), true);
            }
        } catch (error) {
            console.error('Error saving post:', error);
             // --- НОВАЯ ОБРАБОТКА ОШИБОК ---
            if (error && error.error === 'validation' && error.details) {
                // Это наша ошибка валидации с сервера
                const message = t(error.details.key, { limit: error.details.limit });
                UI.showToast(message, true);
            } else {
                // Это сетевая или другая ошибка
                UI.showToast(t('error_save_network'), true);
            }
            // --- КОНЕЦ ОБРАБОТКИ ---
        } finally {
            tg.MainButton.hideProgress();
        }
    }

    /**
     * НОВАЯ ФУНКЦИЯ: Валидация блоков "Опыт" и "Образование"
     * @returns {string|null} Ключ ошибки i18n или null, если все в порядке
     */
    function validateDynamicLists() {
        // 1. Валидация Опыта
        const expItems = elements.form.experienceContainer.querySelectorAll('.dynamic-item');
        for (const item of expItems) {
            const jobTitle = item.querySelector('.experience-job-title')?.value.trim();
            const company = item.querySelector('.experience-company')?.value.trim();
            
            // Если хотя бы одно поле заполнено, но не оба
            if ((jobTitle || company) && (!jobTitle || !company)) {
                return 'error_experience_incomplete';
            }
        }

        // 2. Валидация Образования
        const eduItems = elements.form.educationContainer.querySelectorAll('.dynamic-item');
        for (const item of eduItems) {
            const institution = item.querySelector('.education-institution')?.value.trim();
            // Проверяем, заполнено ли *хоть что-то* еще
            const degree = item.querySelector('.education-degree')?.value.trim();
            const fieldOfStudy = item.querySelector('.education-field-of-study')?.value.trim();
            const startDate = item.querySelector('.education-start-date')?.value.trim();
            const endDate = item.querySelector('.education-end-date')?.value.trim();
            
            const anyOtherFieldFilled = degree || fieldOfStudy || startDate || endDate;

            // Если заполнено что-то, кроме заведения, а само заведение - нет
            if (anyOtherFieldFilled && !institution) {
                return 'error_education_incomplete';
            }
        }
        
        return null; // Все в порядке
    }


// ✅ ИСПРАВЛЕНИЕ #1: Промисифицированная загрузка React
async function loadReactIslands() {
    // ... (код без изменений) ...
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

// ✅ ИСПРАВЛЕНИЕ #2: Улучшенный loadScript с retry
function loadScript(src, retries = 3) {
    console.log(`⏳ Загружается скрипт: ${src}`);
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`⚠️ Скрипт ${src} уже был загружен.`);
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.type = 'module';
        script.src = src;
        let attempts = 0;
        const tryLoad = () => {
            attempts++;
            script.onload = () => {
                console.log(`✅ Скрипт ${src} успешно загружен (попытка ${attempts}/${retries}).`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ ОШИБКА загрузки ${src} (попытка ${attempts}/${retries})`);
                if (attempts < retries) {
                    console.log(`🔄 Повтор через 1 секунду...`);
                    setTimeout(() => {
                        document.body.removeChild(script);
                        const newScript = script.cloneNode();
                        newScript.onload = script.onload;
                        newScript.onerror = script.onerror;
                        document.body.appendChild(newScript);
                    }, 1000);
                } else {
                    reject(new Error(`Failed to load script ${src} after ${retries} attempts`));
                }
            };
        };
        document.body.appendChild(script);
        tryLoad();
    });
}

    // --- НАСТРОЙКА СОБЫТИЙ ---
    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
    // Удалены все обработчики для HTML-кнопок "Назад"
    function setupEventListeners() {
            // ... (код без изменений) ...
            document.addEventListener('show-my-posts', () => {
                loadMyPostsFeedData();
            });
            document.addEventListener('show-all-posts', () => {
                loadPostsFeedData(); 
                document.dispatchEvent(new CustomEvent('set-posts-feed-mode', {
                    detail: { showMyPostsOnly: false }
                }));
            });
            
            // ✅ НОВОЕ (Задача 6): Слушаем событие от React-кнопки
            document.addEventListener('openCreatePostModal', () => {
                showCreatePostModal();
            });

        tg.MainButton.onClick(() => {
            if (elements.formContainer.style.display === 'block') {
                saveProfileData();
            } else if (elements.postModal.modal.style.display === 'block') {
                savePostData();
            }
        });

        // (ИЗМЕНЕНИЕ) Эта переменная будет хранить {key, text} выбранного статуса
        let modalSelectedStatus = null; 

        document.addEventListener('openSkillsModal', (event) => {
            // ... (код без изменений) ...
            const { source, skills } = event.detail;
            console.log(`APP.JS: Поймал событие openSkillsModal от [${source}]`, skills);
            state.skillsModalSource = source; 
            state.selectedSkills = [...skills];
            modalSelectedStatus = null;
            const statusContainer = elements.skills.statusFilterContainer;
            
            // --- (ИЗМЕНЕНИЕ) ---
            // Теперь показываем фильтр статусов И для 'postsFeed', И для 'editPostModal'
            if (state.skillsModalSource === 'postsFeed' || state.skillsModalSource === 'editPostModal') {
                statusContainer.style.display = 'block';
                
                let currentStatusKey = null;
                // Ищем ключ в зависимости от источника
                if (state.skillsModalSource === 'postsFeed') {
                    currentStatusKey = elements.posts.postsStatusFilterInput.value || null;
                } else if (state.skillsModalSource === 'editPostModal') {
                    // Источник 'editPostModal' не фильтрует по статусу,
                    // поэтому currentStatusKey остается null.
                    // Но мы можем захотеть скрыть этот блок, если он не нужен в окне редактирования.
                    // Пока оставим его видимым, но неактивным.
                    // ---
                    // ОБНОВЛЕНИЕ: Давайте скроем его для 'editPostModal', т.к. там нет фильтра
                    statusContainer.style.display = 'none';
                    if(state.skillsModalSource === 'postsFeed') {
                         statusContainer.style.display = 'block';
                    }
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
            
            // --- ИСПРАВЛЕНИЕ #1 (Начало) ---
            // Мы не можем использовать arguments.callee в стрелочной функции.
            // Мы должны определить именованную функцию и передать ее.
            
            // 1. Определяем именованную функцию-коллбэк
            function onToggleSkillInModal(skill) {
                if (state.selectedSkills.includes(skill)) {
                    state.selectedSkills = state.selectedSkills.filter(s => s !== skill);
                } else {
                    state.selectedSkills.push(skill);
                }
                // 2. Вызываем UI.renderSkillSelectionForm, передавая САМУ СЕБЯ (onToggleSkillInModal)
                UI.renderSkillSelectionForm(
                    elements.skills.listContainer, 
                    state.selectedSkills, 
                    SKILL_CATEGORIES, 
                    t, 
                    onToggleSkillInModal // <-- Рекурсивная передача
                );
            }

            // 3. Вызываем UI.renderSkillSelectionForm в первый раз
            UI.renderSkillSelectionForm(
                elements.skills.listContainer,
                state.selectedSkills,
                SKILL_CATEGORIES,
                t,
                onToggleSkillInModal // <-- Передаем нашу новую функцию
            );
            // --- ИСПРАВЛЕНИЕ #1 (Конец) ---
            
            elements.skills.modal.classList.remove('screen-fade-in');
            
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // Определяем, куда вернет кнопка "Назад"
            let onBackAction;
            if (state.skillsModalSource === 'form') {
                onBackAction = () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
            } else if (state.skillsModalSource === 'postModal') {
                onBackAction = () => UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);
            } else if (state.skillsModalSource === 'feed') {
                onBackAction = loadFeedData;
            } else if (state.skillsModalSource === 'postsFeed') {
                onBackAction = loadPostsFeedData;
            } else if (state.skillsModalSource === 'editPostModal') {
                // Возвращаемся в ленту постов (где открыта React-модалка)
                onBackAction = loadPostsFeedData; 
            } else {
                onBackAction = loadProfileData; // Фоллбэк
            }
            
            UI.showView(elements.skillsModal, elements.allViews, elements.spinner, tg, t, onBackAction);
        });

        // --- (ИЗМЕНЕНИЕ) ---
        // Передаем `tg` и `t` в импортированную функцию
        linksManager = setupDynamicList(tg, t, elements.form.addLinkButton, elements.form.linksContainer, elements.form.linkTemplate, 5);
        experienceManager = setupDynamicList(tg, t, elements.form.addExperienceButton, elements.form.experienceContainer, elements.form.experienceTemplate, 10);
        educationManager = setupDynamicList(tg, t, elements.form.addEducationButton, elements.form.educationContainer, elements.form.educationTemplate, 5);
        // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---

        elements.welcomeContainer.querySelector('#create-profile-button').addEventListener('click', () => {
            // ... (код без изменений) ...
            elements.form.nameField.value = tg.initDataUnsafe?.user?.first_name || t('default_user_name');
            elements.form.bioField.value = '';
            // (УДАЛЕНО) if (state.tomSelectInstance) { state.tomSelectInstance.clear(); }
            elements.form.skillsField.value = '';
            const previewImg = elements.form.avatarPreview;
            previewImg.src = 'https://t.me/i/userpic/320/null.jpg';
            UI.initAvatarFader(previewImg);
            state.selectedFile = null;
            if (linksManager?.renderItems) linksManager.renderItems([]);
            if (experienceManager?.renderItems) experienceManager.renderItems([]);
            if (educationManager?.renderItems) educationManager.renderItems([]);
            
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // При переходе на форму, кнопка "Назад" должна вернуть в loadProfileData 
            // (которая покажет Welcome, т.к. профиль не создан)
            UI.showView(
                elements.formContainer, 
                elements.allViews, 
                elements.spinner, 
                tg, 
                t,
                loadProfileData // Вернуться на экран "Привет" (через loadProfileData)
            );
        });

        if (elements.profile.viewFeedButton) elements.profile.viewFeedButton.addEventListener('click', loadFeedData);
        if (elements.profile.viewPostsFeedButton) {
            elements.profile.viewPostsFeedButton.addEventListener('click', loadPostsFeedData);
        }
        
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Все эти обработчики кнопок "Назад" УДАЛЕНЫ,
        // так как они управляются через UI.showView()
        
        // if (elements.posts.backToProfileButton) ... (УДАЛЕНО)
        // if (elements.postModal.closeButton) ... (УДАЛЕНО)
        // if (elements.feed.backToProfileButton) ... (УДАЛЕНО)
        // if (elements.form.backToProfileFromEditButton) ... (УДАЛЕНО)
        // if (elements.detail.headerBackButton) ... (УДАЛЕНО)

        if (elements.profile.logoutButton) elements.profile.logoutButton.addEventListener('click', () => {
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // "Редактировать" (logoutButton) - кнопка "Назад" должна вернуть в Профиль
            UI.showView(
                elements.formContainer, 
                elements.allViews, 
                elements.spinner, 
                tg, 
                t,
                loadProfileData // Вернуться в профиль
            );
        });
        
        if (elements.detail.headerActionsButton) {
            elements.detail.headerActionsButton.addEventListener('click', () => {
                // ИСПОЛЬЗУЕМ TOAST
                UI.showToast(t('actions_menu_placeholder', {defaultValue: "Меню действий (Пожаловаться и т.д.) в разработке."}));
            });
        }
        // Обработчик кнопки "Написать" (Контакт) в детальном просмотре
        if (elements.detail.fabContactButton) {
            elements.detail.fabContactButton.addEventListener('click', async () => {
                // ... (код без изменений) ...
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

        // Обработчик кнопки "Подписаться/Отписаться" в детальном просмотре
        if (elements.detail.fabFollowButton) {
            elements.detail.fabFollowButton.addEventListener('click', async () => {
                // ... (код без изменений) ...
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
                    if (!result.ok) {
                        throw new Error(result.error || 'Follow/unfollow failed');
                    } else {
                        if (tg.HapticFeedback?.impactOccurred) {
                            tg.HapticFeedback.impactOccurred('light');
                        }
                    }
                } catch (error) {
                    console.error('Follow/Unfollow error:', error);
                    UI.showToast(t('error_follow_generic'), true);
                    button.classList.toggle('is-unfollow');
                    button.innerHTML = isCurrentlyFollowing ? iconUnfollow : iconFollow;
                    button.title = t(isCurrentlyFollowing ? 'unfollow_button' : 'follow_button');
                }
            });
        }
        
        if (elements.profile.settingsButton) elements.profile.settingsButton.addEventListener('click', () => {
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // При переходе в Настройки, кнопка "Назад" должна вернуть в Профиль
            UI.showView(
                elements.settingsContainer, 
                elements.allViews, 
                elements.spinner, 
                tg, 
                t,
                loadProfileData // Вернуться в профиль
            );
        });
        
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Этот обработчик УДАЛЕН
        // if (elements.settings.backToProfileFromSettingsButton) ... (УДАЛЕНО)
        
        if (elements.settings.langBtnRu) elements.settings.langBtnRu.addEventListener('click', () => setLanguage('ru'));
        if (elements.settings.langBtnEn) elements.settings.langBtnEn.addEventListener('click', () => setLanguage('en'));
        
        // (НОВЫЙ БЛОК) Слушатель переключателя "Стекла"
        if (elements.settings.glassToggle) {
            elements.settings.glassToggle.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                const currentTheme = state.currentUserProfile.theme || 'auto';
                
                // Проверяем, совместима ли тема
                if (isEnabled && (currentTheme === 'auto' || currentTheme === 'custom')) {
                    // НЕЛЬЗЯ
                    e.target.checked = false; // Отменяем
                    
                    // Анимация тряски
                    if (elements.settings.glassToggleWrapper) {
                        elements.settings.glassToggleWrapper.classList.add('input-shake');
                        setTimeout(() => {
                            elements.settings.glassToggleWrapper.classList.remove('input-shake');
                        }, 600);
                    }
                    
                    // Показываем ошибку
                    UI.showToast(t('glass_mode_error'), true);
                    return;
                }
                
                // МОЖНО
                state.currentUserProfile.is_glass_enabled = isEnabled;
                applyGlass(isEnabled);
                
                // Сохраняем в БД (без ожидания)
                try {
                    await api.saveGlassPreference(tg.initData, isEnabled);
                    console.log(`Glass mode ${isEnabled ? 'enabled' : 'disabled'} and saved.`);
                } catch (error) {
                    console.error("Error saving glass preference:", error);
                    // (Откатывать UI не будем, т.к. это не критично)
                }
            });
        }
        
        // (ИЗМЕНЕННЫЙ БЛОК) Слушатели кнопок тем
        elements.settings.themeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', async () => {
                    const selectedTheme = button.dataset.theme;
                    if (!selectedTheme) return;

                    // 1. Применяем основную тему
                    applyTheme(tg, t, elements.settings, state.currentUserProfile, selectedTheme, state.currentUserProfile.custom_theme);
                    state.currentUserProfile.theme = selectedTheme; // Обновляем состояние

                    // 2. (НОВОЕ) Проверяем, нужно ли отключить "Стекло"
                    if (selectedTheme === 'auto' || selectedTheme === 'custom') {
                        if (elements.settings.glassToggle.checked) {
                            console.log("Glass mode disabled due to incompatible theme change.");
                            elements.settings.glassToggle.checked = false;
                            state.currentUserProfile.is_glass_enabled = false;
                            applyGlass(false); // Визуально отключаем
                            
                            // Сохраняем отключение "Стекла" в БД
                            try {
                                await api.saveGlassPreference(tg.initData, false);
                            } catch (error) {
                                console.warn("Failed to auto-save glass preference (disabled):", error);
                            }
                        }
                    }

                    // 3. Сохраняем ОСНОВНУЮ тему в БД (старая логика)
                    if (selectedTheme !== 'custom') {
                        try {
                            await api.saveThemeSelection(tg.initData, selectedTheme, state.currentLang);
                            console.log(`Theme '${selectedTheme}' saved.`);
                        } catch (error) {
                            console.error("Error saving theme:", error);
                            UI.showToast(t('error_theme_save'), true);
                        }
                    } else {
                        try {
                            await api.activateCustomTheme(tg.initData, state.currentLang);
                            console.log(`Theme 'custom' activated.`);
                        } catch (error) {
                            console.error("Error activating custom theme:", error);
                            UI.showToast(t('error_theme_save'), true);
                        }
                    }
                });
            }
        });

        // Обработчик кнопки сохранения кастомной темы
        if (elements.settings.saveCustomThemeButton) {
            elements.settings.saveCustomThemeButton.addEventListener('click', async () => {
                // ... (код без изменений) ...
                const customColors = {
                    bg: elements.settings.colorInputBg.value,
                    button: elements.settings.colorInputButton.value,
                    text: elements.settings.colorInputText.value
                };
                applyTheme(tg, t, elements.settings, state.currentUserProfile, 'custom', JSON.stringify(customColors));
                try {
                    const result = await api.saveCustomTheme(tg.initData, customColors, state.currentLang);
                    if (result.ok) {
                        state.currentUserProfile.custom_theme = JSON.stringify(customColors);
                        state.currentUserProfile.theme = 'custom';
                        console.log("Custom theme colors saved:", customColors);
                        UI.showToast(t('theme_custom_saved_success'), false);
                    } else {
                        throw new Error(result.error || 'Unknown error');
                    }
                } catch (error) {
                    console.error("Error saving custom theme colors:", error);
                    UI.showToast(t('error_theme_save'), true);
                    applyTheme(tg, t, elements.settings, state.currentUserProfile, state.currentUserProfile.theme || 'auto', state.currentUserProfile.custom_theme);
                }
            });
        }
        if (elements.profile.shareButton) {
            elements.profile.shareButton.addEventListener('click', () => {
                // ... (код без изменений) ...
                if (!state.CONFIG.botUsername || !state.CONFIG.appSlug || !state.currentUserProfile.user_id) {
                    console.error("Share error: Missing config or user ID");
                    UI.showToast(t('error_share_generic'), true);
                    return;
                }
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
            // ... (код без изменений) ...
            const file = event.target.files[0];
            if (file) {
                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                    UI.showToast(t('error_photo_type'), true);
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    UI.showToast(t('error_photo_size'), true);
                    return;
                }
                state.selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    elements.form.avatarPreview.src = e.target.result;
                    UI.initAvatarFader(elements.form.avatarPreview);
                }
                reader.readAsDataURL(file);
                tg.MainButton.show();
            }
        });
    }
        if (elements.feed.searchInput) {
            elements.feed.searchInput.addEventListener('input', () => { /* React слушает сам */ });
        }
        if (elements.posts.searchInput) {
            elements.posts.searchInput.addEventListener('input', () => { /* React слушает сам */ });
        }

        // (ВОССТАНОВЛЕН ОБРАБОТЧИК)
        if (elements.form.openSkillsModalButton) {
            // ... (код без изменений) ...
            elements.form.openSkillsModalButton.addEventListener('click', () => {
                state.skillsModalSource = 'form';
                const currentSkills = elements.form.skillsField.value.split(',').map(s => s.trim()).filter(s => s);
                state.selectedSkills = [...currentSkills];
                
                // --- ИСПРАВЛЕНИЕ #3 (Начало) ---
                // Та же самая логика, что и в ИСПРАВЛЕНИИ #1
                function onToggleSkillInFormModal(skill) {
                    if (state.selectedSkills.includes(skill)) {
                        state.selectedSkills = state.selectedSkills.filter(s => s !== skill);
                    } else {
                        state.selectedSkills.push(skill);
                    }
                    UI.renderSkillSelectionForm(
                        elements.skills.listContainer, 
                        state.selectedSkills, 
                        SKILL_CATEGORIES, 
                        t, 
                        onToggleSkillInFormModal // <-- Рекурсивная передача
                    );
                }
                
                UI.renderSkillSelectionForm(
                    elements.skills.listContainer, 
                    state.selectedSkills, // Используем state.selectedSkills
                    SKILL_CATEGORIES, 
                    t, 
                    onToggleSkillInFormModal
                );
                // --- ИСПРАВЛЕНИЕ #3 (Конец) ---

                elements.skills.modal.classList.remove('screen-fade-in');
                // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
                // Устанавливаем "Назад" на возврат в Форму
                UI.showView(
                    elements.skillsModal, 
                    elements.allViews, 
                    elements.spinner, 
                    tg, 
                    t,
                    // Оборачиваем в функцию, чтобы UI.showView() 
                    // правильно установил кнопку "Назад"
                    () => UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData)
                );
            });
        }
        
        // (ВОССТАНОВЛЕН ОБРАБОТЧИК)
        if (elements.feed.openSkillsModalButtonFeed) {
             elements.feed.openSkillsModalButtonFeed.addEventListener('click', () => {
                // Этот код слушает React (react-feed.js)
             });
        }
        
        // (ВОССТАНОВЛЕН ОБРАБОТЧИК)
        if (elements.posts.openSkillsModalButton) {
             elements.posts.openSkillsModalButton.addEventListener('click', () => {
                // Этот код слушает React (react-posts-feed.js)
             });
        }
        
        // --- НОВЫЙ ОБРАБОТЧИК ДЛЯ КНОПКИ "ОПУБЛИКОВАТЬ" ---
        if (elements.postModal.saveButton) {
            elements.postModal.saveButton.addEventListener('click', () => {
                // Вызываем ту же функцию, что и главная кнопка
                savePostData();
            });
        }
        // --- КОНЕЦ НОВОГО ОБРАБОТЧИКА ---
        
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Этот обработчик УДАЛЕН
        // if (elements.postModal.closeButton) ... (УДАЛЕНО)
        
        // (ИЗМЕНЕНИЕ) Этот слушатель 'saveButton' полностью заменен
        if (elements.skills.saveButton) {
            elements.skills.saveButton.addEventListener('click', () => {
                if (state.skillsModalSource === 'form') {
                    elements.form.skillsField.value = state.selectedSkills.join(', ');
                    tg.MainButton.show();
                    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Профиль
                    UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);

                } else if (state.skillsModalSource === 'postModal') {
                     elements.postModal.skillsField.value = state.selectedSkills.join(', ');
                    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Ленту Постов
                    UI.showView(elements.postModal.modal, elements.allViews, elements.spinner, tg, t, loadPostsFeedData);

                } else if (state.skillsModalSource === 'feed') {
                   // ИСПОЛЬЗУЕМ React Event
                   document.dispatchEvent(new CustomEvent('set-feed-mode', {
                       detail: { skills: state.selectedSkills }
                   }));
                   // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Профиль
                   UI.showView(elements.feedContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);

                } else if (state.skillsModalSource === 'postsFeed') {
                    
                    // ИСПОЛЬЗУЕМ React Event
                    document.dispatchEvent(new CustomEvent('set-posts-feed-mode', {
                       detail: { 
                           skills: state.selectedSkills,
                           status: modalSelectedStatus ? modalSelectedStatus.key : null
                       }
                   }));
                    
                    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Профиль
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);

                // --- (НОВЫЙ БЛОК) ---
                } else if (state.skillsModalSource === 'editPostModal') {
                    // 1. Отправляем событие, которое слушает React
                    document.dispatchEvent(new CustomEvent('skills-updated-for-post', {
                       detail: { skills: state.selectedSkills }
                    }));
                    // 2. Возвращаем пользователя в модальное окно (которое HTML, но React в нем живет)
                    // (Примечание: React сам управляет своим внутренним UI,
                    // но мы должны показать HTML-контейнер, в котором он живет)
                    
                    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Профиль
                    UI.showView(elements.posts.container, elements.allViews, elements.spinner, tg, t, loadProfileData);
                    
                } else {
                    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Устанавливаем "Назад" на Профиль (фоллбэк)
                    UI.showView(elements.formContainer, elements.allViews, elements.spinner, tg, t, loadProfileData);
                }
            });
        }

        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // Этот обработчик УДАЛЕН
        // if (elements.skills.closeButton) ... (УДАЛЕНО)
        
        // --- ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Глобальный обработчик кнопки "Назад" УДАЛЕН ---
        // tg.BackButton.show();
        // tg.BackButton.onClick(() => { ... });
        // --- КОНЕЦ УДАЛЕНИЯ ---
        
    } // Конец функции setupEventListeners
    
    // (УДАЛЕНО) Пинг Статуса
    // async function updateOnlineStatus() { ... }

// ✅ ИСПРАВЛЕНИЕ #3: Главная функция main с правильным порядком
    async function main() {
    UI.showSpinner(elements.spinner, elements.allViews);
    try {
        // 1. Язык
        const initialLang = getInitialLanguage();
        await setLanguage(initialLang, true);
        console.log("✅ Язык загружен");

        // 2. Конфиг (КРИТИЧНО!)
        console.log("⏳ Загрузка конфига..."); 
        const configData = await api.loadConfig(); 
        state.CONFIG = configData; 
        state.CONFIG.backendUrl = state.CONFIG.backendUrl || window.location.origin; 
        api.setApiConfig(state.CONFIG);
        
        // ✅ СНАЧАЛА устанавливаем глобальный конфиг
        window.__CONFIG = state.CONFIG;
        console.log("✅ Конфиг установлен:", state.CONFIG.backendUrl);

        // ✅ ТОЛЬКО ТЕПЕРЬ загружаем React (с ожиданием!)
        console.log("⏳ Загрузка React-островков...");
        await loadReactIslands(); // AWAIT!!!
        console.log("✅ React-островки загружены");

        // 4. (УДАЛЕНО) Страны
        
        // 5. (УДАЛЕНО) Пинг
        
        // 6. События
        setupEventListeners();
        
        // 7. Deep Link
        state.targetUserIdFromLink = tg.initDataUnsafe?.start_param;
        
        // 8. Профиль (только после React!)
        console.log("⏳ Загрузка профиля...");
        await loadProfileData();
        console.log("✅ Профиль загружен");
        
        // 9. Deep Link логика
        if (state.targetUserIdFromLink && state.isRegistered) { 
            await loadTargetUserProfile(state.targetUserIdFromLink); 
            state.targetUserIdFromLink = null; 
        }
        else if (state.targetUserIdFromLink && !state.isRegistered) { 
            // ИСПОЛЬЗУЕМ TOAST
            UI.showToast(t('error_must_create_profile'), true);
            // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
            // Устанавливаем "Назад" на loadProfileData (которая покажет Welcome)
            UI.showView(
                elements.formContainer, 
                elements.allViews, 
                elements.spinner, 
                tg, 
                t,
                loadProfileData 
            ); 
            elements.form.nameField.value = tg.initDataUnsafe?.user?.first_name || ''; 
            elements.form.bioField.value = ''; 
            // (УДАЛЕНО) if(state.tomSelectInstance) state.tomSelectInstance.clear(); 
            elements.form.skillsField.value = ''; 
            if (linksManager?.renderItems) linksManager.renderItems([]); 
            if (experienceManager?.renderItems) experienceManager.renderItems([]); 
            if (educationManager?.renderItems) educationManager.renderItems([]); 
            state.targetUserIdFromLink = null; 
        }
        // Функция проверки мобильного устройства
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        
        // Fullscreen только на мобильных
        if (isMobileDevice() && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
            try {
                if (typeof tg.requestFullscreen === 'function') {
                    await tg.requestFullscreen();
                    console.log('✅ Fullscreen включен');
                    
                        setTimeout(() => {
                        // Применяем padding ко всем экранам
                        const screens = document.querySelectorAll('.screen');
                        screens.forEach(screen => {
                            screen.style.paddingTop = '60px';
                        });
                        console.log('✅ Padding применён к экранам');
                    }, 300);
                }
            } catch (e) {
                console.warn('⚠️ Fullscreen недоступен:', e);
            }
        }
        
        // --- 🔴 ИЗМЕНЕНИЕ ЗДЕСЬ ---
        // Блок tg.disableVerticalSwipes() УДАЛЕН отсюда.
        // Управление свайпами теперь будет на уровне карточек в React.
        // (Старый код УДАЛЕН)
        // if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
        //     if (typeof tg.disableVerticalSwipes === 'function') {
        //         tg.disableVerticalSwipes();
        //         console.log('✅ Свайп отключен');
        //     }
        // }
        
    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в main:', error); 
        const fallbackError = "Не удалось загрузить приложение."; 
        try { 
            // ИСПОЛЬЗУЕМ TOAST
            UI.showToast(t('error_critical', {error: error.message || fallbackError}), true);
        } catch { 
            alert(`Критическая ошибка: ${error.message || fallbackError}`); 
        }
        UI.hideSpinner(elements.spinner); 
        // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
        // ✅ (Fullscreen Nav) onBackAction = () => tg.close() (кнопка "Close")
            UI.showView(
            elements.profileViewContainer,
            elements.allViews,
            elements.spinner,
            tg,
            t,
            undefined // Теперь !onBackAction: скрываем Back, показываем Settings с tg.close()
            );
    }
}

    // Запуск!
    main();

}); // Конец DOMContentLoaded