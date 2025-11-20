// react/shared/ProfileSheet.js

import React, { useState, useEffect, useRef, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { tg, isIOS, t, postJSON, useSheetLogic, SheetControls } from '../shared/react_shared_utils.js';

const h = React.createElement;

export function ProfileSheet({user, onClose}) {
    const avatar = user.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${user.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
    
    const skills = (()=> { 
        try { 
            return user.skills ? (typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills) : []; 
        } catch { 
            return []; 
        } 
    })();
    
    const experience = (()=> { 
        try { 
            return user.experience ? (typeof user.experience === 'string' ? JSON.parse(user.experience) : user.experience) : []; 
        } catch { 
            return []; 
        } 
    })();
    
    const education = (()=> { 
        try { 
            return user.education ? (typeof user.education === 'string' ? JSON.parse(user.education) : user.education) : []; 
        } catch { 
            return []; 
        } 
    })();
    
    const links = [user.link1, user.link2, user.link3, user.link4, user.link5].filter(Boolean);

    const { controlMode, dragControls, sheetProps } = useSheetLogic(onClose);

    // 🔧 БАГ 4: Безопасная проверка для FAB кнопок
    const shouldShowFAB = Boolean(
        window.__CURRENT_USER_ID && 
        user.user_id && 
        String(window.__CURRENT_USER_ID) !== String(user.user_id)
    );

    return h(React.Fragment, null,
        // Основной ProfileSheet
        h(motion.div, {
            style: { 
                position: 'fixed', 
                inset: 0, 
                zIndex: 1000, 
                display: 'flex', 
                alignItems: 'flex-end' 
            },
            initial: { opacity: 0 }, 
            animate: { opacity: 1 }, 
            exit: { opacity: 0 }
        },
            // 🔧 БАГ 3: Оверлей с защитой от преждевременного закрытия
            h(motion.div, {
                onClick: onClose,
                style: {
                    position: 'absolute', 
                    inset: 0, 
                    background: 'rgba(0,0,0,.5)',
                    pointerEvents: 'none'
                },
                initial: { opacity: 0 },
                animate: { 
                    opacity: 1,
                    pointerEvents: 'auto'
                },
                exit: { opacity: 0 },
                transition: { 
                    duration: 0.2,
                    pointerEvents: { delay: 0.25 }
                }
            }),
            
            h(motion.div, {
                style: {
                    position: 'relative', 
                    width: '100%', 
                    margin: '0 auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center'
                },
                ...sheetProps,
                onClick: (e) => e.stopPropagation()
            },
                h(SheetControls, { controlMode, dragControls, onClose }),
                
                h(motion.div, {
                    className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
                    style: {
                        position: 'relative', 
                        width: '100%', 
                        maxHeight: '70vh',
                        borderTopLeftRadius: 20, 
                        borderTopRightRadius: 20, 
                        borderTop: 'none',
                        overflow: 'auto',
                        padding: controlMode === 'swipes' ? '24px 16px 80px 16px' : '0 16px 80px 16px',
                        willChange: 'transform', 
                        transform: 'translateZ(0)', 
                        backfaceVisibility: 'hidden'
                    },
                    onClick: (e) => e.stopPropagation()
                },
                    h('button', {
                        onClick: (e) => {
                            e.stopPropagation(); 
                            if(tg) tg.showAlert('Меню в разработке');
                        },
                        className: `react-sheet-actions-button ${isIOS ? 'is-ios' : ''}`,
                        'aria-label': 'Действия'
                    }, '⋯'),
                    
                    h('div', { style: { padding: '20px 0', borderBottom: '1px solid var(--main-bg-color)' } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                            h(motion.div, { 
                                style: { 
                                    height: 64, 
                                    width: 64, 
                                    borderRadius: '50%', 
                                    overflow: 'hidden', 
                                    background: 'var(--main-bg-color)', 
                                    flexShrink: 0 
                                } 
                            },
                                h('img', {
                                    src: avatar, 
                                    alt: '', 
                                    style: { 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover' 
                                    }
                                })
                            ),
                            h('div', { style: { minWidth: 0, flex: 1 } },
                                h(motion.div, { 
                                    style: { 
                                        fontSize: 20, 
                                        fontWeight: 700, 
                                        marginBottom: 4 
                                    } 
                                }, user.first_name || 'User'),
                                h('div', { 
                                    style: { 
                                        opacity: 0.7, 
                                        fontSize: 14 
                                    } 
                                }, user.bio || 'Нет описания')
                            )
                        )
                    ),
                    
                    skills.length > 0 && h('div', { 
                        className: 'profile-section', 
                        style: { display: 'block', marginTop: '15px' } 
                    },
                        h('h3', { className: 'profile-section-title' }, t('skills')),
                        h('div', { 
                            className: 'skills-container', 
                            style: { 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '8px', 
                                maxHeight: 'none', 
                                marginTop: 0, 
                                justifyContent: 'center' 
                            } 
                        },
                            ...skills.map(s => h('span', { 
                                key: s, 
                                className: 'skill-tag skill-tag--display' 
                            }, s))
                        )
                    ),
                    
                    experience.length > 0 && h(SectionBlock, { 
                        title: t('experience'), 
                        items: experience, 
                        renderItem: (exp, isLast) => h('div', { 
                            className: 'profile-item', 
                            key: exp.id || Math.random(), 
                            style: { 
                                borderBottom: isLast ? 'none' : null, 
                                paddingBottom: isLast ? 0 : null, 
                                marginBottom: isLast ? 0 : null 
                            } 
                        },
                            h('p', { className: 'item-title' }, exp.job_title || '—'), 
                            h('p', { className: 'item-subtitle' }, exp.company || ''),
                            h('p', { className: 'item-period' }, 
                                [exp.start_date, exp.is_current == 1 ? t('present_time') : exp.end_date]
                                    .filter(Boolean)
                                    .join(' — ')
                            ),
                            exp.description && h('p', { className: 'item-description' }, exp.description)
                        )
                    }),
                    
                    education.length > 0 && h(SectionBlock, { 
                        title: t('education'), 
                        items: education, 
                        renderItem: (edu, isLast) => h('div', { 
                            className: 'profile-item', 
                            key: edu.id || Math.random(), 
                            style: { 
                                borderBottom: isLast ? 'none' : null, 
                                paddingBottom: isLast ? 0 : null, 
                                marginBottom: isLast ? 0 : null 
                            } 
                        },
                            h('p', { className: 'item-title' }, edu.institution || '—'), 
                            h('p', { className: 'item-subtitle' }, 
                                [edu.degree, edu.field_of_study]
                                    .filter(Boolean)
                                    .join(', ')
                            ),
                            h('p', { className: 'item-period' }, 
                                [edu.start_date, edu.end_date]
                                    .filter(Boolean)
                                    .join(' — ')
                            )
                        )
                    }),
                    
                    links.length > 0 && h(LinksCard, { links })
                )
            )
        ),
        
        // 🔧 ИСПРАВЛЕНО: FAB с синхронной анимацией через createPortal
        shouldShowFAB && createPortal(
            h(motion.div, {
                initial: { opacity: 0, scale: 0.8 },
                animate: { opacity: 1, scale: 1 },
                exit: { 
                    opacity: 0, 
                    scale: 0.8,
                    transition: { duration: 0.2 } // 👈 Синхронизировано с ProfileSheet
                },
                transition: { 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 30 
                }
            },
                h(FABContainer, { user })
            ),
            document.body
        )
    );
}

function SectionBlock({title, items, renderItem}) {
    return h('div', { 
        className: 'profile-section', 
        style: { display: 'block', marginTop: '15px' } 
    }, 
        h('h3', { className: 'profile-section-title' }, title), 
        h('div', { style: { display: 'grid', gap: 0 } }, 
            ...items.map((item, index) => renderItem(item, index === items.length - 1))
        )
    );
}

function LinksCard({links}) {
    return h('div', { 
        className: 'profile-section', 
        style: { display: 'block', marginTop: '15px' } 
    }, 
        h('div', { style: { display: 'grid', gap: 10, width: '100%' } }, 
            ...links.map((link, i) => h('a', { 
                key: i, 
                href: link, 
                target: '_blank', 
                rel: 'noopener noreferrer', 
                className: 'profile-link-button' 
            }, 
                h('span', { className: 'link-icon' }, '🔗'), 
                h('span', { className: 'link-text' }, link)
            ))
        )
    );
}

function FABContainer({user}) {
    const [isFollowed, setIsFollowed] = useState(user.is_followed_by_viewer || false);
    
    useEffect(() => {
        setIsFollowed(user.is_followed_by_viewer || false);
    }, [user.is_followed_by_viewer]);
    
    const handleContact = useCallback(async () => {
        if (!tg || !window.__CONFIG) return;
        try {
            const resp = await postJSON(
                `${window.__CONFIG.backendUrl}/get-telegram-user-info`, 
                { initData: tg.initData, target_user_id: user.user_id }
            );
            if (resp.ok && resp.username) {
                tg.openTelegramLink(`https://t.me/${resp.username}`);
            } else {
                tg.showAlert('Не удалось открыть профиль');
            }
        } catch(e) {
            if(tg) tg.showAlert('Ошибка связи с сервером');
        }
    }, [user.user_id]);
    
    const handleFollow = useCallback(async () => {
        if (!tg || !window.__CONFIG) return;
        const newState = !isFollowed;
        setIsFollowed(newState);
        try {
            const endpoint = newState ? '/follow' : '/unfollow';
            const resp = await postJSON(
                `${window.__CONFIG.backendUrl}${endpoint}`, 
                { initData: tg.initData, target_user_id: user.user_id }
            );
            if (!resp.ok) {
                setIsFollowed(!newState);
                tg.showAlert('Не удалось выполнить действие');
            } else if (tg?.HapticFeedback?.impactOccurred) {
                tg.HapticFeedback.impactOccurred('light');
            }
        } catch(e) {
            setIsFollowed(!newState);
            if(tg) tg.showAlert('Ошибка связи с сервером');
        }
    }, [isFollowed, user.user_id]);
    
    return h('div', { 
        className: 'fab-container',
        style: {
            // 🍎 iOS FIX
            bottom: `calc(30px + env(safe-area-inset-bottom, 0px))`
        }
    },
        h('button', { 
            onClick: handleContact, 
            title: 'Написать', 
            className: 'fab-button fab-secondary' 
        }, '💬'),
        h('button', { 
            onClick: handleFollow, 
            title: isFollowed ? 'Отписаться' : 'Подписаться', 
            className: `fab-button fab-primary ${isFollowed ? 'is-unfollow' : ''}` 
        }, isFollowed ? '✓' : '+')
    );
}

export default ProfileSheet;