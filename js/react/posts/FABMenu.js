// react/posts/FABMenu.js
import React, { useState, useCallback, useEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion, AnimatePresence } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';
import { t } from './posts_utils.js';

const h = React.createElement;
const tg = window.Telegram?.WebApp;

function FABMenu({ onCreatePost, onMyPosts, onSaved, onSubscriptions }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > window.innerHeight * 1.5) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleMenu = useCallback(() => {
        if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('medium');
        setIsOpen(prev => !prev);
    }, []);
    
    const handleAction = useCallback((action) => {
        setIsOpen(false);
        if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred('light');
        action();
    }, []);
    
    const menuItems = [
        { icon: '➕', label: t('fab_create_request'), action: onCreatePost, color: '#007AFF' },
        { icon: '📝', label: t('fab_my_requests'), action: onMyPosts, color: '#34C759' },
        { icon: '🔖', label: t('fab_saved'), action: onSaved, color: '#FF9500' },
        { icon: '❤️', label: t('fab_subscriptions'), action: onSubscriptions, color: '#FF3B30' }
    ];
    
    return h('div', {
        style: {
            position: 'fixed',
            bottom: 0,
            right: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 999
        }
    },
        h(AnimatePresence, null,
            isOpen && h(motion.div, {
                key: 'backdrop',
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                transition: { duration: 0.2 },
                onClick: toggleMenu,
                style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }
            })
        ),
        
        h('div', {
            style: {
                position: 'relative',
                padding: '0 20px 30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12,
                pointerEvents: 'auto'
            }
        },
            // --- КНОПКА НАВЕРХ (ОБНОВЛЕННАЯ) ---
            h(AnimatePresence, null,
                showScrollTop && !isOpen && h(motion.button, {
                    key: 'scroll-top',
                    initial: { opacity: 0, scale: 0.5, y: 20 },
                    animate: { opacity: 1, scale: 1, y: 0 },
                    exit: { opacity: 0, scale: 0.5, y: 20 },
                    whileTap: { scale: 0.9 },
                    onClick: scrollToTop,
                    style: {
                        // 🔥 1-в-1 как главная кнопка
                        width: 56, 
                        height: 56,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--secondary-bg-color, #efefef)',
                        color: 'var(--main-text-color, #000)',
                        // Тень такая же
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginBottom: 0, 
                        // Размер иконки чуть больше, чтобы соответствовать
                        fontSize: '24px', 
                        zIndex: 998
                    }
                }, 
                // SVG стрелка вместо текстовой стрелки для красоты
                h('svg', { 
                    viewBox: "0 0 24 24", 
                    width: "24", 
                    height: "24", 
                    stroke: "currentColor", 
                    strokeWidth: "2.5", 
                    fill: "none", 
                    strokeLinecap: "round", 
                    strokeLinejoin: "round" 
                }, h('line', { x1: "12", y1: "19", x2: "12", y2: "5" }), h('polyline', { points: "5 12 12 5 19 12" }))
                )
            ),

            h(AnimatePresence, null,
                isOpen && menuItems.map((item, index) => 
                    h(motion.div, {
                        key: item.label,
                        initial: { opacity: 0, y: 20, scale: 0.8 },
                        animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25, delay: index * 0.05 } },
                        exit: { opacity: 0, y: 10, scale: 0.8, transition: { duration: 0.15, delay: (menuItems.length - index - 1) * 0.03 } },
                        style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%' }
                    },
                        h(motion.div, {
                            initial: { opacity: 0, x: 20 },
                            animate: { opacity: 1, x: 0, transition: { delay: index * 0.05 + 0.1 } },
                            exit: { opacity: 0, x: 10 },
                            style: { flex: 1, textAlign: 'right', paddingRight: 8 }
                        }, h('div', { style: { display: 'inline-block', background: 'var(--secondary-bg-color, #2c2c2e)', color: 'var(--main-text-color, #fff)', padding: '10px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }, item.label)),
                        h(motion.button, {
                            onClick: () => handleAction(item.action),
                            whileHover: { scale: 1.05 },
                            whileTap: { scale: 0.95 },
                            style: { width: 56, height: 56, borderRadius: '50%', border: 'none', background: item.color, color: '#FFFFFF', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0 }
                        }, item.icon)
                    )
                )
            ),
            
            h(motion.button, {
                onClick: toggleMenu,
                animate: { rotate: isOpen ? 45 : 0, scale: isOpen ? 1.1 : 1 },
                transition: { type: 'spring', stiffness: 300, damping: 20 },
                whileTap: { scale: 0.9 },
                style: {
                    width: 56, height: 56, borderRadius: '50%', border: 'none',
                    background: 'var(--main-button-color, #007AFF)',
                    color: 'var(--main-button-text-color, #fff)',
                    fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }
            }, '➕')
        )
    );
}

export default FABMenu;