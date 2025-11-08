// js/api.js
// ОБНОВЛЕНО: Добавлена функция handleResponse для "пробрасывания" ошибок валидации
// ОБНОВЛЕНО (Glass): Добавлена функция saveGlassPreference

let CONFIG = {};

/**
 * Устанавливает конфигурацию, полученную из app.js
 */
export function setApiConfig(config) {
    CONFIG = config;
}

/**
 * НОВАЯ ФУНКЦИЯ
 * Обрабатывает fetch-ответ, пробрасывая ошибки как исключения
 */
async function handleResponse(response) {
    if (response.ok) {
        // Для 2xx статусов, просто возвращаем JSON
        return await response.json();
    }
    
    // Для 4xx, 5xx статусов (особенно 400 - Validation Error)
    let errorBody;
    try {
        // Пытаемся прочитать тело ошибки (там наш JSON с "details")
        errorBody = await response.json();
    } catch (e) {
        // Если тело не JSON, создаем стандартную ошибку
        errorBody = { ok: false, error: response.statusText || 'Unknown error' };
    }
    
    // Выбрасываем ошибку, чтобы ее поймал .catch() в app.js
    throw errorBody;
}


/**
 * Загружает /config
 */
export async function loadConfig() {
    const configResponse = await fetch('/config');
    // loadConfig - это исключение, он должен работать до того,
    // как мы сможем использовать handleResponse (т.к. нам нужен CONFIG)
    if (!configResponse.ok) {
        throw new Error(`Config fetch failed: ${configResponse.status} ${configResponse.statusText}`);
    }
    return await configResponse.json();
}

/**
 * Загружает профиль текущего пользователя
 */
export async function loadProfileData(initData) {
    const response = await fetch(`${CONFIG.backendUrl}/get-profile`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ initData: initData }) 
    });
    // Используем handleResponse, хотя здесь ошибок не ожидаем
    return await handleResponse(response);
}

/**
 * Загружает профиль конкретного пользователя по ID
 */
export async function loadTargetUserProfile(initData, target_user_id) {
    const response = await fetch(`${CONFIG.backendUrl}/get-user-by-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, target_user_id: target_user_id })
    });
    return await handleResponse(response);
}

/**
 * Сохраняет (создает/обновляет) профиль пользователя
 */
export async function saveProfileData(formData) {
    const response = await fetch(`${CONFIG.backendUrl}/save-profile`, { 
        method: 'POST', 
        body: formData 
    });
    // handleResponse поймает ошибку 400 Validation Error
    return await handleResponse(response);
}

/**
 * Загружает всех пользователей для ленты
 */
export async function loadFeedData(initData) {
    const response = await fetch(`${CONFIG.backendUrl}/get-all-profiles`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ initData: initData }) 
    });
    return await handleResponse(response);
}

/**
 * Пингует сервер для обновления статуса "онлайн"
 */
export async function updateOnlineStatus(initData) {
    try {
        await fetch(`${CONFIG.backendUrl}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: initData })
        });
    } catch (e) {
        // Пинг - не критичная ошибка, просто логируем
        console.warn("Ping error (non-critical):", e);
    }
}

/**
 * Сохраняет выбранный язык
 */
export async function saveLanguagePreference(initData, lang) {
    const response = await fetch(`${CONFIG.backendUrl}/save-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, lang: lang })
    });
    return await handleResponse(response);
}

/**
 * Сохраняет выбранную тему (auto, light, dark)
 */
export async function saveThemeSelection(initData, theme, lang) {
    const response = await fetch(`${CONFIG.backendUrl}/save-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, theme: theme, lang: lang })
    });
    return await handleResponse(response);
}

/**
 * Активирует 'custom' тему на сервере
 */
export async function activateCustomTheme(initData, lang) {
     const response = await fetch(`${CONFIG.backendUrl}/save-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, theme: 'custom', lang: lang })
    });
    return await handleResponse(response);
}

/**
 * Сохраняет цвета кастомной темы
 */
export async function saveCustomTheme(initData, colors, lang) {
    const response = await fetch(`${CONFIG.backendUrl}/save-custom-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, colors: colors, lang: lang })
    });
    return await handleResponse(response);
}

/**
 * (НОВАЯ ФУНКЦИЯ) Сохраняет настройку "Стекла"
 */
export async function saveGlassPreference(initData, isEnabled) {
    const response = await fetch(`${CONFIG.backendUrl}/api/save-glass-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, is_enabled: isEnabled })
    });
    return await handleResponse(response);
}

/**
 * Получает username пользователя по его TG ID
 */
export async function getTelegramUserInfo(initData, target_user_id) {
    const response = await fetch(`${CONFIG.backendUrl}/get-telegram-user-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, target_user_id: target_user_id })
    });
    return await handleResponse(response);
}

/**
 * Подписаться на пользователя
 */
export async function followUser(initData, target_user_id) {
    const response = await fetch(`${CONFIG.backendUrl}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, target_user_id: target_user_id })
    });
    return await handleResponse(response);
}

/**
 * Отписаться от пользователя
 */
export async function unfollowUser(initData, target_user_id) {
    const response = await fetch(`${CONFIG.backendUrl}/unfollow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, target_user_id: target_user_id })
    });
    return await handleResponse(response);
}

/**
 * Создает новый пост (запрос)
 */
export async function createPost(postData) {
    const response = await fetch(`${CONFIG.backendUrl}/api/create-post`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData) 
    });
    return await handleResponse(response);
}

/**
 * Загружает ленту постов (запросов)
 */
export async function loadPostsFeed(initData) {
    const response = await fetch(`${CONFIG.backendUrl}/api/get-posts-feed`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ initData: initData }) 
    });
    return await handleResponse(response);
}

/**
 * Загружает только посты текущего пользователя
 */
export async function loadMyPosts(initData) {
    const response = await fetch(`${CONFIG.backendUrl}/api/get-my-posts`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ initData: initData }) 
    });
    return await handleResponse(response);
}

/**
 * Удаляет пост
 */
export async function deletePost(initData, post_id) {
    const response = await fetch(`${CONFIG.backendUrl}/api/delete-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData, post_id: post_id })
    });
    return await handleResponse(response);
}

/**
 * Обновляет пост
 */
export async function updatePost(initData, post_id, postData) {
    const response = await fetch(`${CONFIG.backendUrl}/api/update-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            initData: initData, 
            post_id: post_id,
            ...postData
        })
    });
    return await handleResponse(response);
}