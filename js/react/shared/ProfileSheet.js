// react/shared/ProfileSheet.js

import React, { useState, useEffect, useRef, useCallback } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { tg, isIOS, t, postJSON, useSheetLogic, SheetControls } from '../shared/react_shared_utils.js';

const h = React.createElement;

export function ProfileSheet({user, onClose}) {
    const avatar = user.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${user.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
    
    const skills = (()=> { try { return user.skills ? (typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills) : []; } catch { return []; } })();
    const experience = (()=> { try { return user.experience ? (typeof user.experience === 'string' ? JSON.parse(user.experience) : user.experience) : []; } catch { return []; } })();
    const education = (()=> { try { return user.education ? (typeof user.education === 'string' ? JSON.parse(user.education) : user.education) : []; } catch { return []; } })();
    const links = [user.link1, user.link2, user.link3, user.link4, user.link5].filter(Boolean);

    const { controlMode, dragControls, sheetProps } = useSheetLogic(onClose);
    const shouldShowFAB = Boolean(window.__CURRENT_USER_ID && user.user_id && String(window.__CURRENT_USER_ID) !== String(user.user_id));

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleScroll = () => { if(isMenuOpen) setIsMenuOpen(false); };
    const handleContentTouch = () => { if(isMenuOpen) setIsMenuOpen(false); };

    const handleShare = () => {
        setIsMenuOpen(false);
        const bot = window.__CONFIG?.botUsername;
        const app = window.__CONFIG?.appSlug;
        if (bot && app) {
            const appLink = `https://t.me/${bot}/${app}?startapp=${user.user_id}`;
            const text = t('share_profile_text', { name: user.first_name || 'User' });
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`;
            tg.openTelegramLink(shareUrl);
        }
    };

    const handleReport = () => {
        setIsMenuOpen(false);
        tg.showAlert(t('report_sent'));
    };

    return h(React.Fragment, null,
        h(motion.div, {
            style: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end' },
            initial: { opacity: 0 }, 
            animate: { opacity: 1 }, 
            // Мгновенно выключаем клики по контейнеру при начале выхода
            exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } } 
        },
            // Затемнение (Backdrop)
            h(motion.div, {
                onClick: onClose,
                style: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' },
                initial: { opacity: 0 }, 
                animate: { opacity: 1, pointerEvents: 'auto' }, 
                // Убираем затемнение быстро
                exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }
            }),
            
            h(motion.div, {
                style: { position: 'relative', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' },
                ...sheetProps,
                onClick: (e) => e.stopPropagation(),
                
                // ✅ ФИКС ЗАДЕРЖКИ: 
                // На вход используем красивую пружину.
                // На выход (exit) используем жесткий 'tween' (таймер) на 0.2 сек.
                // Как только 0.2 сек пройдет — React размонтирует компонент и ScrollLock снимется.
                transition: { type: 'spring', damping: 30, stiffness: 300 },
                exit: { 
                    y: '100%', 
                    transition: { type: 'tween', ease: 'easeInOut', duration: 0.2 } 
                }
            },
                h(SheetControls, { controlMode, dragControls, onClose }),

                // Кнопка "..." (ВНЕ контента)
                h('button', {
                    onClick: (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(!isMenuOpen);
                    },
                    onPointerDownCapture: (e) => e.stopPropagation(),
                    className: `react-sheet-actions-button ${isIOS ? 'is-ios' : ''}`,
                    'aria-label': 'Действия',
                    style: {
                        position: 'absolute',
                        top: controlMode === 'swipes' ? '20px' : '12px', 
                        left: '16px', 
                        zIndex: 200,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: isMenuOpen ? 'var(--main-button-color)' : undefined,
                        color: isMenuOpen ? '#fff' : undefined
                    }
                }, '⋯'),

                // Кастомное меню
                h(AnimatePresence, null,
                    isMenuOpen && h(CustomMenu, { 
                        onClose: () => setIsMenuOpen(false), 
                        onShare: handleShare, 
                        onReport: handleReport,
                        top: controlMode === 'swipes' ? '70px' : '60px'
                    })
                ),
                
                h(motion.div, {
                    className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
                    onScroll: handleScroll,
                    onPointerDown: handleContentTouch,
                    style: {
                        position: 'relative', width: '100%', maxHeight: '70vh',
                        borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: 'none', overflow: 'auto',
                        padding: controlMode === 'swipes' ? '12px 16px 80px 16px' : '0 16px 80px 16px',
                        willChange: 'transform', transform: 'translateZ(0)', backfaceVisibility: 'hidden'
                    },
                    onClick: (e) => { 
                        e.stopPropagation();
                        setIsMenuOpen(false);
                    }
                },
                    // Шапка профиля (зона свайпа)
                    h('div', { 
                        onPointerDown: (e) => {
                            handleContentTouch();
                            if (controlMode === 'swipes') dragControls.start(e);
                        },
                        style: { 
                            marginTop: '32px', 
                            paddingBottom: '20px',
                            cursor: controlMode === 'swipes' ? 'grab' : 'default',
                            userSelect: 'none',
                            touchAction: 'none'
                        } 
                    },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' } },
                            h(motion.div, { 
                                style: { height: 64, width: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--main-bg-color)', flexShrink: 0 } 
                            },
                                h('img', { src: avatar, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })
                            ),
                            h('div', { style: { minWidth: 0, flex: 1 } },
                                h(motion.div, { style: { fontSize: 20, fontWeight: 700, marginBottom: 4 } }, user.first_name || 'User'),
                                h('div', { style: { opacity: 0.7, fontSize: 14 } }, user.bio || t('bio_placeholder'))
                            )
                        )
                    ),
                    
                    skills.length > 0 && h('div', { className: 'profile-section', style: { display: 'block', marginTop: '5px' } },
                        h('h3', { className: 'profile-section-title' }, t('skills')),
                        h('div', { className: 'skills-container', style: { display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: 'none', marginTop: 0, justifyContent: 'center' } },
                            ...skills.map(s => h('span', { key: s, className: 'skill-tag skill-tag--display' }, s))
                        )
                    ),
                    
                    experience.length > 0 && h(SectionBlock, { 
                        title: t('experience'), items: experience, 
                        renderItem: (exp, isLast) => h('div', { className: 'profile-item', key: exp.id || Math.random(), style: { paddingBottom: 15, marginBottom: 15 } },
                            h('p', { className: 'item-title' }, exp.job_title || '—'), 
                            h('p', { className: 'item-subtitle' }, exp.company || ''),
                            h('p', { className: 'item-period' }, [exp.start_date, exp.is_current == 1 ? t('present_time') : exp.end_date].filter(Boolean).join(' — ')),
                            exp.description && h('p', { className: 'item-description' }, exp.description)
                        )
                    }),
                    
                    education.length > 0 && h(SectionBlock, { 
                        title: t('education'), items: education, 
                        renderItem: (edu, isLast) => h('div', { className: 'profile-item', key: edu.id || Math.random(), style: { paddingBottom: 15, marginBottom: 15 } },
                            h('p', { className: 'item-title' }, edu.institution || '—'), 
                            h('p', { className: 'item-subtitle' }, [edu.degree, edu.field_of_study].filter(Boolean).join(', ')),
                            h('p', { className: 'item-period' }, [edu.start_date, edu.end_date].filter(Boolean).join(' — '))
                        )
                    }),
                    
                    links.length > 0 && h(LinksCard, { links })
                )
            )
        ),
        
        shouldShowFAB && createPortal(
            h(motion.div, {
                initial: { opacity: 0, scale: 0.8 },
                animate: { opacity: 1, scale: 1 },
                // FAB тоже убираем быстро
                exit: { opacity: 0, scale: 0.8, pointerEvents: 'none', transition: { duration: 0.15 } },
                transition: { type: 'spring', stiffness: 400, damping: 30 }
            }, h(FABContainer, { user })),
            document.body
        )
    );
}

// ... (Вспомогательные функции CustomMenu, SectionBlock, LinksCard, FABContainer оставляем) ...
function CustomMenu({ onClose, onShare, onReport, top }) {
    return h(React.Fragment, null,
        h('div', { onClick: (e) => { e.stopPropagation(); onClose(); }, style: { position: 'fixed', inset: 0, zIndex: 199 } }),
        h(motion.div, {
            initial: { opacity: 0, scale: 0.9, y: -10 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.9, y: -10 },
            transition: { duration: 0.15 },
            style: {
                position: 'absolute', top: top, left: '16px', width: '200px',
                background: 'var(--main-bg-color)', borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 200, overflow: 'hidden',
                border: '1px solid var(--secondary-bg-color)', display: 'flex', flexDirection: 'column'
            }
        },
            h('button', { onClick: (e) => { e.stopPropagation(); onShare(); }, className: 'post-context-menu-button', style: { borderRadius: 0 } }, `🔗 ${t('action_share_profile')}`),
            h('button', { onClick: (e) => { e.stopPropagation(); onReport(); }, className: 'post-context-menu-button destructive', style: { borderRadius: 0, borderTop: '1px solid var(--secondary-bg-color)' } }, `🚩 ${t('action_report')}`)
        )
    );
}

function SectionBlock({title, items, renderItem}) {
    return h('div', { className: 'profile-section', style: { display: 'block', marginTop: '15px', borderTop: 'none' } }, 
        h('h3', { className: 'profile-section-title' }, title), 
        h('div', { style: { display: 'grid', gap: 0 } }, ...items.map((item, index) => renderItem(item, index === items.length - 1)))
    );
}

function LinksCard({links}) {
    return h('div', { className: 'profile-section', style: { display: 'block', marginTop: '15px', borderTop: 'none' } }, 
        h('div', { style: { display: 'grid', gap: 10, width: '100%' } }, 
            ...links.map((link, i) => h('a', { key: i, href: link, target: '_blank', rel: 'noopener noreferrer', className: 'profile-link-button' }, 
                h('span', { className: 'link-icon' }, '🔗'), h('span', { className: 'link-text' }, link)
            ))
        )
    );
}

function FABContainer({user}) {
    const [isFollowed, setIsFollowed] = useState(user.is_followed_by_viewer || false);
    useEffect(() => { setIsFollowed(user.is_followed_by_viewer || false); }, [user.is_followed_by_viewer]);
    
    const handleContact = useCallback(async () => {
        if (!tg || !window.__CONFIG) return;
        try {
            const resp = await postJSON(`${window.__CONFIG.backendUrl}/get-telegram-user-info`, { initData: tg.initData, target_user_id: user.user_id });
            if (resp.ok && resp.username) { tg.openTelegramLink(`https://t.me/${resp.username}`); } 
            else { tg.showAlert(t('error_open_profile_username')); }
        } catch(e) { if(tg) tg.showAlert(t('error_fetch_user_info')); }
    }, [user.user_id]);
    
    const handleFollow = useCallback(async () => {
        if (!tg || !window.__CONFIG) return;
        const newState = !isFollowed;
        setIsFollowed(newState);
        try {
            const endpoint = newState ? '/follow' : '/unfollow';
            const resp = await postJSON(`${window.__CONFIG.backendUrl}${endpoint}`, { initData: tg.initData, target_user_id: user.user_id });
            if (!resp.ok) { setIsFollowed(!newState); tg.showAlert(t('error_generic_action')); } 
            else if (tg?.HapticFeedback?.impactOccurred) { tg.HapticFeedback.impactOccurred('light'); }
        } catch(e) { setIsFollowed(!newState); if(tg) tg.showAlert(t('error_fetch_user_info')); }
    }, [isFollowed, user.user_id]);
    
    return h('div', { className: 'fab-container', style: { bottom: `calc(30px + env(safe-area-inset-bottom, 0px))` } },
        h('button', { onClick: handleContact, title: t('contact_user'), className: 'fab-button fab-secondary' }, 
            h('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" }))
        ),
        h('button', { onClick: handleFollow, title: isFollowed ? t('unfollow_button') : t('follow_button'), className: `fab-button fab-primary ${isFollowed ? 'is-unfollow' : ''}` }, 
            isFollowed 
                ? h('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('polyline', { points: "20 6 9 17 4 12" }))
                : h('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('line', { x1: "12", y1: "5", x2: "12", y2: "19" }), h('line', { x1: "5", y1: "12", x2: "19", y2: "12" }))
        )
    );
}

export default ProfileSheet;