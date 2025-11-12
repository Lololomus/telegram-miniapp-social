// js/react-posts-feed.js (ESM)
// ИСПРАВЛЕНО (FLIP): Удалена ручная FLIP-анимация
// ИСПРАВЛЕНО: layout="position"
// ИСПРАВЛЕНО: debounce для поиска
// ИСПРАВЛЕНО: React.lazy для ProfileSheet
// ✅ НОВОЕ: React.memo для PostCard и SwipeablePostCard
// ✅ НОВОЕ: loading="lazy" для аватаров
// ✅ ИСПРАВЛЕНИЕ (Glass): Убраны inline-background, добавлены className и isIOS
// ✅ ИСПРАВЛЕНИЕ (Swipe): Убран drag-y, добавлена кнопка "X", исправлен drag-x
// ✅ ИСПРАВЛЕНИЕ (iOS): Отключена layout-анимация на iOS
// ✅ ОТКАТ (TMA Swipe): Убраны disableVerticalSwipes
// ✅ НОВОЕ (Context Menu): Полностью убран боковой свайп (drag-x)
// ✅ НОВОЕ (Context Menu): Добавлена кнопка "..." и поп-ап меню
// ✅ ИСПРАВЛЕНИЕ (Bug): Кнопка "Редактировать" в PostDetailSheet стала зеленой
// ✅ ИСПРАВЛЕНИЕ #8: Кнопка "X" заменена на "плавающий" шеврон (v)
// ✅ ИСПРАВЛЕНИЕ #8: Исправлена верстка кнопки "..." на карточке (MyPostCard)
// ✅ ИСПРАВЛЕНИЕ #1, #2, #3, #4, #5: Исправлены отступы, позиция шеврона, наложения.
// ✅ ИСПРАВЛЕНИЕ (Задача 3): Полностью переработан EditPostModal
// ✅ ИСПРАВЛЕНИЕ (Задача 3, Попытка 3): Возвращаем TomSelect
// ✅ ИСПРАВЛЕНИЕ (Задача 4): Кнопки в EditPostModal откреплены от низа
// ✅ ИСПРАВЛЕНИЕ (Задача 5): Крестик в EditPostModal заменен на Шеврон
// ✅ ИСПРАВЛЕНИЕ (Задача 6): Убран click() по невидимой кнопке, заменен на CustomEvent
// --- ИЗМЕНЕНИЕ: Полностью удалена логика TomSelect ---
// ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): Удалены useEffect, связанные с HTML-кнопками "Назад"

// ✅ ИЗМЕНЕНИЕ: Добавляем Suspense, memo, useCallback
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, Suspense, memo } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/client/+esm';
import { motion, AnimatePresence, useAnimation } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
// --- ✅ ИЗМЕНЕНИЕ: УДАЛЕН TomSelect ---
// import TomSelect from 'https://cdn.jsdelivr.net/npm/tom-select@2.2.2/+esm';
const h = React.createElement;

// --- ИМПОРТ ОБЩЕГО КОМПОНЕНТА ---
// (ИЗМЕНЕНИЕ) Импортируем ProfileSheet "лениво"
const ProfileSheet = React.lazy(() => import('./react-shared.js').then(module => ({ default: module.ProfileSheet })));

// --- Утилиты и окружение ---
const tg = window.Telegram?.WebApp;
const t = (k, d = {}) => {
    // ✅ ИЗМЕНЕНИЕ (Задача 3): Добавлены ключи для модального окна
    const dict = {
        'feed_empty': 'Нет запросов', 'links': 'Ссылки', 'skills': 'Навыки',
        'experience': 'Опыт работы', 'education': 'Образование', 'present_time': 'по наст. время',
        'post_type_looking': '🤝 Ищет', 'post_type_offering': '💼 Предлагает',
        'post_type_showcase': '🚀 Демо', 'post_type_default': 'Запрос',
        'job_not_specified': 'Опыт не указан',
        'my_posts_title': 'Мои запросы',
        'feed_posts_title': 'Лента запросов',
        // --- Новые ключи ---
        'edit_post_title': 'Редактировать запрос',
        'post_type_label': 'Тип запроса:',
        'post_content_label': 'Краткое описание:',
        'post_full_description_label': 'Полное описание (необязательно):',
        'post_skills_label': 'Теги (навыки):',
        'select_skills_button': 'Выбрать навыки',
        'post_type_placeholder': 'Выберите тип запроса...' // <-- Для TomSelect
    };
    let s = dict[k] || k;
    Object.entries(d).forEach(([k, v]) => { s = s.replace(new RegExp(`{${k}}`, 'g'), v); });
    return s;
};

async function postJSON(url, body) {
// ... (остальной код без изменений) ...
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
}

// --- (ИЗМЕНЕНИЕ) Простая debounce-функция ---
function useDebounce(value, delay) {
// ... (остальной код без изменений) ...
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// --- Утилита форматирования времени ---
function formatPostTime(timestamp) {
// ... (остальной код без изменений) ...
    if (!timestamp) return '';
    
    try {
        // (ИЗМЕНЕНИЕ) Упрощенный парсинг, доверяем ISO строке
        const postDate = new Date(timestamp);
        if (isNaN(postDate.getTime())) {
            console.error("Invalid post timestamp:", timestamp);
            return '';
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now - postDate) / 1000);
        
        if (diffInSeconds < 60) return 'только что';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}м`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}ч`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}д`;
        
        if (diffInDays < 30) {
            const weeks = Math.floor(diffInDays / 7);
            return `${weeks}нед`;
        }
        
        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths}мес`;
    } catch {
        return '';
    }
}

const POPULAR_SKILLS = [
// ... (остальной код без изменений) ...
    "Python", "JavaScript", "Java", "C#", "C++", "Go",
    "React", "Vue", "Angular", "Node.js", "Django", "Spring",
    "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "Git", "Figma", "AWS"
].sort((a, b) => a.localeCompare(b));

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function QuickFilterTags({ skills, selected, onToggle }) {
// ... (остальной код без изменений) ...
    if (!skills || skills.length === 0) return null;
    return skills.map(skill => h('button', {
        key: skill,
        className: `skill-tag skill-tag--filter ${selected.some(s => s.toLowerCase() === skill.toLowerCase()) ? 'is-selected' : ''}`,
        'data-skill': skill,
        onClick: () => onToggle(skill),
    }, skill));
}
function PhoneShell({ children }) {
// ... (остальной код без изменений) ...
    return h('div', {
        style: {
            position: 'relative',
            width: '100%',
            minHeight: '100%',
            color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'
        }
     }, children);
}
function TopSpacer() {
// ... (остальной код без изменений) ...
    return h('div', { style: { height: '0px' } });
}

// Вариант карточки (анимация ПОЯВЛЕНИЯ/ИСЧЕЗНОВЕНИЯ)
const cardVariants = isIOS 
// ... (остальной код без изменений) ...
  ? {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      },
      exit: { opacity: 0, transition: { duration: 0.1 } }
    }
  : {
      hidden: { opacity: 0, x: -20 },
      visible: (i) => ({ 
        opacity: 1, 
        x: 0,
        transition: {
          delay: i * 0.1, // Задержка зависит от индекса
          duration: 0.4,
          ease: "easeOut"
        }
      }),
      exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
    };

// (ИЗМЕНЕНИЕ) Новый вариант для stagger-анимации списка
const listVariants = {
// ... (остальной код без изменений) ...
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
        when: "beforeChildren",
        staggerChildren: isIOS ? 0.05 : 0.1, // Ускоряем stagger на iOS
        delayChildren: 0.1
    }
  }
};


// ✅ НОВОЕ: Компонент кнопки "Закрыть" (дублируем из react-shared.js, т.к. это модуль)
function CloseButton({ onClick, isIOS }) {
// ... (остальной код без изменений) ...
    return h('button', {
        className: `react-sheet-close-button ${isIOS ? 'is-ios' : ''}`,
        onClick: onClick,
        'aria-label': 'Закрыть',
    }, 
        // SVG "Крестик"
        h('svg', { 
            xmlns: 'http://www.w3.org/2000/svg', 
            viewBox: '0 0 24 24', 
            fill: 'none', 
            stroke: 'currentColor', 
            strokeWidth: '2.5', 
            strokeLinecap: 'round', 
            strokeLinejoin: 'round' 
        },
            h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            h('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
        )
    );
}

// --- ✅ ИЗМЕНЕНИЕ: Компонент TomSelectWrapper УДАЛЕН ---
/*
const TomSelectWrapper = ({ value, onChange, options, placeholder }) => {
  // ... (код удален) ...
};
*/
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


// Модальное окно редактирования поста
// ✅ ИСПРАВЛЕНИЕ (Задача 3): Полностью переработана верстка
// ✅ ИСПРАВЛЕНИЕ (Задача 5): Заменен крестик на шеврон
function EditPostModal({ post, onClose, onSave }) {
  const [postType, setPostType] = useState(post.post_type);
  const [content, setContent] = useState(post.content);
  const [fullDescription, setFullDescription] = useState(post.full_description || '');
  const [skillTags, setSkillTags] = useState((post.skill_tags || []).join(', '));
  const [currentSkillsArray, setCurrentSkillsArray] = useState(post.skill_tags || []);

  // Блокируем прокрутку body при открытии модалки
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, []);

  // ✅ НОВОЕ: Слушатель для получения тегов из app.js
  useEffect(() => {
    const handleSkillsUpdate = (event) => {
        if (event.detail && Array.isArray(event.detail.skills)) {
            console.log("EditPostModal: получены новые навыки", event.detail.skills);
            setCurrentSkillsArray(event.detail.skills);
            setSkillTags(event.detail.skills.join(', '));
        }
    };
    document.addEventListener('skills-updated-for-post', handleSkillsUpdate);
    return () => {
        document.removeEventListener('skills-updated-for-post', handleSkillsUpdate);
    };
  }, []); // Пустой массив, вешаем 1 раз

  // ✅ НОВОЕ: Обработчик клика по кнопке "Выбрать навыки"
  const handleOpenSkillsModal = useCallback(() => {
    console.log("EditPostModal: открываем модалку навыков");
    if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred('light');
    }
    // Отправляем ивент, который слушает app.js
    document.dispatchEvent(new CustomEvent('openSkillsModal', {
        detail: {
            source: 'editPostModal',
            skills: currentSkillsArray
        }
    }));
  }, [currentSkillsArray]); // Зависим от актуального списка навыков

  const handleSave = () => {
    if (!content.trim()) {
      tg.showAlert('Заполните краткое описание');
      return;
    }
    
    onSave({
      post_type: postType,
      content: content.trim(),
      full_description: fullDescription.trim(),
      // ✅ ИЗМЕНЕНИЕ: Берем навыки из state
      skill_tags: currentSkillsArray 
    });
  };

  return h(motion.div, {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1002,
      display: 'flex',
      alignItems: 'flex-end',
      pointerEvents: 'auto',
      overflow: 'hidden' // Запрещаем прокрутку
    },
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
    h(motion.div, {
      onClick: onClose,
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        cursor: 'pointer'
      }
    }),
    
    // --- ✅ ИЗМЕНЕНИЕ: Новая обертка для анимации и шеврона (как в PostDetailSheet) ---
    h(motion.div, {
        style: {
            position: 'relative', 
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', 
        },
        // Анимация (y: '100%') теперь здесь
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { 
            type: 'spring', 
            damping: 30, 
            stiffness: 300 
        },
    },
        // --- ✅ ИЗМЕНЕНИЕ: Добавлен Шеврон ---
        h('button', {
            className: `react-sheet-chevron-close ${isIOS ? 'is-ios' : ''}`,
            onClick: onClose,
            'aria-label': 'Закрыть',
        }, 
            // SVG "Шеврон вниз"
            h('svg', { 
                xmlns: 'http://www.w3.org/2000/svg', 
                viewBox: '0 0 24 24', 
                fill: 'none', 
                stroke: 'currentColor', 
                strokeWidth: '2.5', 
                strokeLinecap: 'round', 
                strokeLinejoin: 'round' 
            },
                h('polyline', { points: '6 9 12 15 18 9' })
            )
        ),
    
        // --- ✅ ИЗМЕНЕНИЕ: Этот div теперь отвечает только за контент и прокрутку ---
        h('div', {
          className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
          style: {
            position: 'relative',
            width: '100%',
            maxHeight: '90vh', // Ограничиваем высоту
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'auto', // Прокрутка только внутри модалки
            padding: '20px',
            // ✅ ИСПРАВЛЕНИЕ (Задача 4): Убран paddingBottom: 240
            paddingBottom: '20px'
          },
          // Анимация УБРАНА отсюда
          onClick: (e) => e.stopPropagation()
        },
          // --- ✅ ИЗМЕНЕНИЕ: CloseButton УДАЛЕН ---
          /* h(CloseButton, { onClick: onClose, isIOS: isIOS }), */

          // --- ✅ ИЗМЕНЕНИЕ: Полная переверстка ---
          h('h2', { 
              // Используем стили из profile.css
              className: 'profile-section-title', 
              style: { 
                  textAlign: 'center', 
                  margin: '0 0 20px 0', 
                  fontSize: 20 
              } 
          }, t('edit_post_title')),
          
          // --- 1. TomSelect для Типа запроса ---
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-type-select' }, t('post_type_label')),
            // --- ✅ ИЗМЕНЕНИЕ: Заменяем TomSelectWrapper на обычный <select> ---
            h('select', {
              id: 'edit-post-type-select',
              value: postType,
              onChange: (e) => setPostType(e.target.value)
              // Стилизация будет добавлена в form.css
            },
              h('option', { value: 'looking' }, t('post_type_looking')),
              h('option', { value: 'offering' }, t('post_type_offering')),
              h('option', { value: 'showcase' }, t('post_type_showcase'))
            )
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---
          ),
          
          // --- 2. Textarea для Краткого описания ---
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-content' }, t('post_content_label')),
            h('textarea', {
              id: 'edit-post-content',
              value: content,
              onChange: (e) => setContent(e.target.value),
              rows: 3,
            })
          ),
          
          // --- 3. Textarea для Полного описания ---
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-full' }, t('post_full_description_label')),
            h('textarea', {
              id: 'edit-post-full',
              value: fullDescription,
              onChange: (e) => setFullDescription(e.target.value),
              rows: 6,
            })
          ),
          
          // --- 4. Кнопка для выбора Тегов ---
          h('div', { className: 'form-group' },
            h('label', null, t('post_skills_label')),
            h('div', { 
                className: 'skills-input-group',
                onClick: handleOpenSkillsModal // Вся группа кликабельна
            },
                h('input', {
                  type: 'text',
                  value: skillTags, // Показываем теги через запятую
                  readOnly: true, // Запрещаем ввод
                  placeholder: t('select_skills_button'),
                }),
                h('button', {
                    type: 'button',
                    className: 'skills-input-button', // из form.css
                    'aria-label': t('select_skills_button')
                },
                    // SVG из index.html
                    h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
                        h('path', { d: 'M10 7h8M10 12h8M10 17h8', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' }),
                        h('circle', { cx: '6', cy: '7', r: '1.5', fill: 'currentColor' }),
                        h('circle', { cx: '6', cy: '12', r: '1.5', fill: 'currentColor' }),
                        h('circle', { cx: '6', cy: '17', r: '1.5', fill: 'currentColor' })
                    )
                )
            )
          ),
          // --- КОНЕЦ ПЕРЕВЕРСТКИ ---

          // --- ✅ ИЗМЕНЕНИЕ: Кнопки теперь являются частью контента ---
          h('div', {
            className: `react-sheet-footer ${isIOS ? 'is-ios' : ''}`,
            style: {
              // ✅ ИСПРАВЛЕНИЕ (Задача 4): УБРАНЫ: position, bottom, left, right, zIndex, borderTop, paddingTop, marginTop
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }
          },
            h('button', {
              onClick: onClose,
              style: {
                padding: '14px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--main-hint-color)',
                color: 'var(--main-bg-color)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }
            }, 'Отмена'),
            h('button', {
              onClick: handleSave,
              style: {
                padding: '14px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--main-button-color)',
                color: 'var(--main-button-text-color)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }
            }, 'Сохранить')
          )
        ) // --- Конец .react-sheet-content
    ) // --- Конец новой motion.div-обертки
  );
}

// ✅ НОВОЕ: Компонент переименован (был SwipeablePostCard)
// ✅ НОВОЕ: Добавлено поп-ап меню, убран свайп
// ✅ ИСПРАВЛЕНИЕ #8: Исправлена верстка (убран paddingRight)
// ✅ ИСПРАВЛЕНИЕ #3: Возвращен styleOverride с paddingRight
// ✅ ИСПРАВЛЕНИЕ #3 (НОВЫЙ ФИКС): Убран styleOverride, передаем prop
const MyPostCard = memo(function MyPostCard({ post, index, onOpenProfile, onOpenPostSheet, onEdit, onDelete }) {
// ... (остальной код без изменений) ...
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const postKey = post.post_id || `temp-post-${Math.random()}`;

  // Обработчик клика снаружи
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event) => {
        // Закрываем, если клик был не по меню И не по кнопке, которая его открывает
        // (Проверку кнопки убрали, т.к. кнопка теперь сама_переключает state)
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsMenuOpen(false);
        }
    };
    // Используем 'mousedown', чтобы сработать до 'click' на карточке
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(post);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    
    // Используем тот же handleDeleteConfirm, что и раньше
    if (tg?.showConfirm) {
      tg.showConfirm("Удалить этот запрос?", (ok) => {
        if (ok) {
          onDelete(post);
        }
      });
    } else {
      if (confirm("Удалить этот запрос?")) {
        onDelete(post);
      }
    }
  };

  return h(motion.div, {
    // ✅ ИСПРАВЛЕНИЕ (iOS): Отключаем layout-анимацию на iOS
    layout: isIOS ? false : "position",
    
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
    
    // ✅ НОВОЕ: Контейнер теперь относительный
    style: {
      position: 'relative',
      width: '100%',
      // ✅ ИСПРАВЛЕНИЕ #1: Отступ теперь здесь (MyPostCard - это motion.div)
      marginBottom: '15px', 
      borderRadius: 12,
      cursor: 'pointer' // Вся карточка кликабельна
    },
    // ✅ НОВОЕ: Клик по карточке открывает детали (если меню не открыто)
    onClick: () => {
        if (!isMenuOpen) {
            onOpenPostSheet(post);
        }
    }
  },
    
    // ✅ НОВОЕ: Кнопка "..." (Троеточие)
    h('button', {
        className: `post-actions-button ${isIOS ? 'is-ios' : ''}`,
        onClick: (e) => {
            e.stopPropagation(); // Не даем клику "провалиться" на карточку
            setIsMenuOpen(prev => !prev); // Переключаем меню
        },
        'aria-label': 'Действия'
    }, '⋯'),

    // ✅ НОВОЕ: Поп-ап меню
    h(AnimatePresence, null,
        isMenuOpen && h(motion.div, {
            ref: menuRef,
            className: `post-actions-menu ${isIOS ? 'is-ios' : ''}`,
            initial: { opacity: 0, scale: 0.8, y: -10 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.8, y: -10 },
            transition: { type: 'spring', stiffness: 500, damping: 30 },
            onClick: (e) => e.stopPropagation() // Не даем клику закрыть меню
        },
            h('button', {
                className: 'post-actions-menu-button edit',
                onClick: handleEdit
            }, '✏️ Редактировать'),
            
            h('button', {
                className: 'post-actions-menu-button delete',
                onClick: handleDelete
            }, '🗑️ Удалить')
        )
    ),

    // Сама карточка
    // ✅ НОВОЕ: disableClick={true}, т.к. родитель управляет кликом
    // ✅ ИСПРАВЛЕНИЕ #3: Убран styleOverride, передаем prop
    h(PostCard, {
      post: post,
      index: index,
      onOpenProfile: onOpenProfile,
      onOpenPostSheet: onOpenPostSheet,
      onTagClick: () => {},
      disableClick: true, // <-- ВАЖНО
      // ✅ ИСПРАВЛЕНИЕ #3: Передаем новый prop
      showActionsSpacer: true 
    })
  );
});

// --- ИСПРАВЛЕННЫЙ PostCard с эмодзи ---
// ✅ НОВОЕ: Оборачиваем PostCard в React.memo
// ✅ ИСПРАВЛЕНИЕ #8: Исправлена верстка (flex-контейнеры для имени и кнопки "...")
// ✅ ИСПРАВЛЕНИЕ #5: Добавлен marginRight к блоку имени
// ✅ ИСПРАВЛЕНИЕ #1: Возвращаем marginBottom
// ✅ ИСПРАВЛЕНИЕ #3, #5: Принимаем showActionsSpacer
const PostCard = memo(function PostCard({ post, index, onOpenProfile, onOpenPostSheet, onTagClick, disableClick = false, styleOverride = {}, showActionsSpacer = false }) {
// ... (остальной код без изменений) ...
    const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
    const { content = 'Нет описания', post_type = 'default', skill_tags = [], created_at } = post;
    const avatar = author.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
    
    const type_map = { 
        'looking': { text: '🤝 Ищет', color: '#0A84FF' }, 
        'offering': { text: '💼 Предлагает', color: '#34C759' }, 
        'showcase': { text: '🚀 Демо', color: '#FF9500' } 
    };
    const type_info = type_map[post_type] || { text: '📄 Запрос', color: '#8E8E93' };
    
    const timeAgo = formatPostTime(created_at);
    const postKey = post.post_id || `temp-post-${Math.random()}`;

    return h(motion.div, {
        // (ИЗМЕНЕНИЕ) Возвращаем layout="position", если это НЕ свайпабельная карточка
        // ✅ ИСПРАВЛЕНИЕ (iOS): Отключаем layout-анимацию на iOS
        layout: disableClick ? undefined : (isIOS ? false : "position"),
        
        variants: cardVariants,
        custom: index,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
        
        // (ИЗМЕНЕНИЕ) Добавляем transition
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
        },
        
        key: postKey,
        className: 'react-feed-card',
        style: { 
            padding: 15, 
            width: '100%', 
            borderRadius: 12, 
            // ✅ ИСПРАВЛЕНИЕ #1: Возвращаем marginBottom
            marginBottom: '15px',
            cursor: disableClick ? 'inherit' : 'pointer',
            ...styleOverride // Оставляем для будущих нужд
        },
        onClick: disableClick ? undefined : () => onOpenPostSheet(post)
    },
        h('div', {
            style: {
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                marginBottom: 12
            }
        },
            // ✅ ИСПРАВЛЕНИЕ #8: Обертка для Аватара (без изменений)
            h('button', {
                onClick: (e) => {
                    e.stopPropagation();
                    onOpenProfile(author);
                },
                style: {
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    flexShrink: 0
                }
            },
                h('div', { 
                    style: { 
                        height: 44, 
                        width: 44, 
                        borderRadius: '50%', 
                        background: 'var(--secondary-bg-color)', 
                        overflow: 'hidden'
                    } 
                },
                    h('img', { 
                        src: avatar, 
                        alt: '', 
                        // ✅ НОВОЕ: Добавляем lazy loading
                        loading: 'lazy',
                        style: { width: '100%', height: '100%', objectFit: 'cover' } 
                    })
                )
            ),
            
            // ✅ ИСПРАВЛЕНИЕ #8: Обертка для Имени и Времени
            h('div', {
                style: {
                    flex: 1, // Занимает все доступное место
                    minWidth: 0, // ВАЖНО: Позволяет сжиматься
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    // ✅ ИСПРАВЛЕНИЕ #5: Отступ от тега
                    marginRight: '10px' 
                }
            },
                h('button', {
                    onClick: (e) => {
                        e.stopPropagation();
                        onOpenProfile(author);
                    },
                    style: {
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        font: 'inherit'
                    }
                },
                    h('div', { 
                        style: { 
                            fontWeight: 600, 
                            fontSize: 16,
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', // <-- Теперь это будет работать
                            color: 'var(--main-text-color, #000)' 
                        } 
                    }, author.first_name || 'User')
                ),
                
                timeAgo && h('div', { 
                    style: { 
                        fontSize: 14,
                        color: 'var(--main-hint-color, #999)'
                    } 
                }, timeAgo)
            ),
            
            // ✅ ИСПРАВЛЕНИЕ #8: Обертка для Тега (без изменений)
            h('div', { 
                style: { 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px', 
                    borderRadius: 8, 
                    background: type_info.color, 
                    color: '#FFFFFF', 
                    fontSize: 13, 
                    fontWeight: 600,
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                } 
            }, type_info.text), // С эмодзи

            // ✅ ИСПРАВЛЕНИЕ #3: Добавляем "распорку"
            showActionsSpacer && h('div', {
                style: {
                    width: '40px', // Ширина (кнопка 30px + отступ 10px)
                    flexShrink: 0
                }
            })
        ),
        
        h('p', { 
// ... (остальной код без изменений) ...
            style: { 
                margin: 0, 
                fontSize: 15, 
                lineHeight: 1.5, 
                color: 'var(--main-text-color, #000)', 
                whiteSpace: 'pre-wrap',
                maxHeight: '4.5em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
            } 
        }, content),
        
        skill_tags.length > 0 && h('div', { 
// ... (остальной код без изменений) ...
            style: { 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 6, 
                marginTop: 12 
            } 
        },
            ...skill_tags.map(tag => h('span', {
                key: tag,
                // (ИЗМЕНЕНИЕ) Используем единый класс
                className: 'skill-tag skill-tag--display',
                style: {
                    // (ИЗМЕНЕНИЕ) Убираем стили, которые теперь в CSS
                }
            }, tag))
        )
    );
}); // ✅ НОВОЕ: Закрываем React.memo

function PostsList({ posts, onOpenProfile, onOpenPostSheet, onTagClick, isMyPosts, onEditPost, onDeletePost, containerRef }) {
// ... (остальной код без изменений) ...
  
  return h(motion.div, {
    ref: containerRef,
    variants: listVariants,
    initial: "hidden",
    animate: "visible",
    // ✅ ИСПРАВЛЕНИЕ #1: Убираем flex и gap. Отступ теперь в PostCard/MyPostCard.
    style: { 
        position: 'relative'
    }
  },
    h(AnimatePresence, {
      initial: false,
      mode: isIOS ? "sync" : "popLayout"
    },
      posts.map((p, index) => {
        const key = p.post_id;
        if (isMyPosts) {
          // ✅ НОВОЕ: Используем MyPostCard вместо SwipeablePostCard
          return h(MyPostCard, {
            key: key,
            post: p,
            index: index,
            onOpenProfile: onOpenProfile,
            onOpenPostSheet: onOpenPostSheet,
            onEdit: onEditPost,
            onDelete: onDeletePost
            // ✅ ИСПРАВЛЕНИЕ #1: У MyPostCard УЖЕ ЕСТЬ свой margin, gap не нужен
            // Поэтому PostCard рендерится без обертки
          });
        } else {
          // Для общей ленты - обычная карточка
          return h(PostCard, {
            key: key,
            post: p,
            index: index,
            onOpenProfile: onOpenProfile,
            onOpenPostSheet: onOpenPostSheet,
            onTagClick: onTagClick
          });
        }
      })
    )
  );
}

// --- ИСПРАВЛЕННЫЙ PostDetailSheet с тегом вверху ---
// ✅ ИСПРАВЛЕНИЕ #8: Замена "X" на "Шеврон", рефакторинг верстки
// ✅ ИСПРАВЛЕНИЕ #2: Рефакторинг верстки для "плавающего" шеврона
// ✅ ИСПРАВЛЕНИЕ #4: Убран лишний padding-bottom
function PostDetailSheet({ post, onClose, onOpenProfile, isMyPost, onEdit, onDelete }) {
// ... (остальной код без изменений) ...
    const sheetRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const author = post.author || { user_id: 'unknown', first_name: 'Unknown' };
    const { content, full_description, post_type = 'default', skill_tags = [], created_at } = post;
    const avatar = author.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${author.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
    
    const type_map = { 
        'looking': { text: 'Ищет', icon: '🤝', color: '#0A84FF' }, 
        'offering': { text: 'Предлагает', icon: '💼', color: '#34C759' }, 
        'showcase': { text: 'Демонстрация', icon: '🚀', color: '#FF9500' } 
    };
    const type_info = type_map[post_type] || { text: 'Запрос', icon: '📄', color: '#8E8E93' };
    
    const timeAgo = formatPostTime(created_at);
    
    // ✅ ИСПРАВЛЕНИЕ (Swipe): Удаляем всю логику drag-y
    /*
    const handleDragEnd = useCallback((event, info) => {
        setIsDragging(false);
        if (info.offset.y > 100) {
            onClose();
        }
    }, [onClose]);
    */
    
    return h(motion.div, { 
// ... (остальной код без изменений) ...
        style: { 
            position: 'fixed', 
            inset: 0, 
            zIndex: 1001,
            display: 'flex',
            alignItems: 'flex-end',
            pointerEvents: 'auto'
        }, 
        initial: { opacity: 0 }, 
        animate: { opacity: 1 }, 
        exit: { opacity: 0 },
        transition: { duration: 0.2 }
    },
        h(motion.div, { 
// ... (остальной код без изменений) ...
            onClick: onClose, 
            style: {
                position: 'absolute', 
                inset: 0, 
                background: 'rgba(0,0,0,.5)',
                cursor: 'pointer'
            }, 
            initial: { opacity: 0 }, 
            animate: { opacity: 1 }, 
            exit: { opacity: 0 } 
        }),
        
        // ✅ ИСПРАВЛЕНИЕ #2: Новая внешняя обертка
        // Она анимируется и позволяет шеврону "выйти"
        h(motion.div, {
// ... (остальной код без изменений) ...
            style: {
                position: 'relative', // Для позиционирования шеврона
                width: '100%',
                // maxWidth: '600px', // Управляется .screen в base.css
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Для центрирования шеврона
                // overflow: 'visible' // <-- ВАЖНО
            },
            // Анимация (y: '100%') теперь здесь
            initial: { y: '100%' },
            animate: { y: 0 },
            exit: { y: '100%' },
            transition: { 
                type: 'spring', 
                damping: 30, 
                stiffness: 300 
            },
        },
            // ✅ ИСПРАВЛЕНИЕ #8: Заменяем "X" на "Шеврон"
            // Он теперь дочерний элемент новой обертки
            h('button', {
// ... (остальной код без изменений) ...
                className: `react-sheet-chevron-close ${isIOS ? 'is-ios' : ''}`,
                onClick: onClose,
                'aria-label': 'Закрыть',
            }, 
                // SVG "Шеврон вниз"
                h('svg', { 
                    xmlns: 'http://www.w3.org/2000/svg', 
                    viewBox: '0 0 24 24', 
                    fill: 'none', 
                    stroke: 'currentColor', 
                    strokeWidth: '2.5', 
                    strokeLinecap: 'round', 
                    strokeLinejoin: 'round' 
                },
                    h('polyline', { points: '6 9 12 15 18 9' })
                )
            ),
            
            // ✅ ИСПРАВЛЕНИЕ #2: Это старый .react-sheet-content
            // Он теперь отвечает за скролл и фон
            h('div', {
// ... (остальной код без изменений) ...
                ref: sheetRef,
                className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
                style: { 
                    position: 'relative', 
                    width: '100%', // Занимает всю ширину обертки
                    maxHeight: '85vh',
                    borderTopLeftRadius: 20, 
                    borderTopRightRadius: 20, 
                    overflow: 'auto', // <-- Вот здесь скролл
                    cursor: 'auto',
                },
                onClick: (e) => e.stopPropagation()
            },
                
                // ✅ ИСПРАВЛЕНИЕ #4: Обертка для контента
                h('div', { style: { 
                    padding: '20px 20px 20px 20px' // ✅ ИСПРАВЛЕНИЕ #4: Убран 100px
                } },
                    // ИСПРАВЛЕНИЕ: Новая структура - аватар и тег на одной линии
                    h('div', { 
// ... (остальной код без изменений) ...
                        style: { 
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: 20
                        } 
                    },
                        // АВТОР (слева)
                        h('button', {
// ... (остальной код без изменений) ...
                            onClick: (e) => {
                                e.stopPropagation();
                                onOpenProfile(author);
                            },
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                flex: 1,
                                minWidth: 0,
                                textAlign: 'left'
                            }
                        },
                            h('div', { 
// ... (остальной код без изменений) ...
                                style: { 
                                    height: 48, 
                                    width: 48, 
                                    borderRadius: '50%', 
                                    background: 'var(--main-bg-color)', 
                                    overflow: 'hidden', 
                                    flexShrink: 0 
                                } 
                            },
                                h('img', { 
// ... (остальной код без изменений) ...
                                    src: avatar, 
                                    alt: '', 
                                    // ✅ НОВОЕ: Добавляем lazy loading
                                    loading: 'lazy',
                                    style: { width: '100%', height: '100%', objectFit: 'cover' } 
                                })
                            ),
                            h('div', { style: { flex: 1, minWidth: 0 } },
                                h('div', { 
// ... (остальной код без изменений) ...
                                    style: { 
                                        fontWeight: 600, 
                                        fontSize: 16, 
                                        color: 'var(--main-text-color)' 
                                    } 
                                }, author.first_name || 'User'),
                                timeAgo && h('div', { 
// ... (остальной код без изменений) ...
                                    style: { 
                                        fontSize: 14, 
                                        color: 'var(--main-hint-color)', 
                                        marginTop: 2 
                                    } 
                                }, timeAgo)
                            )
                        ),
                        
                        // ТЕГ (справа, на той же линии)
                        h('div', { 
// ... (остальной код без изменений) ...
                            style: { 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 16px', 
                                borderRadius: 12, 
                                background: type_info.color, 
                                color: '#FFFFFF', 
                                fontSize: 15, 
                                fontWeight: 600,
                                flexShrink: 0
                            } 
                        }, 
                            h('span', { style: { fontSize: 20 } }, type_info.icon),
                            type_info.text
                        )
                    ),
                    
                    // КРАТКОЕ ОПИСАНИЕ
                    h('div', { 
// ... (остальной код без изменений) ...
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
// ... (остальной код без изменений) ...
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Краткое описание'),
                        h('p', { 
// ... (остальной код без изменений) ...
                            style: { 
                                margin: 0, 
                                fontSize: 15, 
                                lineHeight: 1.6, 
                                color: 'var(--main-text-color)', 
                                whiteSpace: 'pre-wrap' 
                            } 
                        }, content || 'Нет описания')
                    ),
                    
                    // ПОЛНОЕ ОПИСАНИЕ
                    full_description && full_description.trim() && h('div', { 
// ... (остальной код без изменений) ...
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
// ... (остальной код без изменений) ...
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Подробное описание'),
                        h('p', { 
// ... (остальной код без изменений) ...
                            style: { 
                                margin: 0, 
                                fontSize: 15, 
                                lineHeight: 1.6, 
                                color: 'var(--main-text-color)', 
                                whiteSpace: 'pre-wrap' 
                            } 
                        }, full_description)
                    ),
                    
                    // ТЕГИ
                    skill_tags && skill_tags.length > 0 && h('div', { 
// ... (остальной код без изменений) ...
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
// ... (остальной код без изменений) ...
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Навыки'),
                        h('div', { 
// ... (остальной код без изменений) ...
                            style: { 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 8 
                            } 
                        },
                            ...skill_tags.map(tag => h('span', {
                                key: tag,
                                // (ИЗМЕНЕНИЕ) Используем единый класс
                                className: 'skill-tag skill-tag--display',
                                style: {
                                    // (ИЗМЕНЕНИЕ) Убираем стили, которые теперь в CSS
                                }
                            }, tag))
                        )
                    ),
                    
                    // ДЕЙСТВИЯ
                    h('div', { 
// ... (остальной код без изменений) ...
                        style: { 
                            display: 'grid',
                            gap: 10,
                            marginTop: 20
                        }
                    },
                        // Кнопки редактирования/удаления (только для своих постов)
                        isMyPost && h('div', {
// ... (остальной код без изменений) ...
                            style: {
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                                marginBottom: 10
                            }
                        },
                            h('button', {
// ... (остальной код без изменений) ...
                                className: 'action-button secondary',
                                onClick: () => {
                                    onEdit(post);
                                    onClose();
                                },
                                // ✅ ИСПРАВЛЕНИЕ (Bug): Добавлен зеленый фон
                                style: { 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 8,
                                    background: '#34C759', // <-- ЗЕЛЕНЫЙ
                                    color: '#ffffff'       // <-- БЕЛЫЙ ТЕКСТ
                                }
                            }, '✏️ Редактировать'),
                            h('button', {
// ... (остальной код без изменений) ...
                                className: 'action-button',
                                onClick: () => {
                                    onDelete(post);
                                    onClose();
                                },
                                style: { 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 8,
                                    background: '#FF3B30'
                                }
                            }, '🗑️ Удалить')
                        ),
                        
                        h('button', {
// ... (остальной код без изменений) ...
                            className: 'action-button',
                            onClick: () => onOpenProfile(author),
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
                        },
                            h('span', null, '👤'),
                            'Посмотреть профиль автора'
                        ),
                        // ✅ ИСПРАВЛЕНИЕ #8: Кнопка "Закрыть" здесь больше не нужна
                        /*
                        h('button', {
                            className: 'action-button secondary',
                            onClick: onClose
                        }, 'Закрыть')
                        */
                    )
                )
            )
        )
    );
    
}

// --- НОВЫЙ КОМПОНЕНТ: Анимированное FAB меню ---
function FABMenu({ onCreatePost, onMyPosts, onSaved, onSubscriptions }) {
// ... (остальной код без изменений) ...
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleMenu = useCallback(() => {
        if (tg?.HapticFeedback?.impactOccurred) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        setIsOpen(prev => !prev);
    }, []);
    
    const handleAction = useCallback((action) => {
        setIsOpen(false);
        if (tg?.HapticFeedback?.impactOccurred) {
            tg.HapticFeedback.impactOccurred('light');
        }
        action();
    }, []);
    
    const menuItems = [
        { icon: '➕', label: 'Создать запрос', action: onCreatePost, color: '#007AFF' },
        { icon: '📝', label: 'Мои запросы', action: onMyPosts, color: '#34C759' },
        { icon: '🔖', label: 'Сохраненное', action: onSaved, color: '#FF9500' },
        { icon: '❤️', label: 'Лента подписок', action: onSubscriptions, color: '#FF3B30' }
    ];
    
    return h('div', {
// ... (остальной код без изменений) ...
        style: {
            position: 'fixed',
            bottom: 0,
            right: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 999
        }
    },
        // Backdrop (затемнение)
        h(AnimatePresence, null,
// ... (остальной код без изменений) ...
            isOpen && h(motion.div, {
                key: 'backdrop',
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                transition: { duration: 0.2 },
                onClick: toggleMenu,
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    pointerEvents: 'auto'
                }
            })
        ),
        
        // Меню кнопок
        h('div', {
// ... (остальной код без изменений) ...
            style: {
                position: 'relative',
                padding: '0 20px 30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12,
                pointerEvents: 'auto'
            }
        },
            // Опции меню (появляются снизу вверх)
            h(AnimatePresence, null,
// ... (остальной код без изменений) ...
                isOpen && menuItems.map((item, index) => 
                    h(motion.div, {
                        key: item.label,
                        initial: { opacity: 0, y: 20, scale: 0.8 },
                        animate: { 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: {
                                type: 'spring',
                                stiffness: 400,
                                damping: 25,
                                delay: index * 0.05 // Stagger эффект
                            }
                        },
                        exit: { 
                            opacity: 0, 
                            y: 10, 
                            scale: 0.8,
                            transition: { duration: 0.15, delay: (menuItems.length - index - 1) * 0.03 }
                        },
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%'
                        }
                    },
                        // Лейбл (слева)
                        h(motion.div, {
// ... (остальной код без изменений) ...
                            initial: { opacity: 0, x: 20 },
                            animate: { 
                                opacity: 1, 
                                x: 0,
                                transition: { delay: index * 0.05 + 0.1 }
                            },
                            exit: { opacity: 0, x: 10 },
                            style: {
                                flex: 1,
                                textAlign: 'right',
                                paddingRight: 8
                            }
                        },
                            h('div', {
// ... (остальной код без изменений) ...
                                style: {
                                    display: 'inline-block',
                                    background: 'var(--secondary-bg-color, #2c2c2e)',
                                    color: 'var(--main-text-color, #fff)',
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }
                            }, item.label)
                        ),
                        
                        // Кнопка (справа)
                        h(motion.button, {
// ... (остальной код без изменений) ...
                            onClick: () => handleAction(item.action),
                            whileHover: { scale: 1.05 },
                            whileTap: { scale: 0.95 },
                            style: {
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                border: 'none',
                                background: item.color,
                                color: '#FFFFFF',
                                fontSize: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                flexShrink: 0
                            }
                        }, item.icon)
                    )
                )
            ),
            
            // Главная FAB кнопка (всегда видима)
            h(motion.button, {
// ... (остальной код без изменений) ...
                onClick: toggleMenu,
                animate: { 
                    rotate: isOpen ? 45 : 0,
                    scale: isOpen ? 1.1 : 1
                },
                transition: { type: 'spring', stiffness: 300, damping: 20 },
                whileTap: { scale: 0.9 },
                style: {
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--main-button-color, #007AFF)',
                    color: 'var(--main-button-text-color, #fff)',
                    fontSize: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }
            }, '➕')
        )
    );
}

// ✅ НОВОЕ: Простой Suspense fallback (скопирован из react-feed.js)
function ProfileFallback() {
// ... (остальной код без изменений) ...
    return h('div', {
        style: {
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.5)'
        }
    },
        h('div', {
            style: {
                width: 40,
                height: 40,
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }
        })
    );
}

// --- Находим хост для быстрых фильтров ---
const quickFiltersHost = document.getElementById('posts-quick-filters');
if (!quickFiltersHost) { console.warn("REACT Posts: Host element #posts-quick-filters not found!"); }

function App({ mountInto, overlayHost }) {
// ... (остальной код без изменений) ...
  const [cfg, setCfg] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [profileToShow, setProfileToShow] = useState(null);
  const [postToShow, setPostToShow] = useState(null);
  const [allSkills] = useState(POPULAR_SKILLS);
  
  // --- (ИЗМЕНЕНИЕ) Состояния для поиска ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null); // Состояние для статуса
  
  // --- (ИЗМЕНЕНИЕ) Применяем debounce ко всем фильтрам ---
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedSelectedSkills = useDebounce(selectedSkills, 300);
  const debouncedStatusFilter = useDebounce(statusFilter, 300);

  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const inputRef = useRef(null);
  const statusFilterInputRef = useRef(null);
  
  const listContainerRef = useRef(null);
  
  // (ИЗМЕНЕНИЕ) Удаляем вызов useFlipAnimation
  
  
  const handleBackToAllPosts = useCallback(() => {
// ... (остальной код без изменений) ...
    console.log("Back to all posts");
    document.dispatchEvent(new CustomEvent('show-all-posts'));
  }, []);
  
  useEffect(() => { 
// ... (остальной код без изменений) ...
    inputRef.current = document.getElementById('posts-search-input'); 
    statusFilterInputRef.current = document.getElementById('posts-status-filter-input');
    
    // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
    // Вся логика, связанная с 'backBtn', УДАЛЕНА
    /*
    const backBtn = document.getElementById('back-to-all-posts-button');
    if (backBtn) {
        backBtn.addEventListener('click', handleBackToAllPosts);
    }
    
    return () => {
        if (backBtn) {
            backBtn.removeEventListener('click', handleBackToAllPosts);
        }
    };
    */
  }, [handleBackToAllPosts]);

  const fetchPosts = useCallback(async () => {
// ... (остальной код без изменений) ...
    if (!cfg?.backendUrl) return; 
    console.log("REACT Posts: Fetching posts...");
    try {
      const endpoint = showMyPostsOnly ? '/api/get-my-posts' : '/api/get-posts-feed';
      const resp = await postJSON(`${cfg.backendUrl}${endpoint}`, { initData: tg?.initData });
      if (resp?.ok) {
        const postsWithKeys = (resp.posts || []).map((p, index) => {
             const uniqueLayoutPrefix = `post-${p.post_id || 'no-id'}-author-${p.author?.user_id || 'unknown'}`;
             return { ...p, post_id: p.post_id || `generated-${index}-${uniqueLayoutPrefix}`, uniqueLayoutPrefix: uniqueLayoutPrefix };
        });
        setPosts(postsWithKeys); 
        console.log("REACT Posts: Posts fetched:", postsWithKeys.length);
      } else { console.error("REACT Posts: Failed to fetch posts:", resp); setPosts([]); }
    } catch (e) { console.error("REACT Posts: Error fetching posts:", e); setPosts([]); }
  }, [cfg, showMyPostsOnly]);

// (ИСПРАВЛЕНО) Читаем конфиг из window (без изменений)
  useEffect(() => {
// ... (остальной код без изменений) ...
    (async () => {
        try {
            if (!window.__CONFIG) {
                 console.error("React-posts: Конфиг не найден!");
                 await new Promise(resolve => setTimeout(resolve, 500));
                 if (!window.__CONFIG) {
                     console.error("React-posts: Конфиг все еще не найден!");
                     return;
                 }
            }
            const c = window.__CONFIG;
            setCfg(c);
        } catch (error) {
            console.error("React-posts: Ошибка в useEffect init:", error);
        }
    })();
  }, []);
  useEffect(() => { if (cfg) { fetchPosts(); } }, [cfg, fetchPosts]);
  useEffect(() => { const handleUpdate = () => { fetchPosts(); }; document.addEventListener('posts-updated', handleUpdate); return () => document.removeEventListener('posts-updated', handleUpdate); }, [fetchPosts]);

  // --- (ИСПРАВЛЕНИЕ) ---
  // Слушатель смены режима (теперь также слушает 'skills' и 'status')
  useEffect(() => {
// ... (остальной код без изменений) ...
    const handleSetMode = (event) => {
        if (!event.detail) return;

        // 1. Обработка переключения "Мои посты"
        if (typeof event.detail.showMyPostsOnly === 'boolean') {
            const { showMyPostsOnly } = event.detail;
            console.log("REACT (Posts): Получена команда set-posts-feed-mode (showMyPostsOnly)", showMyPostsOnly);
            setShowMyPostsOnly(showMyPostsOnly);
        }

        // 2. Обработка фильтра по НАВЫКАМ (из модального окна)
        if (Array.isArray(event.detail.skills)) {
             console.log("REACT (Posts): Получена команда set-posts-feed-mode (skills)", event.detail.skills);
             setSelectedSkills(event.detail.skills);
             // Обновляем инпут
             if (inputRef.current) {
                inputRef.current.value = event.detail.skills.join(', ');
             }
        }
        
        // 3. Обработка фильтра по СТАТУСУ (из модального окна)
        // (Мы проверяем 'status' на null, т.к. null - это "сбросить фильтр")
        if (event.detail.status !== undefined) {
            console.log("REACT (Posts): Получена команда set-posts-feed-mode (status)", event.detail.status);
            setStatusFilter(event.detail.status);
            // Обновляем скрытый инпут
            if (statusFilterInputRef.current) {
                statusFilterInputRef.current.value = event.detail.status || '';
            }
        }
    };
    document.addEventListener('set-posts-feed-mode', handleSetMode);
    return () => {
        document.removeEventListener('set-posts-feed-mode', handleSetMode);
    };
  }, []); // Пустой массив зависимостей, чтобы слушатель добавился один раз
  // --- (КОНЕЦ ИСПРАВЛЕНИЯ) ---

  // ✅ ИЗМЕНЕНИЕ (Fullscreen Nav): 
  // Логика, связанная с 'backToProfileBtn' и 'backToAllBtn', УДАЛЕНА
  useEffect(() => {
// ... (остальной код без изменений) ...
    const titleEl = document.querySelector('#posts-feed-container h1[data-i18n-key="feed_posts_title"]');
    // const backToProfileBtn = document.getElementById('back-to-profile-from-posts-button'); // УДАЛЕНО
    // const backToAllBtn = document.getElementById('back-to-all-posts-button'); // УДАЛЕНО
    
    if (!titleEl) return; // Убрали кнопки из проверки

    if (showMyPostsOnly) {
        titleEl.textContent = t('my_posts_title'); // 'Мои запросы'
        // backToProfileBtn.style.display = 'none'; // УДАЛЕНО
        // backToAllBtn.style.display = 'block'; // УДАЛЕНО
    } else {
        titleEl.textContent = t('feed_posts_title'); // 'Лента запросов'
        // backToProfileBtn.style.display = 'block'; // УДАЛЕНО
        // backToAllBtn.style.display = 'none'; // УДАЛЕНО
    }
  }, [showMyPostsOnly]); 

  // --- (ИЗМЕНЕНИЕ) Главный useEffect фильтрации по DEBOUNCED-значениям ---
  useEffect(() => {
// ... (остальной код без изменений) ...
    const qLower = debouncedSearchQuery.toLowerCase(); 
    const terms = qLower.replace(/,/g, ' ').split(' ').map(s => s.trim()).filter(Boolean);
    const selectedSkillsLower = debouncedSelectedSkills.map(s => s.toLowerCase());
    
    if (!posts || posts.length === 0) { 
        setFiltered([]); 
        return; 
    }
    
    const newFiltered = posts.filter(p => {
      const postSkillsLower = (p.skill_tags || []).map(s => s.toLowerCase());
      const authorNameLower = (p.author?.first_name || '').toLowerCase();
      const contentLower = (p.content || '').toLowerCase();
      
      // 1. Проверка по статусу
      const statusMatch = !debouncedStatusFilter || p.post_type === debouncedStatusFilter;

      // 2. Проверка по тегам
      const tagMatch = selectedSkillsLower.length === 0 || selectedSkillsLower.every(selSkill => postSkillsLower.includes(selSkill));
      
      // 3. Проверка по тексту
      const textMatch = terms.length === 0 || terms.every(term => 
          authorNameLower.includes(term) || 
          contentLower.includes(term) || 
          postSkillsLower.some(skill => skill.includes(term))
      );
      
      return statusMatch && tagMatch && textMatch;
    });
    
    setFiltered(newFiltered);
    
  }, [posts, debouncedSearchQuery, debouncedSelectedSkills, debouncedStatusFilter]); // (ИЗМЕНЕНИЕ) Зависим от debounced-значений

  // --- (ИЗМЕНЕНИЕ) useEffect слушателя инпута ---
  useEffect(() => {
// ... (остальной код без изменений) ...
    const input = inputRef.current; 
    if (!input) return;
    
    // Эта функция ТОЛЬКО обновляет state
    const handleInput = () => {
      // 1. Считываем видимый инпут (текст/навыки)
      const currentQuery = input.value; 
      setSearchQuery(currentQuery); // Обновляем state
      
      // 2. Считываем СКРЫТЫЙ инпут (статус)
      const currentStatus = statusFilterInputRef.current ? statusFilterInputRef.current.value : null;
      setStatusFilter(currentStatus); // Обновляем state
      
      // 3. Логика авто-выбора тегов (без изменений)
      const potentialSkills = currentQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const allPotentialAreKnown = potentialSkills.length > 0 && potentialSkills.every(ps => allSkills.some(as => as.toLowerCase() === ps));
      if (!allPotentialAreKnown || currentQuery.trim().length === 0) { 
          if (selectedSkills.length > 0) { 
              setSelectedSkills([]); 
          } 
      } else {
        const skillsFromInput = potentialSkills.map(ps => allSkills.find(as => as.toLowerCase() === ps) || ps).sort((a,b) => a.localeCompare(b));
        const currentSelectedSorted = [...selectedSkills].sort((a,b) => a.localeCompare(b));
        if (JSON.stringify(skillsFromInput) !== JSON.stringify(currentSelectedSorted)) { 
            setSelectedSkills(skillsFromInput); 
        }
      }
    };
    
    input.addEventListener('input', handleInput); 
    return () => { if (input) input.removeEventListener('input', handleInput); };
  }, [allSkills, selectedSkills]); // (ИЗМЕНЕНИЕ) Убраны лишние зависимости

  // (ВОССТАНОВЛЕНА ФУНКЦИЯ) (без изменений)
  useEffect(() => {
// ... (остальной код без изменений) ...
    const skillButton = document.getElementById('open-skills-modal-button-posts'); if (!skillButton) return;
    const handleClick = () => { const event = new CustomEvent('openSkillsModal', { detail: { source: 'postsFeed', skills: selectedSkills } }); document.dispatchEvent(event); };
    skillButton.addEventListener('click', handleClick); return () => skillButton.removeEventListener('click', handleClick);
  }, [selectedSkills]);

  // (ИЗМЕНЕНИЕ) onToggleSkill теперь обновляет state
  const onToggleSkill = useCallback((skill) => {
// ... (остальной код без изменений) ...
    const lowerSkill = skill.toLowerCase(); let newSelectedSkills;
    const isSelected = selectedSkills.some(s => s.toLowerCase() === lowerSkill);
    if (isSelected) { newSelectedSkills = selectedSkills.filter(s => s.toLowerCase() !== lowerSkill); } 
    else { const canonicalSkill = allSkills.find(s => s.toLowerCase() === lowerSkill) || skill; newSelectedSkills = [...selectedSkills, canonicalSkill].sort((a, b) => a.localeCompare(b)); }
    
    // Обновляем state, который запустит debounce
    setSelectedSkills(newSelectedSkills); 
    const newInputValue = newSelectedSkills.join(', ');
    setSearchQuery(newInputValue); // Также обновляем state поиска
    
    if (inputRef.current && inputRef.current.value !== newInputValue) { 
        inputRef.current.value = newInputValue; 
    }
    // Сбрасываем статус при смене тега
    if (statusFilterInputRef.current) {
        statusFilterInputRef.current.value = '';
    }
    setStatusFilter(null);
    
  }, [selectedSkills, allSkills]); // (ИЗМЕНЕНИЕ) Убрана зависимость searchQuery

  // (Без изменений)
  const handleOpenProfile = useCallback(async (author) => {
// ... (остальной код без изменений) ...
    if (!author || !author.user_id) { console.error("REACT Posts: Invalid author data:", author); return; }
    if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
    setPostToShow(null);
    try {
      const resp = await postJSON(`${cfg.backendUrl}/get-user-by-id`, { initData: tg?.initData, target_user_id: author.user_id });
      if (resp?.ok && resp.profile) { setProfileToShow(resp.profile); } else { setProfileToShow(author); }
    } catch(e) { console.error("REACT Posts: Error loading full profile:", e); setProfileToShow(author); }
  }, [cfg]);

  const handleCloseProfile = useCallback(() => { setProfileToShow(null); }, []);
  const handleOpenPostSheet = useCallback((post) => {
// ... (остальной код без изменений) ...
    if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('medium');
    setPostToShow(post);
  }, []);
  const handleClosePostSheet = useCallback(() => { setPostToShow(null); }, []);

  // ✅ ИСПРАВЛЕНИЕ (Задача 6): Отправляем CustomEvent вместо .click()
  const handleCreatePost = useCallback(() => {
    console.log("FAB: Create post clicked");
    // const createBtn = document.getElementById('create-post-button');
    // if (createBtn) createBtn.click();
    document.dispatchEvent(new CustomEvent('openCreatePostModal'));
  }, []);

  const handleMyPosts = useCallback(() => {
// ... (остальной код без изменений) ...
    console.log("FAB: My posts clicked");
    document.dispatchEvent(new CustomEvent('show-my-posts'));
  }, []);

  const handleSaved = useCallback(() => {
// ... (остальной код без изменений) ...
    console.log("FAB: Saved clicked");
    tg.showAlert('Сохраненное - в разработке');
  }, []);

  const handleSubscriptions = useCallback(() => {
// ... (остальной код без изменений) ...
    console.log("FAB: Subscriptions clicked");
    tg.showAlert('Лента подписок - в разработке');
  }, []);

  // Новые обработчики для редактирования/удаления
  const handleEditPost = useCallback((post) => {
// ... (остальной код без изменений) ...
    console.log("Edit post:", post.post_id);
    setEditingPost(post);
    setPostToShow(null);
  }, []);

  // (ВОССТАНОВЛЕНА ФУНКЦИЯ) (без изменений)
  const handleDeletePost = useCallback(async (post) => {
// ... (остальной код без изменений) ...
    if (tg?.showConfirm) {
        tg.showConfirm("Удалить этот запрос?", async (ok) => {
            if (!ok) return;
            try {
              const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, {
                initData: tg?.initData,
                post_id: post.post_id
              });
              if (resp?.ok) {
                if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success');
                setPostToShow(null);
                fetchPosts(); // Обновляем ленту
              } else {
                tg.showAlert('Ошибка при удалении');
              }
            } catch (e) {
              console.error("Delete error:", e);
              tg.showAlert('Ошибка связи с сервером');
            }
        });
    } else {
        if (!confirm('Удалить этот запрос?')) return;
        try {
          const resp = await postJSON(`${cfg.backendUrl}/api/delete-post`, {
            initData: tg?.initData,
            post_id: post.post_id
          });
          if (resp?.ok) {
            if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred('success');
            setPostToShow(null);
            fetchPosts(); 
          } else {
            tg.showAlert('Ошибка при удалении');
          }
        } catch (e) {
          console.error("Delete error:", e);
          tg.showAlert('Ошибка связи с сервером');
        }
    }
  }, [cfg, fetchPosts]);

  // (ВОССТАНОВЛЕНА ФУНКЦИЯ) (без изменений)
  const handleSaveEdit = useCallback(async (postData) => {
// ... (остальной код без изменений) ...
    try {
      const resp = await postJSON(`${cfg.backendUrl}/api/update-post`, {
        initData: tg?.initData,
        post_id: editingPost.post_id,
        post_type: postData.post_type,
        content: postData.content,
        full_description: postData.full_description,
        skill_tags: postData.skill_tags
      });
      
      if (resp?.ok) {
        if (tg?.HapticFeedback?.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred('success');
        }
        setEditingPost(null);
        fetchPosts();
      } else {
        tg.showAlert('Ошибка при сохранении');
      }
    } catch (e) {
      console.error("Update error:", e);
      tg.showAlert('Ошибка связи с сервером');
    }
  }, [cfg, editingPost, fetchPosts]);

  return h('div', { style: { padding: '0 12px 12px' } },
// ... (остальной код без изменений) ...
    
    h(PostsList, { 
      posts: filtered, 
      onOpenProfile: handleOpenProfile,
      onOpenPostSheet: handleOpenPostSheet,
      onTagClick: onToggleSkill,
      isMyPosts: showMyPostsOnly,
      onEditPost: handleEditPost,
      onDeletePost: handleDeletePost,
      containerRef: listContainerRef
    }),
    
    // ✅ НОВОЕ: Оборачиваем модалки в Suspense
    h(Suspense, { fallback: h(ProfileFallback) },
// ... (остальной код без изменений) ...
        h(AnimatePresence, null, 
          profileToShow && h(ProfileSheet, { key: `profile-${profileToShow.user_id}`, user: profileToShow, onClose: handleCloseProfile }),
          postToShow && h(PostDetailSheet, { 
            key: `post-${postToShow.post_id}`, 
            post: postToShow, 
            onClose: handleClosePostSheet, 
            onOpenProfile: handleOpenProfile,
            isMyPost: showMyPostsOnly,
            onEdit: handleEditPost,
            onDelete: handleDeletePost
          }),
          editingPost && h(EditPostModal, {
            key: `edit-${editingPost.post_id}`,
            post: editingPost,
            onClose: () => setEditingPost(null),
            onSave: handleSaveEdit
          })
        )
    ),
    
    h(FABMenu, {
// ... (остальной код без изменений) ...
      onCreatePost: handleCreatePost,
      onMyPosts: handleMyPosts,
      onSaved: handleSaved,
      onSubscriptions: handleSubscriptions
    }),
    
    quickFiltersHost && createPortal(h(QuickFilterTags, { skills: allSkills, selected: selectedSkills, onToggle: onToggleSkill }), quickFiltersHost)
  );
}

// --- Монтирование ---
window.REACT_FEED_POSTS = true;
function mountReactPostsFeed() {
// ... (остальной код без изменений) ...
  // ✅ ИСПРАВЛЕНИЕ: Убрана лишняя 'S' во флаге. Было REACT_FEEDS_POSTS
  if (!window.REACT_FEED_POSTS) { 
       console.warn("REACT Posts: Global flag window.REACT_FEED_POSTS is false. Skipping mount.");
       return; 
  }
  const hostList = document.getElementById('posts-list'); if (!hostList) { console.error("REACT Posts: Host element #posts-list not found!"); return; }
  if (!quickFiltersHost) { console.error("REACT Posts: Host element #posts-quick-filters not found for portal!"); }
  hostList.innerHTML = '';
  try {
      const root = createRoot(hostList);
      root.render(h(PhoneShell, null, h(App, { mountInto: hostList })));
      console.log("REACT Posts: Component mounted successfully into #posts-list.");
      return () => { try { root.unmount(); } catch(e) { console.error("REACT Posts: Unmount failed:", e); } };
  } catch (e) { console.error("REACT Posts: Failed to mount component:", e); }
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mountReactPostsFeed); } else { mountReactPostsFeed(); }