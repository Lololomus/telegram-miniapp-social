// react/posts/EditPostScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS, tg } from './posts_utils.js';

const h = React.createElement;
const limits = window.__CONFIG?.VALIDATION_LIMITS || {};
const MAX_CONTENT_LENGTH = limits.post_content || 500;
const MAX_FULL_DESC_LENGTH = limits.post_full_description || 2000;

function EditPostScreen({ post, onClose, onSave }) {
  const [postType, setPostType] = useState(post.post_type || 'looking');
  const [content, setContent] = useState(post.content || '');
  const [fullDescription, setFullDescription] = useState(post.full_description || '');
  const [skillTags, setSkillTags] = useState((post.skill_tags || []).join(', '));
  const [currentSkillsArray, setCurrentSkillsArray] = useState(post.skill_tags || []);
  
  // Флаг блокировки: если true, значит открыта модалка навыков поверх
  const isExternalModalOpen = useRef(false);

  // Обработчик кнопки Назад с проверкой флага
  const handleBack = useCallback(() => {
      if (isExternalModalOpen.current) return;
      onClose();
  }, [onClose]);

  // --- УПРАВЛЕНИЕ КНОПКОЙ ПРИ МОНТАЖЕ ---
  useEffect(() => {
      const setupBack = () => {
          if (tg?.BackButton) {
              tg.BackButton.show();
              tg.BackButton.onClick(handleBack);
          }
      };
      setupBack();

      return () => {
          // При размонтировании подчищаем
          if (tg?.BackButton) {
              tg.BackButton.offClick(handleBack);
              tg.BackButton.hide();
          }
      };
  }, [handleBack]);

  const handleOpenSkillsModal = useCallback(async () => { 
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light'); 
      
      // 1. Блокируем реакцию на кнопку "Назад" в этом компоненте
      isExternalModalOpen.current = true;

      if (window.SkillsManager) {
          // 2. Открываем модалку навыков
          // Важно: returnTo: 'posts-feed-container' гарантирует, что app.js
          // восстановит видимость основного контейнера при закрытии модалки
          const result = await window.SkillsManager.select(currentSkillsArray, { 
              showStatus: false,
              returnTo: 'posts-feed-container' 
          });
          
          if (result && result.skills) {
              setCurrentSkillsArray(result.skills); 
              setSkillTags(result.skills.join(', ')); 
          }

          // 3. Восстанавливаем кнопку "Назад" (так как UI.showView мог её скрыть)
          if (tg?.BackButton) {
              tg.BackButton.show();
              tg.BackButton.onClick(handleBack);
          }
      }
      
      // 4. Снимаем блокировку с задержкой (чтобы пропустить событие клика)
      setTimeout(() => {
          isExternalModalOpen.current = false;
      }, 100);

  }, [currentSkillsArray, handleBack]);
  
  const handleSave = () => { 
      if (!content.trim()) { 
          if (tg && tg.showAlert) tg.showAlert(t('error_post_content_empty')); 
          return; 
      } 
      onSave({ post_type: postType, content: content.trim(), full_description: fullDescription.trim(), skill_tags: currentSkillsArray }); 
  };

  return createPortal(
    h(motion.div, {
      className: `screen edit-post-screen ${isIOS ? 'is-ios' : ''}`,
      style: { 
          position: 'fixed', inset: 0, zIndex: 5000,
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--main-bg-color)', 
          padding: 0,
      },
      initial: { y: '100%' }, 
      animate: { y: 0 }, 
      exit: { y: '100%' },
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
      // --- ХЕДЕР ---
      h('div', { 
          className: 'edit-post-header',
          style: {
              padding: 'calc(env(safe-area-inset-top, 20px) + 10px) 16px 10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--main-bg-color)',
              borderBottom: '1px solid var(--secondary-bg-color)',
              flexShrink: 0, position: 'relative'
          }
      },
          h('h2', { style: { margin: 0, fontSize: 17, fontWeight: 600 } }, t('edit_post_title') || "Редактирование")
      ),

      // --- КОНТЕНТ ---
      h('div', { 
          className: 'edit-post-scroll-content',
          style: { flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }
      },
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-type-select' }, t('post_type_label')), 
              h('select', { id: 'edit-post-type-select', value: postType, onChange: (e) => setPostType(e.target.value) }, 
                  h('option', { value: 'looking' }, t('post_type_looking')), 
                  h('option', { value: 'offering' }, t('post_type_offering')), 
                  h('option', { value: 'showcase' }, t('post_type_showcase'))
              )
          ),
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-content' }, t('post_content_label')), 
              h('textarea', { id: 'edit-post-content', value: content, onChange: (e) => setContent(e.target.value), rows: 3, maxLength: MAX_CONTENT_LENGTH }), 
              h('div', { className: 'char-counter' }, `${content.length} / ${MAX_CONTENT_LENGTH}`)
          ),
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-full' }, t('post_full_description_label')), 
              h('textarea', { id: 'edit-post-full', value: fullDescription, onChange: (e) => setFullDescription(e.target.value), rows: 6, maxLength: MAX_FULL_DESC_LENGTH }), 
              h('div', { className: 'char-counter' }, `${fullDescription.length} / ${MAX_FULL_DESC_LENGTH}`)
          ),
          h('div', { className: 'form-group' }, 
              h('label', null, t('post_skills_label')), 
              h('div', { className: 'skills-input-group', onClick: handleOpenSkillsModal }, 
                  h('input', { type: 'text', value: skillTags, readOnly: true, placeholder: t('select_skills_button'), style: { cursor: 'pointer' } }), 
                  h('button', { type: 'button', className: 'skills-input-button' }, 
                      h('svg', { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, 
                          h('rect', { x: "3", y: "3", width: "7", height: "7", rx: "1" }), 
                          h('rect', { x: "14", y: "3", width: "7", height: "7", rx: "1" }), 
                          h('rect', { x: "14", y: "14", width: "7", height: "7", rx: "1" }), 
                          h('rect', { x: "3", y: "14", width: "7", height: "7", rx: "1" })
                      )
                  )
              )
          )
      ),

      // --- КНОПКА СОХРАНИТЬ (Full Width) ---
      h('div', {
          className: 'fab-modal-save-container', // Используем контейнер из modals.css
          style: {
              // Дополнительная фиксация позиции для этого экрана
              position: 'fixed', 
              bottom: '25px', 
              left: '50%', 
              transform: 'translateX(-50%)',
              width: 'calc(100% - 40px)', 
              maxWidth: '560px', 
              zIndex: 5002 
          }
      },
          h('button', {
              onClick: handleSave,
              // Используем класс широкой кнопки из модалки навыков
              className: 'action-button fab-modal-save',
              style: {
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '17px',
                  padding: '16px'
              }
          }, t('action_save') || "Сохранить")
      )
    ),
    document.body
  );
}
export default EditPostScreen;