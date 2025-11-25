// react/feed/FeedCard.js
import React, { memo, useRef } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { 
    t, isIOS, isMobile, cardVariants, FEED_ITEM_SPRING,
    useTwoLineSkillsOverflow, useCardGestures 
} from './feed_utils.js';

const h = React.createElement;

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

    // --- ЖЕСТЫ ---
    const { targetRef, gestureProps } = useCardGestures({
        onOpenPrimary: () => onOpen(u),
        disableClick: false
    });

    // --- АНИМАЦИЯ (ТОЧНАЯ КОПИЯ ЛОГИКИ ПОСТОВ) ---
    const isFirstBatch = index < 10;
    const shouldForceAnimate = isMobile || isFirstBatch;
    
    // Варианты (ПК - сдвиг, Мобайл - нет)
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

    // Задержка для волны
    const delayStep = 0.05; 
    const delay = (!isMobile && isFirstBatch) ? index * delayStep : 0;

    // Конфиг перехода
    const fixedTransition = {
        ...FEED_ITEM_SPRING, 
        delay: delay,        
        x: { ...FEED_ITEM_SPRING, delay: delay },
        opacity: { duration: 0.2, delay: delay },
        scale: { ...FEED_ITEM_SPRING, delay: delay }
    };

    const visibleState = { opacity: 1, x: 0, scale: 1 };

    // --- РЕНДЕР: СТРУКТУРА WRAPPER -> CONTENT ---
    return h(motion.div, {
        ref: targetRef,
        ...gestureProps, // Жесты вешаем на обертку
        
        // 1. ВНЕШНИЙ СЛОЙ: Отвечает за появление и layout
        layout: isMobile ? false : "position",
        variants: variants,
        
        initial: isMobile ? "visible" : "hidden",
        animate: shouldForceAnimate ? visibleState : undefined,
        whileInView: shouldForceAnimate ? undefined : visibleState,
        viewport: shouldForceAnimate ? undefined : { once: true, margin: "200px" },
        exit: "exit",
        
        transition: isMobile ? { duration: 0 } : fixedTransition,
        
        // КЛАСС ОБЕРТКИ (Важно: он должен быть прозрачным и без transition: transform)
        className: 'react-feed-card-wrapper', 
        style: {
            width: '100%',
            position: 'relative',
            cursor: 'pointer',
            // Убираем стили фона отсюда
        }
    },
        // 2. ВНУТРЕННИЙ СЛОЙ: Отвечает за визуал (Glass) и CSS-анимацию нажатия
        h(motion.div, {
            className: 'react-feed-card', // Сюда применяются стили из feed.css
            style: {
                width: '100%',
                textAlign: 'left',
                borderRadius: 24,
                padding: 15,
                // position: 'relative' и overflow: 'hidden' уже есть в CSS класса
            }
        },
            // Хедер: Аватар + Имя
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' } },
                h('div', {
                    style: {
                        height: 44, width: 44, borderRadius: 14,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden', flexShrink: 0
                    }
                }, h('img', {
                    src: avatar, alt: '', 
                    decoding: 'async', // Важно для производительности
                    draggable: 'false',
                    style: { width: '100%', height: '100%', objectFit: 'cover' }
                })),
                
                h('div', { style: { minWidth: 0 } },
                    h('div', {
                        style: {
                            fontWeight: 700, fontSize: 16, color: '#ffffff',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }
                    }, u.first_name || 'User'),
                    
                    h('div', {
                        style: {
                            opacity: 0.7, fontSize: 13, color: '#9ca3af',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }
                    }, job)
                )
            ),
            
            // Навыки
            skills.length > 0 && h('div', {
                layout: false,
                ref: skillsContainerRef,
                className: 'feed-card-skills-container',
                style: { pointerEvents: 'none', marginTop: 12 }
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