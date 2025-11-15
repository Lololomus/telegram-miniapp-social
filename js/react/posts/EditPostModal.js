// react/posts/EditPostModal.js
// Модальное окно для редактирования существующего поста.

import React, { useState, useEffect, useCallback, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { t, isIOS } from './posts_utils.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

/**
 * Компонент EditPostModal
 * (Вынесен из react-posts-feed.js)
 */
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

  // Слушатель для получения тегов из app.js
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
  }, []);

  // Обработчик клика по кнопке "Выбрать навыки"
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
  }, [currentSkillsArray]);

  const handleSave = () => {
    if (!content.trim()) {
      tg.showAlert('Заполните краткое описание');
      return;
    }
    
    onSave({
      post_type: postType,
      content: content.trim(),
      full_description: fullDescription.trim(),
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
      overflow: 'hidden'
    },
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
    // Backdrop
    h(motion.div, {
      onClick: onClose,
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        cursor: 'pointer'
      }
    }),
    
    // Обертка для анимации и шеврона
    h(motion.div, {
        style: {
            position: 'relative', 
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', 
        },
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { 
            type: 'spring', 
            damping: 30, 
            stiffness: 300 
        },
    },
        // Шеврон
        h('button', {
            className: `react-sheet-chevron-close ${isIOS ? 'is-ios' : ''}`,
            onClick: onClose,
            'aria-label': 'Закрыть',
        }, 
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
    
        // Контент модалки
        h('div', {
          className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
          style: {
            position: 'relative',
            width: '100%',
            maxHeight: '90vh',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'auto',
            padding: '20px',
            paddingBottom: '20px'
          },
          onClick: (e) => e.stopPropagation()
        },
          
          h('h2', { 
              className: 'profile-section-title', 
              style: { 
                  textAlign: 'center', 
                  margin: '0 0 20px 0', 
                  fontSize: 20 
              } 
          }, t('edit_post_title')),
          
          // 1. Тип запроса (Select)
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-type-select' }, t('post_type_label')),
            h('select', {
              id: 'edit-post-type-select',
              value: postType,
              onChange: (e) => setPostType(e.target.value)
              // Стилизация из form.css
            },
              h('option', { value: 'looking' }, t('post_type_looking')),
              h('option', { value: 'offering' }, t('post_type_offering')),
              h('option', { value: 'showcase' }, t('post_type_showcase'))
            )
          ),
          
          // 2. Краткое описание
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-content' }, t('post_content_label')),
            h('textarea', {
              id: 'edit-post-content',
              value: content,
              onChange: (e) => setContent(e.target.value),
              rows: 3,
            })
          ),
          
          // 3. Полное описание
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'edit-post-full' }, t('post_full_description_label')),
            h('textarea', {
              id: 'edit-post-full',
              value: fullDescription,
              onChange: (e) => setFullDescription(e.target.value),
              rows: 6,
            })
          ),
          
          // 4. Теги (Кнопка)
          h('div', { className: 'form-group' },
            h('label', null, t('post_skills_label')),
            h('div', { 
                className: 'skills-input-group',
                onClick: handleOpenSkillsModal
            },
                h('input', {
                  type: 'text',
                  value: skillTags,
                  readOnly: true,
                  placeholder: t('select_skills_button'),
                }),
                h('button', {
                    type: 'button',
                    className: 'skills-input-button',
                    'aria-label': t('select_skills_button')
                },
                    h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
                        h('path', { d: 'M10 7h8M10 12h8M10 17h8', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' }),
                        h('circle', { cx: '6', cy: '7', r: '1.5', fill: 'currentColor' }),
                        h('circle', { cx: '6', cy: '12', r: '1.5', fill: 'currentColor' }),
                        h('circle', { cx: '6', cy: '17', r: '1.5', fill: 'currentColor' })
                    )
                )
            )
          ),

          // Кнопки (внутри контента)
          h('div', {
            className: `react-sheet-footer ${isIOS ? 'is-ios' : ''}`,
            style: {
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
            }, t('action_cancel')),
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
        )
    )
  );
}

export default EditPostModal;