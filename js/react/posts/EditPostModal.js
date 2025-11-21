// react/posts/EditPostModal.js
import React, { useState, useEffect, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, isIOS, useSheetLogic, SheetControls, tg } from './posts_utils.js';

const h = React.createElement;
const limits = window.__CONFIG?.VALIDATION_LIMITS || {};
const MAX_CONTENT_LENGTH = limits.post_content || 500;
const MAX_FULL_DESC_LENGTH = limits.post_full_description || 2000;

function EditPostModal({ post, onClose, onSave }) {
  const [postType, setPostType] = useState(post.post_type || 'looking');
  const [content, setContent] = useState(post.content || '');
  const [fullDescription, setFullDescription] = useState(post.full_description || '');
  const [skillTags, setSkillTags] = useState((post.skill_tags || []).join(', '));
  const [currentSkillsArray, setCurrentSkillsArray] = useState(post.skill_tags || []);
  
  const { controlMode, dragControls, sheetProps } = useSheetLogic(onClose);

  useEffect(() => { 
      const handleSkillsUpdate = (event) => { 
          if (event.detail && Array.isArray(event.detail.skills)) { 
              setCurrentSkillsArray(event.detail.skills); 
              setSkillTags(event.detail.skills.join(', ')); 
          } 
      }; 
      document.addEventListener('skills-updated-for-post', handleSkillsUpdate); 
      return () => document.removeEventListener('skills-updated-for-post', handleSkillsUpdate); 
  }, []);
  
  const handleOpenSkillsModal = useCallback(() => { 
      if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light'); 
      document.dispatchEvent(new CustomEvent('openSkillsModal', { 
          detail: { source: 'editPostModal', skills: currentSkillsArray } 
      })); 
  }, [currentSkillsArray]);
  
  const handleSave = () => { 
      if (!content.trim()) { 
          if (tg && tg.showAlert) tg.showAlert(t('error_post_content_empty')); 
          return; 
      } 
      onSave({ post_type: postType, content: content.trim(), full_description: fullDescription.trim(), skill_tags: currentSkillsArray }); 
  };

  // ИСПОЛЬЗУЕМ PORTAL (рендерим в body)
  // Z-Index 3001 гарантирует, что это окно будет ПОВЕРХ контекстного меню (Z ~2000)
  return createPortal(
    h(motion.div, {
      style: { position: 'fixed', inset: 0, zIndex: 3001, display: 'flex', alignItems: 'flex-end', pointerEvents: 'auto', overflow: 'hidden' },
      initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }
    },
      h(motion.div, { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', cursor: 'pointer' } }),
      
      h(motion.div, {
          style: { position: 'relative', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' },
          ...sheetProps 
      },
          h(SheetControls, { controlMode, dragControls, onClose }),
      
          h('div', {
            className: `react-sheet-content ${isIOS ? 'is-ios' : ''} mode-${controlMode}`,
            style: {
              position: 'relative', width: '100%', maxHeight: '85vh',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              display: 'flex', flexDirection: 'column', 
              overflow: 'hidden',
              paddingTop: controlMode === 'swipes' ? '20px' : '0',
              willChange: 'transform', transform: 'translateZ(0)', backfaceVisibility: 'hidden'
            },
            onClick: (e) => e.stopPropagation()
          },
            h('div', { 
                className: 'sheet-scroll-container',
                style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 20px 10px 20px'
                }
            },
                h('h2', { className: 'sheet-header-title' }, t('edit_post_title')),
                
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
                    h('textarea', { id: 'edit-post-content', value: content, onChange: (e) => setContent(e.target.value), rows: 3, maxLength: MAX_CONTENT_LENGTH, placeholder: t('post_content_placeholder') }), 
                    h('div', { className: 'char-counter' }, `${content.length} / ${MAX_CONTENT_LENGTH}`)
                ),
                
                h('div', { className: 'form-group' }, 
                    h('label', { htmlFor: 'edit-post-full' }, t('post_full_description_label')), 
                    h('textarea', { id: 'edit-post-full', value: fullDescription, onChange: (e) => setFullDescription(e.target.value), rows: 6, maxLength: MAX_FULL_DESC_LENGTH, placeholder: t('post_full_description_placeholder') }), 
                    h('div', { className: 'char-counter' }, `${fullDescription.length} / ${MAX_FULL_DESC_LENGTH}`)
                ),
                
                h('div', { className: 'form-group' }, 
                    h('label', null, t('post_skills_label')), 
                    h('div', { className: 'skills-input-group', onClick: handleOpenSkillsModal }, 
                        h('input', { type: 'text', value: skillTags, readOnly: true, placeholder: t('select_skills_button'), }), 
                        h('button', { type: 'button', className: 'skills-input-button' }, 
                            h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, 
                                h('path', { d: 'M10 7h8M10 12h8M10 17h8', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' }), 
                                h('circle', { cx: '6', cy: '7', r: '1.5', fill: 'currentColor' }), 
                                h('circle', { cx: '6', cy: '12', r: '1.5', fill: 'currentColor' }), 
                                h('circle', { cx: '6', cy: '17', r: '1.5', fill: 'currentColor' })
                            )
                        )
                    )
                )
            ),
            
            h('div', { 
                className: `sheet-footer ${isIOS ? 'is-ios' : ''}`, 
                style: { 
                    padding: '16px 20px 20px 20px', 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 12, 
                    flexShrink: 0,
                    borderTop: '1px solid var(--main-bg-color)'
                } 
            },
              h('button', { onClick: onClose, className: 'action-button secondary', }, t('action_cancel')),
              h('button', { onClick: handleSave, className: 'action-button', }, t('action_save'))
            )
          )
      )
    ),
    document.body // Монтируем в body
  );
}
export default EditPostModal;