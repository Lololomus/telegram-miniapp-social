// js/theme.js
// ОБНОВЛЕНО (Glass + tokens): applyTheme теперь обновляет CSS‑переменные

import { getLuminance, shadeColor } from './vanilla_utils.js';

/**
 * Применяет выбранную тему к UI
 * @param {object} tg - Telegram WebApp object
 * @param {function} t - Translation function
 * @param {object|null} settingsElements - elements.settings из app.js (может быть null)
 * @param {object|null} profile - объект профиля пользователя
 * @param {string} theme - 'auto' | 'light' | 'dark' | 'custom'
 * @param {string|null} custom_theme_json - JSON с кастомными цветами
 */
export function applyTheme(
  tg,
  t,
  settingsElements,
  profile,
  theme,
  custom_theme_json = null
) {
  const root = document.documentElement;

  // Фоллбэк
  if (!theme) theme = 'auto';

  // Сбрасываем классы тем (стекло переключается отдельно через applyGlass)
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-custom');

  // Если настроек нет (очень ранний вызов) — принудительно auto
  if (!settingsElements) {
    console.warn(
      "applyTheme вызван без объекта elements.settings, принудительно 'auto'"
    );
    theme = 'auto';
  }

  let currentThemeClass = null; // класс для body
  let bgColor; // основной фон
  let buttonColor; // цвет кнопок
  let buttonTextColor; // цвет текста на кнопках

  // ---- 1. Разбираем кастомную тему (если есть) ----
  let currentCustomTheme = {};
  try {
    if (custom_theme_json) {
      currentCustomTheme = JSON.parse(custom_theme_json);
    } else if (profile && profile.custom_theme) {
      currentCustomTheme = JSON.parse(profile.custom_theme);
    } else {
      // Фоллбэк кастомки по умолчанию
      if (tg?.colorScheme === 'dark') {
        currentCustomTheme = {
          bg: '#1c1c1d',
          button: '#0a84ff',
          text: '#ffffff',
        };
      } else {
        currentCustomTheme = {
          bg: '#ffffff',
          button: '#007aff',
          text: '#000000',
        };
      }
    }
  } catch (e) {
    currentCustomTheme = { bg: '#1c1c1d', button: '#0a84ff', text: '#ffffff' };
  }

  // Гарантируем наличие полей
  currentCustomTheme.bg ||= '#1c1c1d';
  currentCustomTheme.button ||= '#0a84ff';
  currentCustomTheme.text ||= '#ffffff';

  // ---- 2. Определяем цвета по выбранной теме ----
  if (theme === 'light') {
    currentThemeClass = 'theme-light';
    bgColor = '#ffffff';
    buttonColor = '#007aff';
    buttonTextColor = '#ffffff';
  } else if (theme === 'dark') {
    currentThemeClass = 'theme-dark';
    // Глубокий тёмно‑серый фон
    bgColor = '#050505';
    buttonColor = '#0a84ff';       // оставляем синий ТОЛЬКО как цвет action‑кнопок
    buttonTextColor = '#ffffff';
  } else if (theme === 'custom') {
    currentThemeClass = 'theme-custom';

    const colors = currentCustomTheme;

    // Подбираем вторичный фон и цвет текста на кнопке по яркости
    const bgLum = getLuminance(colors.bg);
    const secondaryBg =
      bgLum > 0.5
        ? shadeColor(colors.bg, -0.05)
        : shadeColor(colors.bg, 0.1);

    const btnLum = getLuminance(colors.button);
    const computedBtnTextColor = btnLum > 0.5 ? '#000000' : '#ffffff';

    // Заполняем кастомные переменные
    root.style.setProperty('--custom-bg-color', colors.bg);
    root.style.setProperty('--custom-secondary-bg-color', secondaryBg);
    root.style.setProperty('--custom-text-color', colors.text);
    root.style.setProperty('--custom-button-color', colors.button);
    root.style.setProperty('--custom-button-text-color', computedBtnTextColor);

    // Базовые цвета для Telegram API / основных токенов
    bgColor = colors.bg;
    buttonColor = colors.button;
    buttonTextColor = computedBtnTextColor;

    // Обновляем color‑input'ы, если они есть
    if (settingsElements?.colorInputBg) {
      settingsElements.colorInputBg.value = colors.bg;
    }
    if (settingsElements?.colorInputButton) {
      settingsElements.colorInputButton.value = colors.button;
    }
    if (settingsElements?.colorInputText) {
      settingsElements.colorInputText.value = colors.text;
    }
    } else { // theme === 'auto'
    // Определяем, что хочет Telegram: светлую или тёмную
    const tp = tg?.themeParams || {};
    const systemScheme =
        tg?.colorScheme ||
        (tp.bg_color && getLuminance(tp.bg_color) < 0.5 ? 'dark' : 'light');

    if (systemScheme === 'dark') {
        // Авто + тёмная = МОЯ тёмная тема
        currentThemeClass = 'theme-dark';
        bgColor = '#09090b';      // как в :root в style.css
        buttonColor = '#0a84ff';
        buttonTextColor = '#ffffff';
    } else {
        // Авто + светлая = МОЯ светлая тема
        currentThemeClass = 'theme-light';
        bgColor = '#ffffff';
        buttonColor = '#007aff';
        buttonTextColor = '#ffffff';
    }
    }

  // Вешаем класс темы на body (кроме auto)
  if (currentThemeClass) {
    document.body.classList.add(currentThemeClass);
  }

  // ---- 3. Синхронизируем CSS‑переменные токенов ----
  // Эти токены использует твой CSS (profile.css, feed.css, settings.css и т.д.)
  const baseBg = bgColor || '#ffffff';

  // Вторичный фон: либо из Telegram, либо вычисляем от основного
  let secondaryBg;
  try {
    const tp = tg?.themeParams || {};
    if (tp.secondary_bg_color) {
      secondaryBg = tp.secondary_bg_color;
    } else if (theme === 'dark') {
    currentThemeClass = 'theme-dark';
    // ✅ НОВЫЕ ЦВЕТА
    bgColor = '#0f0f11';         
    buttonColor = '#6366f1'; 
    buttonTextColor = '#ffffff';
  } else {
      const lum = getLuminance(baseBg);
      secondaryBg = shadeColor(baseBg, lum > 0.5 ? -0.06 : 0.1);
    }
  } catch (e) {
    secondaryBg = theme === 'dark' ? '#161616' : '#18181b';
  }

  const tp = tg?.themeParams || {};

  const textColor =
    tp.text_color ||
    (theme === 'light'
      ? '#111827'
      : theme === 'dark'
      ? '#f3f4f6'
      : '#f3f4f6');

  const hintColor =
    tp.hint_color ||
    (theme === 'light' ? '#6b7280' : '#9ca3af');

  const linkColor =
    tp.link_color || buttonColor || '#007aff';

    const safeSet = (name, value) => {
    if (value != null) root.style.setProperty(name, String(value));
    };

    safeSet('--main-bg-color', baseBg);
    safeSet('--secondary-bg-color', secondaryBg);
    safeSet('--main-text-color', textColor);
    safeSet('--main-hint-color', hintColor);
    safeSet('--main-hint-opacity', '1');
    safeSet('--main-button-color', buttonColor || '#007aff');
    safeSet('--main-button-text-color', buttonTextColor || '#ffffff');

    // 4. Подсветка выбранной темы
    if (settingsElements?.themeButtons) {
    settingsElements.themeButtons.forEach((button) => {
        if (!button) return;
        const isActive = button.dataset.theme === theme;
        button.classList.toggle('active', isActive);
    });
    }
}
export function applyGlass(isEnabled) {
  document.body.classList.toggle('theme-glass-overlay', !!isEnabled);
  document.body.classList.toggle('has-glass-background', !!isEnabled);
}
