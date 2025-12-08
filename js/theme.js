// js/theme.js
// ОБНОВЛЕНО: Упрощено до 3 тем (auto | light | dark), удалена custom тема

import { getLuminance, shadeColor } from './vanilla_utils.js';

/**
 * Применяет выбранную тему к UI
 * @param {object} tg - Telegram WebApp object
 * @param {function} t - Translation function
 * @param {object|null} settingsElements - elements.settings из app.js (может быть null)
 * @param {object|null} profile - объект профиля пользователя (не используется для тем)
 * @param {string} theme - 'auto' | 'light' | 'dark'
 */
export function applyTheme(
  tg,
  t,
  settingsElements,
  profile,
  theme
) {
  const root = document.documentElement;

  // Фоллбэк
  if (!theme) theme = 'auto';

  // Сбрасываем классы тем (стекло переключается отдельно через applyGlass)
  document.body.classList.remove('theme-light', 'theme-dark');

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

  // ---- Определяем цвета по выбранной теме ----
  if (theme === 'light') {
    currentThemeClass = 'theme-light';
    bgColor = '#FFFFFF';
    buttonColor = '#6366F1'; // Indigo
    buttonTextColor = '#FFFFFF';
  } else if (theme === 'dark') {
    currentThemeClass = 'theme-dark';
    bgColor = '#0F0F11'; // Глубокий тёмный
    buttonColor = '#6366F1'; // Indigo
    buttonTextColor = '#FFFFFF';
  } else {
    // theme === 'auto'
    // Определяем системную тему из Telegram
    const tp = tg?.themeParams || {};
    const systemScheme =
      tg?.colorScheme ||
      (tp.bg_color && getLuminance(tp.bg_color) < 0.5 ? 'dark' : 'light');

    if (systemScheme === 'dark') {
      // Авто + тёмная = наша тёмная тема
      currentThemeClass = 'theme-dark';
      bgColor = '#0F0F11';
      buttonColor = '#6366F1';
      buttonTextColor = '#FFFFFF';
    } else {
      // Авто + светлая = наша светлая тема
      currentThemeClass = 'theme-light';
      bgColor = '#FFFFFF';
      buttonColor = '#6366F1';
      buttonTextColor = '#FFFFFF';
    }
  }

  // Вешаем класс темы на body
  if (currentThemeClass) {
    document.body.classList.add(currentThemeClass);
  }

  // ---- Синхронизируем CSS‑переменные токенов ----
  const baseBg = bgColor || '#FFFFFF';

  // Вторичный фон: либо из Telegram, либо вычисляем от основного
  let secondaryBg;
  try {
    const tp = tg?.themeParams || {};
    if (tp.secondary_bg_color) {
      secondaryBg = tp.secondary_bg_color;
    } else if (theme === 'dark' || currentThemeClass === 'theme-dark') {
      secondaryBg = '#1A1A1D'; // Тёмный вторичный фон
    } else {
      secondaryBg = '#F9FAFB'; // Светлый вторичный фон
    }
  } catch (e) {
    secondaryBg = theme === 'dark' ? '#1A1A1D' : '#F9FAFB';
  }

  const tp = tg?.themeParams || {};
  const textColor =
    tp.text_color ||
    (currentThemeClass === 'theme-light'
      ? '#111827'
      : '#F3F4F6');

  const hintColor =
    tp.hint_color ||
    (currentThemeClass === 'theme-light' ? '#6B7280' : '#9CA3AF');

  const linkColor = tp.link_color || buttonColor;

  const safeSet = (name, value) => {
    if (value != null) root.style.setProperty(name, String(value));
  };

  safeSet('--main-bg-color', baseBg);
  safeSet('--secondary-bg-color', secondaryBg);
  safeSet('--main-text-color', textColor);
  safeSet('--main-hint-color', hintColor);
  safeSet('--main-hint-opacity', '1');
  safeSet('--main-button-color', buttonColor);
  safeSet('--main-button-text-color', buttonTextColor);

  // Подсветка выбранной темы в настройках
  if (settingsElements?.themeButtons) {
    settingsElements.themeButtons.forEach(button => {
      if (!button) return;
      const isActive = button.dataset.theme === theme;
      button.classList.toggle('active', isActive);
    });
  }
  
  // Диспатчим событие для React-компонентов
  document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme, bgColor, buttonColor } }));
}

/**
 * Включает/выключает glass mode
 * @param {boolean} isEnabled
 */
export function applyGlass(isEnabled) {
  document.body.classList.toggle('theme-glass-overlay', !!isEnabled);
  document.body.classList.toggle('has-glass-background', !!isEnabled);
}