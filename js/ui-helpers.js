// js/ui-helpers.js
// Все UI-функции для работы с DOM
// ОБНОВЛЕНО: Очищена логика рендера навыков, исправлен showView для навигации

/**
 * Хранит текущий назначенный обработчик кнопки "Назад"
 */
let currentBackAction = null;

/**
 * Показывает спиннер загрузки
 */
export function showSpinner(spinner, allViews) {
    if (!spinner) return;
    allViews?.forEach(view => {
        if (view) view.style.display = 'none';
    });
    spinner.style.display = 'block';
}

/**
 * Скрывает спиннер загрузки
 */
export function hideSpinner(spinner) {
    if (spinner) spinner.style.display = 'none';
}

/**
 * Показывает указанный экран, скрывая остальные
 * Управляет нативной кнопкой BackButton
 */
export function showView(targetView, allViews, spinner, tg, t, onBackAction) {
  // --- Логика навигации (BackButton) ---
  if (!onBackAction) {
    // Главный экран: Скрываем "Назад", показываем "Настройки" (для закрытия аппа)
    if (currentBackAction) {
      tg.BackButton.offClick(currentBackAction);
      currentBackAction = null;
    }
    tg.BackButton.hide();
    
    if (tg.SettingsButton) {
        tg.SettingsButton.show();
        tg.SettingsButton.onClick(() => tg.close());
    }
  } else {
    // Вложенный экран / Модалка: Показываем "Назад"
    if (tg.SettingsButton) tg.SettingsButton.hide();
    
    if (currentBackAction) {
      tg.BackButton.offClick(currentBackAction);
    }
    
    tg.BackButton.onClick(onBackAction);
    currentBackAction = onBackAction;
    tg.BackButton.show();
  }
  
  hideSpinner(spinner);
  
  // Скрываем все экраны
  allViews?.forEach(view => {
    if (view) view.style.display = 'none';
  });
  
  // Показываем целевой
  if (targetView) {
    // Для модалок используем flex, чтобы центрировать контент (если CSS это предполагает)
    // Для обычных экранов - block
    if (targetView.id === 'skills-modal' || targetView.id === 'create-post-modal' || targetView.id === 'qr-code-modal') {
      targetView.style.display = 'flex';
    } else {
      targetView.style.display = 'block';
    }
    targetView.classList.add('screen-fade-in');
  }
  
  // Управление главной кнопкой (MainButton)
  if (targetView?.id === 'form-container') {
    tg.MainButton.setText(t('save_button'));
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

/**
 * Рендерит теги навыков (для просмотра в профиле/ленте)
 */
export function renderSkillTags(container, skills, toggleBtn, t) {
    if (!container) return;
    try {
        const skillsArray = typeof skills === 'string' ? JSON.parse(skills) : (Array.isArray(skills) ? skills : []);
        container.innerHTML = '';
        
        if (skillsArray.length === 0) {
            container.classList.add('is-empty');
            if (toggleBtn) toggleBtn.style.display = 'none';
            return;
        }
        container.classList.remove('is-empty');
        
        skillsArray.forEach((skill, index) => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag skill-tag--display skill-tag-fade-in';
            tag.textContent = skill;
            tag.style.animationDelay = `${index * 0.05}s`;
            container.appendChild(tag);
        });
        
        if (toggleBtn) {
            toggleBtn.style.display = skillsArray.length > 8 ? 'block' : 'none';
            toggleBtn.onclick = () => {
                const isExpanded = container.classList.contains('expanded');
                container.classList.toggle('expanded');
                toggleBtn.classList.toggle('less');
                const textSpan = toggleBtn.querySelector('span:not(.arrow)');
                if (textSpan) textSpan.textContent = t(isExpanded ? 'skills_show_more' : 'skills_show_less');
            };
        }
    } catch (e) {
        console.error('Error rendering skill tags:', e);
        container.classList.add('is-empty');
    }
}

/**
 * Показывает профиль пользователя
 */
export function showProfileView(profile, elements, CONFIG, t, renderSkillTagsFunc) {
    if (!elements || !profile) return;
    
    if (elements.username) elements.username.textContent = profile.first_name || 'User';
    
    if (elements.bio) {
        elements.bio.textContent = profile.bio || '';
        elements.bio.style.display = profile.bio ? 'block' : 'none';
    }
    
    if (elements.avatar) {
        const avatarUrl = profile.photo_path 
            ? `${CONFIG.backendUrl}/${profile.photo_path}` 
            : 'https://t.me/i/userpic/320/null.jpg';
        elements.avatar.src = avatarUrl;
        initAvatarFader(elements.avatar);
    }
    
    if (elements.skillsContainer && renderSkillTagsFunc) {
        renderSkillTagsFunc(elements.skillsContainer, profile.skills, elements.skillsToggleBtn, t);
    }
    
    if (elements.followersCount) elements.followersCount.textContent = profile.followers_count || 0;
    if (elements.followingCount) elements.followingCount.textContent = profile.following_count || 0;
    
    renderProfileSection(elements.experienceContainer, profile.experience, t, 'experience');
    renderProfileSection(elements.educationContainer, profile.education, t, 'education');
    renderProfileLinks(elements.linksContainer, profile);
}

/**
 * Показывает детальный профиль другого пользователя
 */
export function showUserDetailView(profile, elements, CONFIG, t, renderSkillTagsFunc, viewerId) {
    if (!elements || !profile) return;
    
    if (elements.username) elements.username.textContent = profile.first_name || 'User';
    
    if (elements.bio) {
        elements.bio.textContent = profile.bio || '';
        elements.bio.style.display = profile.bio ? 'block' : 'none';
    }
    
    if (elements.avatar) {
        const avatarUrl = profile.photo_path 
            ? `${CONFIG.backendUrl}/${profile.photo_path}` 
            : 'https://t.me/i/userpic/320/null.jpg';
        elements.avatar.src = avatarUrl;
        initAvatarFader(elements.avatar);
    }
    
    if (elements.skillsContainer && renderSkillTagsFunc) {
        renderSkillTagsFunc(elements.skillsContainer, profile.skills, elements.skillsToggleBtn, t);
    }
    
    if (elements.followersCount) elements.followersCount.textContent = profile.followers_count || 0;
    if (elements.followingCount) elements.followingCount.textContent = profile.following_count || 0;
    
    // Кнопка подписки
    if (elements.fabFollowButton && viewerId !== profile.user_id) {
        const isFollowed = profile.is_followed_by_viewer;
        const iconFollow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>`;
        const iconUnfollow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
        
        if (isFollowed) {
            elements.fabFollowButton.classList.add('is-unfollow');
            elements.fabFollowButton.innerHTML = iconUnfollow;
            elements.fabFollowButton.title = t('unfollow_button');
        } else {
            elements.fabFollowButton.classList.remove('is-unfollow');
            elements.fabFollowButton.innerHTML = iconFollow;
            elements.fabFollowButton.title = t('follow_button');
        }
    }
    
    renderProfileSection(elements.experienceContainer, profile.experience, t, 'experience');
    renderProfileSection(elements.educationContainer, profile.education, t, 'education');
    renderProfileLinks(elements.linksContainer, profile);
}

function renderProfileSection(container, items, t, type) {
    if (!container) return;
    
    if (!items || items.length === 0) {
        container.classList.add('is-empty');
        container.style.display = 'none';
        return;
    }
    
    container.classList.remove('is-empty');
    container.style.display = 'block';
    
    const titleKey = type === 'experience' ? 'experience_section_title' : 'education_section_title';
    let title = container.querySelector('.profile-section-title');
    if (!title) {
        title = document.createElement('h3');
        title.className = 'profile-section-title';
        container.insertBefore(title, container.firstChild);
    }
    title.textContent = t(titleKey);
    
    // Очистка старых элементов
    Array.from(container.children).forEach(child => {
        if (!child.classList.contains('profile-section-title')) {
            child.remove();
        }
    });
    
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'profile-item';
        
        if (type === 'experience') {
            if (item.job_title) {
                const titleP = document.createElement('p');
                titleP.className = 'item-title';
                titleP.textContent = item.job_title;
                itemDiv.appendChild(titleP);
            }
            if (item.company) {
                const subtitleP = document.createElement('p');
                subtitleP.className = 'item-subtitle';
                subtitleP.textContent = item.company;
                itemDiv.appendChild(subtitleP);
            }
            
            const period = [];
            if (item.start_date) period.push(item.start_date);
            if (item.is_current == 1) period.push(t('present_time_label'));
            else if (item.end_date) period.push(item.end_date);
            
            if (period.length > 0) {
                const periodP = document.createElement('p');
                periodP.className = 'item-period';
                periodP.textContent = period.join(' — ');
                itemDiv.appendChild(periodP);
            }
            if (item.description) {
                const descP = document.createElement('p');
                descP.className = 'item-description';
                descP.textContent = item.description;
                itemDiv.appendChild(descP);
            }
        } else {
            if (item.institution) {
                const titleP = document.createElement('p');
                titleP.className = 'item-title';
                titleP.textContent = item.institution;
                itemDiv.appendChild(titleP);
            }
            
            const degreeInfo = [];
            if (item.degree) degreeInfo.push(item.degree);
            if (item.field_of_study) degreeInfo.push(item.field_of_study);
            
            if (degreeInfo.length > 0) {
                const subtitleP = document.createElement('p');
                subtitleP.className = 'item-subtitle';
                subtitleP.textContent = degreeInfo.join(', ');
                itemDiv.appendChild(subtitleP);
            }
            
            const period = [];
            if (item.start_date) period.push(item.start_date);
            if (item.end_date) period.push(item.end_date);
            
            if (period.length > 0) {
                const periodP = document.createElement('p');
                periodP.className = 'item-period';
                periodP.textContent = period.join(' — ');
                itemDiv.appendChild(periodP);
            }
            if (item.description) {
                const descP = document.createElement('p');
                descP.className = 'item-description';
                descP.textContent = item.description;
                itemDiv.appendChild(descP);
            }
        }
        container.appendChild(itemDiv);
    });
}

function renderProfileLinks(container, profile) {
    if (!container) return;
    
    const links = [profile.link1, profile.link2, profile.link3, profile.link4, profile.link5].filter(Boolean);
    
    if (links.length === 0) {
        container.classList.add('is-empty');
        container.style.display = 'none';
        return;
    }
    
    container.classList.remove('is-empty');
    container.style.display = 'flex';
    container.innerHTML = '';
    
    links.forEach((link) => {
        const a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'profile-link-button'; 
        
        const icon = document.createElement('span');
        icon.className = 'link-icon';
        icon.textContent = '🔗';
        
        const text = document.createElement('span');
        text.className = 'link-text';
        text.textContent = link;
        
        a.appendChild(icon);
        a.appendChild(text);
        container.appendChild(a);
    });
}

export function initAvatarFader(imgElement) {
    if (!imgElement) return;
    imgElement.dataset.avatar = 'loading';
    imgElement.onload = () => { imgElement.dataset.avatar = 'loaded'; };
    imgElement.onerror = () => {
        imgElement.src = 'https://t.me/i/userpic/320/null.jpg';
        imgElement.dataset.avatar = 'loaded';
    };
}

export function showQrCodeModal(qrElements, CONFIG, profile, t) {
    if (!qrElements?.modal || !CONFIG || !profile) return null;
    const appUrl = `https://t.me/${CONFIG.botUsername}/${CONFIG.appSlug}?startapp=${profile.user_id}`;
    qrElements.output.innerHTML = '';
    const qrCode = new QRCode(qrElements.output, {
        text: appUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    if (qrElements.linkDisplay) qrElements.linkDisplay.textContent = appUrl;
    const modalContent = qrElements.modal.querySelector('.modal-content');
    qrElements.modal.style.display = 'flex';
    qrElements.modal.classList.remove('modal-overlay-animate');
    if (modalContent) modalContent.classList.remove('modal-content-animate');
    setTimeout(() => {
        qrElements.modal.classList.add('modal-overlay-animate');
        if (modalContent) modalContent.classList.add('modal-content-animate');
    }, 10);
    return qrCode;
}

// --- ЛОГИКА РЕНДЕРА НОВОЙ МОДАЛКИ НАВЫКОВ (ОЧИЩЕННАЯ) ---

export function renderSkillSelectionForm(container, selectedSkills, categories, t, onToggle) {
    if (!container) return;
    container.innerHTML = '';

    if (!categories) return;

    Object.entries(categories).forEach(([catKey, skills]) => {
        const catDiv = document.createElement('div');
        catDiv.className = 'skill-category';
        
        const title = document.createElement('h3');
        title.className = 'skill-category-title';
        title.textContent = t(catKey);
        catDiv.appendChild(title);
        
        const skillList = document.createElement('div');
        skillList.className = 'skill-list';
        
        skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag skill-tag--selectable';
            if (selectedSkills.includes(skill)) tag.classList.add('selected');
            tag.textContent = skill;
            
            tag.onclick = () => {
                tag.classList.toggle('selected');
                onToggle(skill);
            };
            
            skillList.appendChild(tag);
        });
        
        catDiv.appendChild(skillList);
        container.appendChild(catDiv);
    });
}

export function renderStatusFilters(container, currentStatus, t, onToggle) {
    if (!container) return;
    container.innerHTML = '';
    
    const title = document.createElement('h3');
    title.className = 'status-filter-group-title';
    title.textContent = t('post_type_label') || "Тип";
    container.appendChild(title);

    const list = document.createElement('div');
    list.className = 'status-filter-list';
    
    const statuses = [
        { key: 'looking', text: t('post_type_looking') || "Ищу" },
        { key: 'offering', text: t('post_type_offering') || "Предлагаю" },
        { key: 'showcase', text: t('post_type_showcase') || "Демо" }
    ];

    statuses.forEach(st => {
        const btn = document.createElement('button');
        btn.className = 'status-tag';
        if (st.key === currentStatus) btn.classList.add('active');
        btn.textContent = st.text;
        
        btn.onclick = () => {
            Array.from(container.querySelectorAll('.status-tag')).forEach(el => el.classList.remove('active'));
            const newStatus = (currentStatus === st.key) ? null : st.key;
            if (newStatus) btn.classList.add('active');
            onToggle(newStatus);
        };
        list.appendChild(btn);
    });
    container.appendChild(list);
}

/**
 * Показывает "Тост"-уведомление
 */
export function showToast(message, isError = false, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        // Фоллбэк
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    if (isError) toast.classList.add('error');
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('is-hiding');
        toast.addEventListener('animationend', () => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, { once: true });
    }, duration);
}