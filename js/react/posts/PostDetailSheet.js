// react/posts/PostDetailSheet.js
// "Шторка" (модальное окно) с детальной информацией о посте.

import React, { useState, useRef, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { t, formatPostTime, isIOS } from './utils.js';

const h = React.createElement;

/**
 * Компонент PostDetailSheet
 * (Вынесен из react-posts-feed.js)
 */
function PostDetailSheet({ post, onClose, onOpenProfile, isMyPost, onEdit, onDelete, onRespond, onRepost }) {
    const sheetRef = useRef(null);
    
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
    
    return h(motion.div, { 
        style:{ 
            position:'fixed', 
            inset:0, 
            zIndex:1001,
            display: 'flex',
            alignItems: 'flex-end',
            pointerEvents: 'auto'
        }, 
        initial:{opacity:0}, 
        animate:{opacity:1}, 
        exit:{opacity:0},
        transition: { duration: 0.2 }
    },
        // Backdrop
        h(motion.div, { 
            onClick:onClose, 
            style:{
                position:'absolute', 
                inset:0, 
                background:'rgba(0,0,0,.5)',
                cursor: 'pointer'
            }, 
            initial:{opacity:0}, 
            animate:{opacity:1}, 
            exit:{opacity:0} 
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
            
            // Контент "шторки"
            h('div', {
                ref: sheetRef,
                className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
                style: { 
                    position: 'relative', 
                    width: '100%',
                    maxHeight: '85vh',
                    borderTopLeftRadius: 20, 
                    borderTopRightRadius: 20, 
                    overflow: 'auto',
                    cursor: 'auto',
                },
                onClick: (e) => e.stopPropagation()
            },
                
                // Внутренний padding
                h('div', { style: { 
                    padding: '20px 20px 20px 20px'
                } },
                    // Шапка (Аватар, Имя, Тег)
                    h('div', { 
                        style: { 
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: 20
                        } 
                    },
                        // Автор (слева)
                        h('button', {
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
                                    src: avatar, 
                                    alt: '', 
                                    loading: 'lazy',
                                    style: { width: '100%', height: '100%', objectFit: 'cover' } 
                                })
                            ),
                            h('div', { style: { flex: 1, minWidth: 0 } },
                                h('div', { 
                                    style: { 
                                        fontWeight: 600, 
                                        fontSize: 16, 
                                        color: 'var(--main-text-color)' 
                                    } 
                                }, author.first_name || 'User'),
                                timeAgo && h('div', { 
                                    style: { 
                                        fontSize: 14, 
                                        color: 'var(--main-hint-color)', 
                                        marginTop: 2 
                                    } 
                                }, timeAgo)
                            )
                        ),
                        
                        // Тег (справа)
                        h('div', { 
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
                    
                    // Краткое описание
                    h('div', { 
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Краткое описание'),
                        h('p', { 
                            style: { 
                                margin: 0, 
                                fontSize: 15, 
                                lineHeight: 1.6, 
                                color: 'var(--main-text-color)', 
                                whiteSpace: 'pre-wrap' 
                            } 
                        }, content || 'Нет описания')
                    ),
                    
                    // Полное описание
                    full_description && full_description.trim() && h('div', { 
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Подробное описание'),
                        h('p', { 
                            style: { 
                                margin: 0, 
                                fontSize: 15, 
                                lineHeight: 1.6, 
                                color: 'var(--main-text-color)', 
                                whiteSpace: 'pre-wrap' 
                            } 
                        }, full_description)
                    ),
                    
                    // Теги навыков
                    skill_tags && skill_tags.length > 0 && h('div', { 
                        style: { 
                            background: 'var(--main-bg-color)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }
                    },
                        h('h3', { 
                            style: { 
                                margin: '0 0 12px 0', 
                                fontSize: 17, 
                                fontWeight: 600,
                                color: 'var(--main-text-color)'
                            } 
                        }, 'Навыки'),
                        h('div', { 
                            style: { 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 8 
                            } 
                        },
                            ...skill_tags.map(tag => h('span', {
                                key: tag,
                                className: 'skill-tag skill-tag--display',
                            }, tag))
                        )
                    ),
                    
                    // Кнопки действий
                    h('div', { 
                        style: { 
                            display: 'grid',
                            gap: 10,
                            marginTop: 20
                        }
                    },
                        // Кнопки для своих постов
                        isMyPost && h('div', {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                                marginBottom: 10
                            }
                        },
                            h('button', {
                                className: 'action-button secondary',
                                onClick: () => {
                                    onEdit(post);
                                    onClose();
                                },
                                style: { 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 8,
                                    background: '#34C759',
                                    color: '#ffffff'
                                }
                            }, `✏️ ${t('action_edit')}`),
                            h('button', {
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
                            }, `🗑️ ${t('action_delete')}`)
                        ),
                        
                        // Кнопки для чужих постов
                        !isMyPost && h('div', {
                            className: 'post-detail-actions-row',
                            style: { gridTemplateColumns: '1fr 1fr 1fr' }
                        },
                            h('button', {
                                className: 'action-button secondary',
                                onClick: () => onRespond(post)
                            }, t('action_respond')),
                            h('button', {
                                className: 'action-button secondary',
                                onClick: () => onRepost(post)
                            }, t('action_repost')),
                            h('button', {
                                className: 'action-button secondary',
                                onClick: () => onOpenProfile(author)
                            }, t('action_view_profile'))
                        ),
                        
                        // Кнопки для своих постов (только Репост)
                        isMyPost && h('div', {
                            className: 'post-detail-actions-row',
                            style: { gridTemplateColumns: '1fr' }
                        },
                            h('button', {
                                className: 'action-button secondary',
                                onClick: () => onRepost(post)
                            }, t('action_repost'))
                        )
                    )
                )
            )
        )
    );
}

export default PostDetailSheet;