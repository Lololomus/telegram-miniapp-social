// js/app-form-helpers.js

/**
 * Настраивает динамический список (Опыт, Образование, Ссылки) с анимацией.
 * @param {object} tg - Объект Telegram WebApp.
 * @param {function} t - Функция перевода (i18n).
 * @param {HTMLElement} addButton - Кнопка "Добавить".
 * @param {HTMLElement} container - Контейнер для элементов.
 * @param {HTMLTemplateElement} template - Шаблон для нового элемента.
 * @param {number} maxItems - Максимальное кол-во элементов.
 * @param {function} [onAddCallback] - Коллбэк при добавлении.
 * @param {function} [onDeleteCallback] - Коллбэк при удалении.
 * @returns {object} - Объект с методами { addItem, checkMaxItems, renderItems, getItemsData }.
 */
export function setupDynamicList(tg, t, addButton, container, template, maxItems, onAddCallback, onDeleteCallback) {
    if (!addButton || !container || !template) { 
        console.error("Ошибка настройки динамического списка: не найдены элементы."); 
        return { addItem: () => {}, checkMaxItems: () => {}, renderItems: () => {}, getItemsData: () => [] }; 
    }
    
    const addItem = (data = null) => {
        if (container.children.length >= maxItems) { 
            if (!data) tg.showAlert(t('error_max_items_reached', { max: maxItems })); 
            checkMaxItems(); 
            return null; 
        }
        
        const newItemFragment = template.content.cloneNode(true); 
        const itemElement = newItemFragment.querySelector('.dynamic-item');
        
        if (data) {
            if (template.id === 'link-template') { 
                itemElement.querySelector('.link-input').value = data || ''; 
            } else if (template.id === 'experience-template') {
                itemElement.querySelector('.experience-job-title').value = data.job_title || '';
                itemElement.querySelector('.experience-company').value = data.company || '';
                itemElement.querySelector('.experience-start-date').value = data.start_date || '';
                const endDateInput = itemElement.querySelector('.experience-end-date');
                const isCurrentCheckbox = itemElement.querySelector('.experience-is-current');
                isCurrentCheckbox.checked = data.is_current == 1;
                endDateInput.value = data.is_current == 1 ? '' : (data.end_date || '');
                endDateInput.disabled = isCurrentCheckbox.checked;
                itemElement.querySelector('.experience-description').value = data.description || '';
            } else if (template.id === 'education-template') {
                 itemElement.querySelector('.education-institution').value = data.institution || '';
                 itemElement.querySelector('.education-degree').value = data.degree || '';
                 itemElement.querySelector('.education-field-of-study').value = data.field_of_study || '';
                 itemElement.querySelector('.education-start-date').value = data.start_date || '';
                 itemElement.querySelector('.education-end-date').value = data.end_date || '';
                 itemElement.querySelector('.education-description').value = data.description || '';
            }
        }
        
        const deleteButton = itemElement.querySelector('.delete-item-button');
        if (deleteButton) { 
            deleteButton.addEventListener('click', () => { 
                itemElement.classList.add('is-removing'); 
                itemElement.addEventListener('transitionend', () => { 
                    itemElement.remove(); 
                    checkMaxItems(); 
                    tg.MainButton.show(); 
                    if (onDeleteCallback) onDeleteCallback(); 
                }, { once: true }); 
            }); 
        }
        
        const inputs = itemElement.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => tg.MainButton.show());
             if (input.type === 'checkbox' && input.classList.contains('experience-is-current')) { 
                 input.addEventListener('change', (event) => { 
                     const endDateInput = itemElement.querySelector('.experience-end-date'); 
                     if (endDateInput) { 
                         endDateInput.disabled = event.target.checked; 
                         if (event.target.checked) endDateInput.value = ''; 
                     } 
                 }); 
             }
        });
        
        itemElement.querySelectorAll('[data-i18n-key]').forEach(el => el.textContent = t(el.dataset.i18nKey));
        itemElement.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
        
        if (!data) { 
            itemElement.classList.add('is-adding'); 
        }
        
        container.appendChild(itemElement);
        
        if (!data) { 
            requestAnimationFrame(() => { 
                itemElement.classList.remove('is-adding'); 
            }); 
            tg.MainButton.show(); 
        }
        
        checkMaxItems(); 
        if (onAddCallback) onAddCallback(itemElement); 
        return itemElement;
    };
    
    const checkMaxItems = () => { 
        addButton.style.display = container.children.length >= maxItems ? 'none' : 'block'; 
    };
    
    const renderItems = (itemsData = []) => { 
        container.innerHTML = ''; 
        if (itemsData && itemsData.length > 0) { 
            itemsData.forEach(itemData => addItem(itemData)); 
            if (template.id === 'link-template' && itemsData.length < maxItems && itemsData.length === 0) { 
                addItem(null); 
            } 
        } else if (template.id === 'link-template') { 
            addItem(null); 
        } 
        checkMaxItems(); 
    };
    
    const getItemsData = () => { 
        const items = []; 
        container.querySelectorAll('.dynamic-item').forEach(itemElement => { 
            let itemData = {}; 
            if (template.id === 'link-template') { 
                const value = itemElement.querySelector('.link-input').value.trim(); 
                if (value) items.push(value); 
            } else if (template.id === 'experience-template') { 
                itemData = { 
                    job_title: itemElement.querySelector('.experience-job-title').value.trim(), 
                    company: itemElement.querySelector('.experience-company').value.trim(), 
                    start_date: itemElement.querySelector('.experience-start-date').value.trim(), 
                    end_date: itemElement.querySelector('.experience-end-date').value.trim(), 
                    is_current: itemElement.querySelector('.experience-is-current').checked ? 1 : 0, 
                    description: itemElement.querySelector('.experience-description').value.trim() 
                }; 
                if (itemData.job_title || itemData.company) items.push(itemData); 
            } else if (template.id === 'education-template') { 
                itemData = { 
                    institution: itemElement.querySelector('.education-institution').value.trim(), 
                    degree: itemElement.querySelector('.education-degree').value.trim(), 
                    field_of_study: itemElement.querySelector('.education-field-of-study').value.trim(), 
                    start_date: itemElement.querySelector('.education-start-date').value.trim(), 
                    end_date: itemElement.querySelector('.education-end-date').value.trim(), 
                    description: itemElement.querySelector('.education-description').value.trim() 
                }; 
                if (itemData.institution) items.push(itemData); 
            } 
        }); 
        return items; 
    };
    
    addButton.addEventListener('click', () => addItem(null)); 
    checkMaxItems(); 
    return { addItem, checkMaxItems, renderItems, getItemsData };
}