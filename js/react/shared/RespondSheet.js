// react/posts/RespondSheet.js
import React from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t, tg } from '../posts/posts_utils.js';
import { getThemeColors } from './react_shared_utils.js';

const h = React.createElement;

/**
 * Универсальный компонент для откликов
 * mode: 'open' - модалка с копированием (для открытых профилей)
 * mode: 'form' - форма с текстом (для закрытых профилей)
 */
function RespondSheet({ post, mode = 'form', authorUsername, onSubmit, onClose }) {
  const colors = getThemeColors();
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const maxLength = 200;
  
  // Формируем текст для открытого профиля
  const appName = window.__CONFIG?.appSlug || 'App';
  const postPreview = post.content.slice(0, 50);
  const messageText = `Здравствуйте, я увидел запрос "${postPreview}${post.content.length > 50 ? '...' : ''}" в приложении ${appName}. Готов обсудить детали.`;
  
  // Handler для формы (закрытый профиль)
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await onSubmit(message.trim());
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      onClose();
    } catch (e) {
      setIsSubmitting(false);
      if (tg?.showAlert) {
        tg.showAlert(e.error || 'Ошибка отправки');
      }
    }
  };
  
  // Handler для копирования (открытый профиль)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };
  
  // Handler для открытия чата (открытый профиль)
  const handleOpenChat = () => {
    if (!authorUsername) {
      if (tg?.showAlert) {
        tg.showAlert(t('author_no_username') || 'Автор не указал username');
      }
      return;
    }
    
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    
    const url = `https://t.me/${authorUsername}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
    onClose();
  };
  
  // Контент для открытого профиля (модалка)
  const renderOpenMode = () => {
    return h(motion.div, {
      style: {
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        background: colors.bgSecondary,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      },
      initial: { scale: 0.9, y: 20 },
      animate: { scale: 1, y: 0 },
      exit: { scale: 0.9, y: 20 },
      onClick: (e) => e.stopPropagation()
    },
      // Header
      h('div', {
        style: {
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '600',
          color: colors.textPrimary
        }
      }, t('respond_modal_title') || 'Откликнуться на пост'),
      
      // Message preview
      h('div', {
        style: {
          background: colors.bgPrimary,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          color: colors.textSecondary,
          fontSize: '15px',
          lineHeight: '1.4',
          border: `1px solid ${colors.borderColor}`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }
      }, messageText),
      
      // Buttons
      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }
      },
        // Copy button
        h('button', {
          onClick: handleCopy,
          style: {
            padding: '14px',
            background: copied ? '#4CAF50' : colors.accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }
        },
          h('svg', {
            width: 20,
            height: 20,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2
          },
            copied 
              ? h('polyline', { points: '20 6 9 17 4 12' })
              : [
                  h('rect', { key: 'r1', x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }),
                  h('path', { key: 'p1', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
                ]
          ),
          copied ? (t('copied') || 'Скопировано!') : (t('copy_message') || '📋 Скопировать текст')
        ),
        
        // Open chat button
        h('button', {
          onClick: handleOpenChat,
          style: {
            padding: '14px',
            background: colors.accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }
        },
          h('svg', {
            width: 20,
            height: 20,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2
          },
            h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
          ),
          t('open_chat') || '💬 Открыть чат'
        ),
        
        // Cancel button
        h('button', {
          onClick: onClose,
          style: {
            padding: '14px',
            background: 'transparent',
            color: colors.textSecondary,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }
        }, t('cancel') || 'Отмена')
      )
    );
  };
  
  // Контент для закрытого профиля (форма)
  const renderFormMode = () => {
    return h(motion.div, {
      style: {
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        background: colors.bgSecondary,
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px',
        paddingBottom: '32px',
        boxShadow: '0 -5px 30px rgba(0,0,0,0.2)'
      },
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
      transition: { type: 'spring', damping: 30, stiffness: 300 },
      onClick: (e) => e.stopPropagation()
    },
      // Drag handle
      h('div', {
        style: {
          width: '36px',
          height: '4px',
          background: colors.borderColor,
          borderRadius: '2px',
          margin: '0 auto 20px'
        }
      }),
      
      // Header
      h('div', {
        style: {
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '600',
          color: colors.textPrimary
        }
      }, t('respond_form_title') || 'Отправить запрос на отклик'),
      
      // Hint
      h('div', {
        style: {
          marginBottom: '16px',
          fontSize: '14px',
          color: colors.textSecondary,
          lineHeight: '1.4'
        }
      }, t('respond_form_hint') || 'Опишите свой опыт или оставьте пустым'),
      
      // Textarea
      h('textarea', {
        value: message,
        onChange: (e) => setMessage(e.target.value),
        placeholder: t('respond_form_placeholder') || 'Ваше сообщение (необязательно)',
        maxLength: maxLength,
        style: {
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          background: colors.bgPrimary,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '12px',
          fontSize: '15px',
          lineHeight: '1.5',
          resize: 'vertical',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s'
        }
      }),
      
      // Character count
      h('div', {
        style: {
          marginTop: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: message.length > maxLength * 0.9 ? '#FF6B6B' : colors.textTertiary,
          textAlign: 'right'
        }
      }, `${message.length} / ${maxLength}`),
      
      // Buttons
      h('div', {
        style: {
          display: 'flex',
          gap: '12px'
        }
      },
        // Cancel
        h('button', {
          onClick: onClose,
          disabled: isSubmitting,
          style: {
            flex: 1,
            padding: '14px',
            background: 'transparent',
            color: colors.textSecondary,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }
        }, t('cancel') || 'Отмена'),
        
        // Submit
        h('button', {
          onClick: handleSubmit,
          disabled: isSubmitting || message.length > maxLength,
          style: {
            flex: 2,
            padding: '14px',
            background: (isSubmitting || message.length > maxLength) ? colors.borderColor : colors.accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: (isSubmitting || message.length > maxLength) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }
        },
          isSubmitting && h('div', {
            style: {
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite'
            }
          }),
          isSubmitting ? (t('sending') || 'Отправка...') : (t('send_request') || 'Отправить')
        )
      )
    );
  };
  
  return createPortal(
    h(AnimatePresence, null,
      h(motion.div, {
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 6000,
          display: 'flex',
          alignItems: mode === 'open' ? 'center' : 'flex-end',
          justifyContent: 'center',
          padding: mode === 'open' ? '20px' : 0
        },
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 }
      },
        // Backdrop
        h(motion.div, {
          onClick: onClose,
          style: {
            position: 'absolute',
            inset: 0,
            background: colors.overlayBg
          }
        }),
        
        // Content (выбор по mode)
        mode === 'open' ? renderOpenMode() : renderFormMode()
      )
    ),
    document.body
  );
}

export default RespondSheet;