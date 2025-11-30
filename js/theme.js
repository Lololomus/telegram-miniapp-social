// js/theme.js
// ОБНОВЛЕНО (Glass): Добавлена функция applyGlass
import { getLuminance, shadeColor } from './vanilla_utils.js';

/**
 * Применяет выбранную тему к UI
 * @param {object} tg - Telegram WebApp object
 * @param {function} t - Translation function
 * @param {object} settingsElements - Object containing settings DOM elements (like elements.settings from app.js)
 * @param {object} profile - User profile object
 * @param {string} theme - Theme name ('auto', 'light', 'dark', 'custom')
 * @param {string|null} custom_theme_json - JSON string of custom colors
 */
export function applyTheme(tg, t, settingsElements, profile, theme, custom_theme_json = null) {
    const root = document.documentElement;
    // Всегда очищаем предыдущие классы темы
    // (НОВОЕ) Также очищаем классы "Стекла", т.к. applyTheme - это полный сброс
    document.body.classList.remove(
        'theme-light', 
        'theme-dark', 
        'theme-custom',
        'theme-glass-overlay', // <--- НОВЫЙ КЛАСС
        'has-glass-background' // <--- НОВЫЙ КЛАСС
    );

    // Проверка на settingsElements
    if (!settingsElements) {
        console.warn("applyTheme вызван без объекта elements.settings! Применяется тема 'auto'.");
        theme = 'auto'; // Фоллбэк на авто
    }

    let currentThemeClass = null; // Класс для body (может быть null для 'auto')
    let bgColor, buttonColor, buttonTextColor; // Цвета для API Telegram
    let currentCustomTheme = {};

    // --- Определяем цвета для кастомной темы (если она есть) ---
    try {
        if (custom_theme_json) { 
            currentCustomTheme = JSON.parse(custom_theme_json); 
        } else if (profile && profile.custom_theme) { 
            currentCustomTheme = JSON.parse(profile.custom_theme); 
        } else { 
            // Фоллбэк, если кастомные не сохранены
            if (tg.colorScheme === 'dark') { 
                currentCustomTheme = {bg: '#1c1c1d', button: '#0a84ff', text: '#ffffff'}; 
            } else { 
                currentCustomTheme = {bg: '#ffffff', button: '#007aff', text: '#000000'}; 
            }
        }
    } catch(e) { 
        currentCustomTheme = {bg: '#1c1c1d', button: '#0a84ff', text: '#ffffff'}; 
    }
    currentCustomTheme.bg = currentCustomTheme.bg || '#1c1c1d';
    currentCustomTheme.button = currentCustomTheme.button || '#0a84ff';
    currentCustomTheme.text = currentCustomTheme.text || '#ffffff';

    // --- Логика определения темы и цветов ---
    if (theme === 'light') {
        currentThemeClass = 'theme-light';
        // Используем жестко заданные светлые цвета
        bgColor = '#ffffff';
        buttonColor = '#007aff';
        buttonTextColor = '#ffffff';
    } else if (theme === 'dark') {
        currentThemeClass = 'theme-dark';
        // Используем жестко заданные темные цвета
        bgColor = '#1c1c1d';
        buttonColor = '#0a84ff';
        buttonTextColor = '#ffffff';
    } else if (theme === 'custom') {
        currentThemeClass = 'theme-custom';
        const colors = currentCustomTheme;
        const bgLuminance = getLuminance(colors.bg);
        const secondaryBg = bgLuminance > 0.5 ? shadeColor(colors.bg, -0.05) : shadeColor(colors.bg, 0.1);
        const buttonLuminance = getLuminance(colors.button);
        const btnTextColor = buttonLuminance > 0.5 ? '#000000' : '#FFFFFF';
        // Устанавливаем CSS переменные для кастомной темы
        root.style.setProperty('--custom-bg-color', colors.bg);
        root.style.setProperty('--custom-button-color', colors.button);
        root.style.setProperty('--custom-secondary-bg-color', secondaryBg);
        root.style.setProperty('--custom-text-color', colors.text);
        root.style.setProperty('--custom-button-text-color', btnTextColor);
        // Задаем цвета для API Telegram
        bgColor = colors.bg;
        buttonColor = colors.button;
        buttonTextColor = btnTextColor;
        // Обновляем поля выбора цвета
        if (settingsElements?.colorInputBg) {
            settingsElements.colorInputBg.value = colors.bg;
            settingsElements.colorInputButton.value = colors.button;
            settingsElements.colorInputText.value = colors.text;
        }
    } else { // theme === 'auto'
        // *** НЕ добавляем класс на body ***
        currentThemeClass = null; // Класс не нужен, будем использовать переменные TG
        // *** Используем цвета ИЗ Telegram themeParams ***
        bgColor = tg.themeParams.bg_color || '#ffffff'; // Фоллбэк на белый
        buttonColor = tg.themeParams.button_color || '#007aff'; // Фоллбэк на синий
        buttonTextColor = tg.themeParams.button_text_color || '#ffffff'; // Фоллбэк на белый
    }

    // Добавляем класс на body (если он определен)
    if (currentThemeClass) {
        document.body.classList.add(currentThemeClass);
    }
    // Если класс НЕ определен (режим 'auto'), стили должны подхватываться
    // из CSS, где используются фоллбэки на переменные Telegram:
    // var(--main-bg-color, var(--tg-theme-bg-color, #ffffff))

    // --- Применяем цвета через API Telegram ---
    try {
        tg.setHeaderColor(bgColor);
        tg.setBackgroundColor(bgColor);
        tg.MainButton.setParams({
            color: buttonColor,
            text_color: buttonTextColor,
            text: t('save_button')
        });
    } catch (e) {
        console.error("Ошибка установки цветов интерфейса Telegram:", e);
    }

    // Обновляем состояние кнопок выбора темы в UI (если они есть)
    if (settingsElements?.themeButtons && settingsElements?.customThemeGroup) {
        updateThemeButtons(settingsElements.themeButtons, settingsElements.customThemeGroup, theme);
    }
}

/**
 * Обновляет состояние кнопок выбора темы
 */
export function updateThemeButtons(themeButtons, customThemeGroup, activeTheme) {
    if (!Array.isArray(themeButtons)) return;

    themeButtons.forEach(button => {
        if (button) {
            // Сравниваем текущую тему с data-theme кнопки
            const isActive = button.dataset.theme === activeTheme;
            button.classList.toggle('active', isActive);
        }
    });

    // 🔥 FIX: Проверяем существование группы перед обращением к style
    if (customThemeGroup) {
        customThemeGroup.style.display = (activeTheme === 'custom') ? 'block' : 'none';
    }
}

/**
 * (НОВАЯ ФУНКЦИЯ) Применяет или убирает эффект "Стекла"
 * @param {boolean} isEnabled - Включить или выключить эффект
 */
export function applyGlass(isEnabled) {
    // Этот класс 'theme-glass-overlay' будет основным триггером
    // для всех CSS-стилей "стекла".
    document.body.classList.toggle('theme-glass-overlay', isEnabled);
    
    // Этот класс 'has-glass-background' включает градиентный фон,
    // который "стекло" будет размывать.
    document.body.classList.toggle('has-glass-background', isEnabled);
}