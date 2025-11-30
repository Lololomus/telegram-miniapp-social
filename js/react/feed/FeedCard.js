// react/feed/FeedCard.js
// ОБНОВЛЕНО: Добавлен статус (Badge) в карточку ленты

import React, { memo, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { 
    t, isIOS, isMobile, cardVariants, FEED_ITEM_SPRING,
    useTwoLineSkillsOverflow, useCardGestures 
} from './feed_utils.js';

const h = React.createElement;

// Конфиг статусов (дублируем для скорости, либо выносим в utils)
const STATUS_CONFIG = {
    'networking':   { icon: '🤝', colorClass: 'networking' },
    'open_to_work': { icon: '⚡', colorClass: 'open_to_work' },
    'hiring':       { icon: '💎', colorClass: 'hiring' },
    'open_to_gigs': { icon: '🚀', colorClass: 'open_to_gigs' },
    'busy':         { icon: '⛔', colorClass: 'busy' }
};

const FeedCard = memo(function FeedCard({ u, index, onOpen }) {
    
    const job = u.job_title && u.company ? `${u.job_title} в ${u.company}` :
        u.job_title || u.company || t('job_not_specified');
    
    const skills = (() => {
        try { return u.skills ? JSON.parse(u.skills) : []; }
        catch { return []; }
    })();
    
    const skillsContainerRef = useRef(null);
    const skillsOverflow = useTwoLineSkillsOverflow(skillsContainerRef, skills.length);
    const avatar = u.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${u.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';

    // Получаем конфиг статуса
    const statusConf = STATUS_CONFIG[u.status] || null;

    // --- ЖЕСТЫ ---
    const { targetRef, gestureProps } = useCardGestures({
        onOpenPrimary: () => onOpen(u),
        disableClick: false
    });

    // --- АНИМАЦИЯ ---
    const isFirstBatch = index < 10;
    const shouldForceAnimate = isMobile || isFirstBatch;
    
    const variants = isMobile 
      ? {} 
      : (isIOS 
          ? cardVariants 
          : {
              hidden: { opacity: 0, x: -20 }, 
              visible: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: -10 }
          }
      );

    const delayStep = 0.05; 
    const delay = (!isMobile && isFirstBatch) ? index * delayStep : 0;

    const fixedTransition = {
        ...FEED_ITEM_SPRING, 
        delay: delay,        
        x: { ...FEED_ITEM_SPRING, delay: delay },
        opacity: { duration: 0.2, delay: delay },
        scale: { ...FEED_ITEM_SPRING, delay: delay }
    };

    const visibleState = { opacity: 1, x: 0, scale: 1 };

    return h(motion.div, {
        ref: targetRef,
        ...gestureProps,
        layout: isMobile ? false : "position",
        variants: variants,
        initial: isMobile ? "visible" : "hidden",
        animate: shouldForceAnimate ? visibleState : undefined,
        whileInView: shouldForceAnimate ? undefined : visibleState,
        viewport: shouldForceAnimate ? undefined : { once: true, margin: "200px" },
        exit: "exit",
        transition: isMobile ? { duration: 0 } : fixedTransition,
        className: 'react-feed-card-wrapper', 
        style: {
            width: '100%', position: 'relative', cursor: 'pointer',
        }
    },
        h(motion.div, {
            className: 'react-feed-card', 
            style: {
                width: '100%', textAlign: 'left', borderRadius: 24, padding: 15,
                display: 'flex', flexDirection: 'column', gap: '12px'
            }
        },
            // Хедер: Аватар + Имя + СТАТУС
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' } },
                h('div', {
                    style: {
                        height: 48, width: 48, borderRadius: 16, // Чуть больше и квадратнее
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden', flexShrink: 0
                    }
                }, h('img', {
                    src: avatar, alt: '', decoding: 'async', draggable: 'false',
                    style: { width: '100%', height: '100%', objectFit: 'cover' }
                })),
                
                h('div', { style: { minWidth: 0, flex: 1 } },
                    h('div', {
                        style: {
                            fontWeight: 700, fontSize: 17, color: '#ffffff',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }
                    }, u.first_name || 'User'),
                    
                    h('div', {
                        style: {
                            marginTop: 2,
                            opacity: 0.7, fontSize: 13, color: '#9ca3af',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }
                    }, job)
                ),

                // 🔥 СТАТУС (Бейдж справа)
                statusConf && h('div', {
                    className: `feed-status-badge ${statusConf.colorClass}`,
                }, statusConf.icon)
            ),
            
            // Навыки
            skills.length > 0 && h('div', {
                layout: false,
                ref: skillsContainerRef,
                className: 'feed-card-skills-container',
                style: { pointerEvents: 'none' }
            },
                ...skills.slice(0, skillsOverflow.visibleCount).map((skill, i) =>
                    h('span', { key: skill + i, className: 'skill-tag skill-tag--display' }, skill)
                ),
                skillsOverflow.hiddenCount > 0 && h('span', {
                    className: 'feed-card-skills-more',
                    style: { fontSize: 12, color: '#9ca3af', alignSelf: 'center', marginLeft: 4 }
                }, `+${skillsOverflow.hiddenCount}`)
            )
        )
    );
});

export default FeedCard;