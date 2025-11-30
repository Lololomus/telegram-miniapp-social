// react/posts/EditPostScreen.js
// ОБНОВЛЕНО: Добавлен выбор опыта работы (Pills)
// ОБНОВЛЕНО: Удалены лишние стили (все перенесено в CSS)

import React, { useState, useEffect, useCallback, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS, tg } from './posts_utils.js';

const h = React.createElement;
const limits = window.__CONFIG?.VALIDATION_LIMITS || {};
const MAX_CONTENT_LENGTH = limits.post_content || 500;
const MAX_FULL_DESC_LENGTH = limits.post_full_description || 2000;

// Опции опыта (ключи для i18n)
const EXPERIENCE_OPTIONS = [
  { key: 'exp_no_exp',  value: 'no_exp',  label: 'Без опыта' },
  { key: 'exp_less_1',  value: 'less_1', label: 'До 1 года' },
  { key: 'exp_1_3',     value: '1-3',    label: '1–3 года' },
  { key: 'exp_3_5',     value: '3-5',    label: '3–5 лет' },
  { key: 'exp_5_plus',  value: '5+',     label: '5+ лет' }
];

function EditPostScreen({ post, onClose, onSave, originId }) {
  const [postType, setPostType] = useState(post.post_type || 'looking');
  const [content, setContent] = useState(post.content || '');
  const [fullDescription, setFullDescription] = useState(post.full_description || '');
  
  // --- НОВОЕ: Состояние для опыта ---
  const [experience, setExperience] = useState(post.experience_years || null);

  const [skillTags, setSkillTags] = useState((post.skill_tags || []).join(', '));
  const [currentSkillsArray, setCurrentSkillsArray] = useState(post.skill_tags || []);
  
  const isExternalModalOpen = useRef(false);

  const handleBack = useCallback(() => {
      if (isExternalModalOpen.current) return;
      onClose();
  }, [onClose]);

  useEffect(() => {
      const setupBack = () => {
          if (tg?.BackButton) {
              tg.BackButton.show();
              tg.BackButton.onClick(handleBack);
          }
      };
      setupBack();

      return () => {
          if (tg?.BackButton) {
              tg.BackButton.offClick(handleBack);
              tg.BackButton.hide();
          }
      };
  }, [handleBack]);

  const handleOpenSkillsModal = useCallback(async () => { 
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light'); 
      isExternalModalOpen.current = true;

      if (window.SkillsManager) {
          const result = await window.SkillsManager.select(currentSkillsArray, {
            showStatus: false,
            returnTo: originId || 'posts-feed-container',
            });
          
          if (result && result.skills) {
              setCurrentSkillsArray(result.skills); 
              setSkillTags(result.skills.join(', ')); 
          }

          if (tg?.BackButton) {
              tg.BackButton.show();
              tg.BackButton.onClick(handleBack);
          }
      }
      setTimeout(() => { isExternalModalOpen.current = false; }, 100);
  }, [currentSkillsArray, handleBack]);
  
  const handleSave = () => { 
      if (!content.trim()) { 
          if (tg && tg.showAlert) tg.showAlert(t('error_post_content_empty')); 
          return; 
      } 
      
      // --- ВАЖНО: Передаем опыт в onSave ---
      onSave({ 
          post_type: postType, 
          content: content.trim(), 
          full_description: fullDescription.trim(), 
          skill_tags: currentSkillsArray,
          experience_years: experience // <--- Добавлено
      }); 
  };

  return createPortal(
    h(motion.div, {
      className: `screen edit-post-screen ${isIOS ? 'is-ios' : ''}`,
      id: 'edit-post-screen', 
      style: { 
          position: 'fixed', inset: 0, zIndex: 5000,
          display: 'flex', flexDirection: 'column',
      },
      initial: { y: '100%' }, 
      animate: { y: 0 }, 
      exit: { y: '100%' },
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
      // ХЕДЕР
      h('div', { className: 'edit-post-header', style: { flexShrink: 0 } },
          h('h2', { style: { margin: 0, fontSize: 17, fontWeight: 600 } }, t('edit_post_title') || "Редактирование")
      ),

      // КОНТЕНТ
      h('div', { className: 'edit-post-scroll-content', style: { flex: 1 } },
          
          // 1. Тип поста
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-type-select' }, t('post_type_label')), 
              h('select', { id: 'edit-post-type-select', value: postType, onChange: (e) => setPostType(e.target.value) }, 
                  h('option', { value: 'looking' }, t('post_type_looking')), 
                  h('option', { value: 'offering' }, t('post_type_offering')), 
                  h('option', { value: 'showcase' }, t('post_type_showcase'))
              )
          ),

          // 2. Опыт работы (Pills) - Показываем только для 'looking' и 'offering'
          (postType === 'looking' || postType === 'offering') && h('div', { className: 'form-group' },
              h('label', null, t('post_exp_label') || "Опыт в этой сфере"),
              h('div', { className: 'experience-pills-container', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  EXPERIENCE_OPTIONS.map(opt => {
                      const isSelected = experience === opt.value;
                      return h('button', {
                          key: opt.value,
                          className: `exp-pill ${isSelected ? 'selected' : ''}`,
                          onClick: () => { 
                              setExperience(opt.value); 
                              if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                          },
                          // Стили будут в CSS, но базовые зададим здесь для надежности
                          style: {
                              padding: '8px 14px',
                              borderRadius: '20px',
                              border: '1px solid var(--secondary-bg-color)',
                              background: isSelected ? 'var(--main-button-color)' : 'transparent',
                              color: isSelected ? '#fff' : 'var(--main-text-color)',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                          }
                      }, t(opt.key) || opt.label);
                  })
              )
          ),

          // 3. Краткое описание
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-content' }, t('post_content_label')), 
              h('textarea', { id: 'edit-post-content', value: content, onChange: (e) => setContent(e.target.value), rows: 3, maxLength: MAX_CONTENT_LENGTH }), 
              h('div', { className: 'char-counter' }, `${content.length} / ${MAX_CONTENT_LENGTH}`)
          ),

          // 4. Полное описание
          h('div', { className: 'form-group' }, 
              h('label', { htmlFor: 'edit-post-full' }, t('post_full_description_label')), 
              h('textarea', { id: 'edit-post-full', value: fullDescription, onChange: (e) => setFullDescription(e.target.value), rows: 6, maxLength: MAX_FULL_DESC_LENGTH }), 
              h('div', { className: 'char-counter' }, `${fullDescription.length} / ${MAX_FULL_DESC_LENGTH}`)
          ),

          // 5. Навыки
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

      // КНОПКА СОХРАНИТЬ
      h('div', { className: 'fab-modal-save-container', style: { zIndex: 5002 } },
          h('button', {
              onClick: handleSave,
              className: 'action-button fab-modal-save',
          }, t('action_save') || "Сохранить")
      )
    ),
    document.body
  );
}
export default EditPostScreen;