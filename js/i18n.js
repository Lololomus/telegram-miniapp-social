// js/i18n.js
// ОБНОВЛЕНО: Добавлен новый ключ 'error_name_empty'
// ОБНОВЛЕНО (Glass): Добавлены ключи 'glass_mode_label' и 'glass_mode_error'
// УДАЛЕНО: 'nationality_placeholder_tomselect'
// ОБНОВЛЕНО (Задача 3): Добавлен ключ 'select_skills_button'

let translations = {};
export const supportedLangs = ['ru', 'en'];

/**
 * Загружает файл перевода
 */
export async function loadTranslations(lang) {
    try {
        const cacheBuster = `?v=${new Date().getTime()}`;
        // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
        // Добавлен слэш в начало, чтобы путь был от корня сайта
        const response = await fetch(`/locales/${lang}.json${cacheBuster}`);
        
        if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
        translations = await response.json();
        
        // Фоллбэк (УДАЛЕН)
        // translations['nationality_placeholder_tomselect'] = translations['nationality_placeholder_tomselect'] || "Выберите страну...";
        
    } catch (error) {
        console.error('Error loading translations:', error);
        if (lang !== 'ru') {
            await loadTranslations('ru'); // Рекурсивный фоллбэк на 'ru'
        }
    }
}

// Резервные переводы
const fallbackTranslations = {
    'error_must_create_profile': "Вы не можете смотреть профили, пока не создадите свой.",
    'error_name_empty': "Необходимо заполнить имя, чтобы создать профиль.", // <-- НОВЫЙ КЛЮЧ
    'error_post_content_empty': "Краткое описание не может быть пустым.",
    'error_critical': "Критическая ошибка: {error}",
    'error_save': "Ошибка сохранения: {error}",
    'error_save_network': "Ошибка сети. Не удалось сохранить.",
    'error_load_profile_network': "Ошибка сети. Не удалось загрузить профиль.",
    'error_profile_not_found': "Профиль не найден.",
    'error_load_profile_generic': "Не удалось загрузить профиль.",
    'error_open_chat_no_username': "У этого пользователя нет @username, чат открыть нельзя.",
    'error_open_chat_failed': "Не удалось открыть чат.",
    'error_follow_generic': "Не удалось выполнить действие.",
    'error_theme_save': "Не удалось сохранить тему.",
    'error_share_generic': "Не удалось получить ссылку для репоста.",
    'error_photo_type': "Неверный тип файла. (Нужен JPEG или PNG)",
    'error_photo_size': "Фото слишком большое (макс. 5 МБ).",
    'theme_custom_saved_success': "Кастомная тема сохранена!",
    'post_created_success': "Запрос успешно опубликован!",
    
    // Ошибки валидации (НОВЫЕ)
    'error_name_too_long': "Имя слишком длинное (макс. {limit} симв.)",
    'error_bio_too_long': "Описание 'О себе' слишком длинное (макс. {limit} симв.)",
    'error_skills_too_long': "Список навыков слишком длинный.",
    'error_experience_max_items': "Можно добавить макс. {limit} мест работы.",
    'error_education_max_items': "Можно добавить макс. {limit} мест учебы.",
    'error_post_content_too_long': "Краткое описание слишком длинное (макс. {limit} симв.)",
    'error_post_full_description_too_long': "Полное описание слишком длинное (макс. {limit} симв.)",
    'error_post_skills_too_long': "Список тегов для поста слишком длинный.",
    
    // --- (НОВЫЕ КЛЮЧИ - Задача 2) ---
    'error_experience_incomplete': "Блок 'Опыт работы' заполнен не полностью. Укажите и Должность, и Компанию.",
    'error_education_incomplete': "Блок 'Образование' заполнен не полностью. Укажите Учебное заведение.",
    // --- (КОНЕЦ) ---

    // --- (НОВЫЙ КЛЮЧ - Задача 3) ---
    'select_skills_button': "Выбрать навыки",
    // --- (КОНЕЦ) ---
    
    // --- (НОВЫЕ КЛЮЧИ ДЛЯ "СТЕКЛА") ---
    'glass_mode_label': "Режим 'Стекло' (Beta)",
    'glass_mode_error': "Режим 'Стекло' работает только с темами 'Светлая' или 'Темная'. Пожалуйста, смените тему."
}

/**
 * Возвращает переведенную строку по ключу
 */
export function t(key, params = {}) {
    // Сначала ищем в загруженных переводах
    let text = translations[key];
    
    // Если не нашли, ищем в резервных
    if (!text) {
        text = fallbackTranslations[key] || key;
    }
    
    // Подставляем параметры (если они есть)
    for (const param in params) {
        text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
    return text;
}