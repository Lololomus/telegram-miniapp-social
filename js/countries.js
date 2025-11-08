// js/countries.js

let tomSelectInstance = null;
let ALL_COUNTRIES = [];
const FLAG_CACHE = new Map();
let flagPreloadPromise = null;
const DEFAULT_FLAG_BATCH_SIZE = 8;
const DEFAULT_FLAG_BATCH_DELAY = 60;
const CAN_USE_OBJECT_URL = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeFlagCode(code) {
    return (code || '').toString().trim().toLowerCase();
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function cacheFlagAsset(code) {
    const normalized = normalizeFlagCode(code);
    if (!normalized) return null;
    if (FLAG_CACHE.has(normalized)) {
        return FLAG_CACHE.get(normalized);
    }

    const requestUrl = `/flags/${normalized}.svg`;
    try {
        const response = await fetch(requestUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        let assetUrl;
        if (CAN_USE_OBJECT_URL) {
            assetUrl = URL.createObjectURL(blob);
        } else if (typeof FileReader !== 'undefined') {
            assetUrl = await blobToDataUrl(blob);
        } else {
            assetUrl = requestUrl;
        }
        FLAG_CACHE.set(normalized, assetUrl);
        return assetUrl;
    } catch (error) {
        console.warn(`Flag preload failed for ${normalized}:`, error);
        return null;
    }
}

export function getFlagAsset(code) {
    const normalized = normalizeFlagCode(code);
    if (!normalized) return null;
    return FLAG_CACHE.get(normalized) || null;
}

/**
 * Создает HTML-разметку для флага (локальный файл)
 */
function getFlagHTML(countryCode) {
    if (!countryCode) return '';
    const code = countryCode.toLowerCase();
    const cachedAsset = getFlagAsset(code);
    const flagUrl = cachedAsset || `/flags/${code}.svg`; // Путь от корня
    return `<img src="${flagUrl}" class="ts-flag" alt="${countryCode}">`;
}

/**
 * Загружает countries.json и инициализирует TomSelect
 */
export async function initCountrySelector(nationalityField, currentLang, t, onChangeCallback) {
    if (!nationalityField) return;

    // (ИСПРАВЛЕНО) Оборачиваем ВСЕ в try...catch, 
    // чтобы сбой TomSelect не повесил все приложение
    try {
        if (ALL_COUNTRIES.length === 0) {
            const response = await fetch('/countries.json'); // Путь от корня
            if (!response.ok) throw new Error('Failed to load countries.json');
            ALL_COUNTRIES = await response.json();
        }

        ALL_COUNTRIES.sort((a, b) => {
            const nameA = a[`name_${currentLang}`] || a.name_en;
            const nameB = b[`name_${currentLang}`] || b.name_en;
            return nameA.localeCompare(nameB);
        });

        if (tomSelectInstance) {
            tomSelectInstance.destroy();
            tomSelectInstance = null;
        }
        
        // (ИСПРАВЛЕНО) Оборачиваем сам 'new TomSelect' в отдельный try...catch
        try {
            tomSelectInstance = new TomSelect(nationalityField, {
                valueField: 'code',
                labelField: `name_${currentLang}`,
                searchField: [`name_${currentLang}`, 'name_en', 'code'],
                options: ALL_COUNTRIES,
                maxOptions: null,
                maxItems: 1,
                render: {
                    item: function(item, escape) {
                        const name = item[`name_${currentLang}`] || item.name_en;
                        return `<div>${getFlagHTML(item.code)} ${escape(name)}</div>`;
                    },
                    option: function(item, escape) {
                        const name = item[`name_${currentLang}`] || item.name_en;
                        return `<div>${getFlagHTML(item.code)} ${escape(name)}</div>`;
                    }
                },
                plugins: ['dropdown_input'], // Оставляем поиск в списке
                placeholder: t('nationality_placeholder_tomselect_new'),
                highlight: false,
                closeAfterSelect: true,
                onChange: onChangeCallback
            });

        } catch (tomSelectError) {
            // Если TomSelect упал (например, на Safari)
            console.error("!!!!!!!!!! TomSelect CRASHED !!!!!!!!!!");
            console.error(tomSelectError);
            console.error("Приложение продолжит работу, но список стран будет отключен.");
            // Прячем поле, чтобы оно не мешало
            nationalityField.style.display = 'none';
            const label = document.querySelector(`label[for="${nationalityField.id}"]`);
            if (label) label.style.display = 'none';
        }

        // --- ВРЕМЕННОЕ ИЗМЕНЕНИЕ ДЛЯ ТЕСТА ---
        // Я закомментировал эту строку.
        // if (tomSelectInstance.control_input) {
        //     tomSelectInstance.control_input.readOnly = true;
        // }
        // ------------------------------------
        
        return { instance: tomSelectInstance, countries: ALL_COUNTRIES };

    } catch (error) {
        console.error('Критическая ошибка в initCountrySelector:', error);
        // Возвращаем пустые данные, чтобы приложение не упало
        return { instance: null, countries: [] };
    }
}

// ... (остальной код файла без изменений) ...

/**
 * Обновляет текст и сортировку в TomSelect при смене языка
 */
export function updateCountryListText(tomInstance, allCountries, currentLang, t) {
    if (!tomInstance || allCountries.length === 0) return;
    
    // Проверяем, видимо ли поле
    const wrapperElement = tomInstance.wrapper;
    if (!wrapperElement || wrapperElement.offsetParent === null) {
        console.log("⚠️ TomSelect не обновлён: поле не видно");
        return;
    }


    try {
        allCountries.sort((a, b) => {
            const nameA = (a[`name_${currentLang}`] || a.name_en || "").toString();
            const nameB = (b[`name_${currentLang}`] || b.name_en || "").toString();
            return nameA.localeCompare(nameB);
        });

        // Обновляем placeholder через API TomSelect, если поле пустое
        if (!tomInstance.getValue()) {
            tomInstance.settings.placeholder = t('nationality_placeholder_tomselect');
            const controlInput = tomInstance.control_input;
             if (controlInput) {
                 controlInput.placeholder = t('nationality_placeholder_tomselect');
             }
        }


        tomInstance.settings.labelField = `name_${currentLang}`;
        tomInstance.settings.searchField = [`name_${currentLang}`, 'name_en', 'code'];

        // Сохраняем текущее значение, чтобы восстановить его после обновления
        const currentValue = tomInstance.getValue();

        tomInstance.clearOptions();
        tomInstance.addOptions(allCountries);
        
        // Восстанавливаем значение и обновляем отображение
        tomInstance.setValue(currentValue, true); // true - не вызывать событие onChange
        tomInstance.refreshItems(); // Обновить отображение выбранного элемента
        
    } catch (e) {
        console.error("⚠️ Ошибка обновления TomSelect:", e);
    }
}

/**
 * Возвращает экземпляр TomSelect
 */
export function getTomSelectInstance() {
    return tomSelectInstance;
}

/**
 * Предзагружает изображения флагов
 */
export function preloadFlags(countries = [], options = {}) {
    if (!countries || countries.length === 0) {
        return Promise.resolve();
    }
    if (flagPreloadPromise) {
        return flagPreloadPromise;
    }

    const uniqueCodes = [...new Set(
        countries
            .map(country => normalizeFlagCode(country.code))
            .filter(Boolean)
    )];
    if (uniqueCodes.length === 0) {
        return Promise.resolve();
    }

    const batchSize = Math.max(1, options.batchSize || DEFAULT_FLAG_BATCH_SIZE);
    const batchDelay = options.batchDelay ?? DEFAULT_FLAG_BATCH_DELAY;

    flagPreloadPromise = (async () => {
        console.log(`[flags] Preloading ${uniqueCodes.length} assets in batches of ${batchSize}`);
        for (let index = 0; index < uniqueCodes.length; index += batchSize) {
            const batch = uniqueCodes.slice(index, index + batchSize);
            await Promise.all(batch.map(cacheFlagAsset));
            if (index + batchSize < uniqueCodes.length && batchDelay > 0) {
                await sleep(batchDelay);
            }
        }
        console.log('[flags] Flag preloading finished');
    })().catch(error => {
        console.error('Flag preloading error:', error);
    });

    return flagPreloadPromise;
}