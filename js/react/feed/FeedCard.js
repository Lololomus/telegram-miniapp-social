// react/feed/FeedCard.js
// Компонент отображения одной карточки человека (с логикой +X).
//
// ФИНАЛЬНАЯ ВЕРСИЯ:
// 1. motion.button -> motion.div (Устраняет Конфликт №1)
// 2. Добавлена onPointer... логика для клика (как в PostCard)
// 3. Добавлена ПОЛНАЯ motion-логика из PostCard.js ("Система Б")
// 4. layout: "position" добавлен на ребенка (как в PostCard)

import React, { memo, useRef, useEffect, useState } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// Локальные импорты
import { t, isIOS, cardVariants, tg, buildFeedItemTransition } from './feed_utils.js';

const h = React.createElement;

const FeedCard = memo(function FeedCard({u, index, onOpen}) {
  const job = u.job_title && u.company ? `${u.job_title} в ${u.company}` :
             u.job_title || u.company || t('job_not_specified');
  const skills = (()=> { try { return u.skills ? JSON.parse(u.skills) : []; } catch { return []; } })();
  const avatar = u.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${u.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';

  // --- Логика для "+X" (скрытые теги) ---
  const skillsContainerRef = useRef(null);
  const [hiddenSkillsCount, setHiddenSkillsCount] = useState(0);

  useEffect(() => {
    let timeoutId;
    const debounceMeasure = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(measureSkills, 50);
    };
    const measureSkills = () => {
      if (skillsContainerRef.current && skills.length > 0) {
        const container = skillsContainerRef.current;
        const tags = Array.from(container.children).filter(
          (child) => child.tagName === 'SPAN' && !child.classList.contains('feed-card-skills-more')
        );
        if (tags.length <= 1) {
          setHiddenSkillsCount(0);
          return;
        }
        const firstTagOffsetTop = tags[0].offsetTop;
        let countOnFirstLine = 0;
        for (let i = 0; i < tags.length; i++) {
          if (tags[i].offsetTop > firstTagOffsetTop + 5) {
            break;
          }
          countOnFirstLine++;
        }
        const hiddenCount = skills.length - countOnFirstLine;
        setHiddenSkillsCount(hiddenCount > 0 ? hiddenCount : 0);
      } else {
        setHiddenSkillsCount(0);
      }
    };
    const initialMeasureTimeoutId = setTimeout(measureSkills, 100);
    window.addEventListener('resize', debounceMeasure);
    return () => {
        clearTimeout(initialMeasureTimeoutId);
        clearTimeout(timeoutId);
        window.removeEventListener('resize', debounceMeasure);
    };
  }, [skills]);
  // --- Конец логики "+X" ---

  // --- Логика клика (скопирована из PostCard.js, но без long-press) ---
  const gestureTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const cardRef = useRef(null);
  const POINTER_SLOP = 5;

  const handlePointerDown = (e) => {
    pointerStartRef.current = { y: e.pageY };
    if (tg?.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
    }
    if (gestureTimerRef.current) {
        clearTimeout(gestureTimerRef.current);
    }
  };

  const handlePointerMove = (e) => {
    if (!pointerStartRef.current) return;
    const deltaY = Math.abs(e.pageY - pointerStartRef.current.y);
    if (deltaY > POINTER_SLOP) {
        clearTimeout(gestureTimerRef.current);
        pointerStartRef.current = null;
        if (tg?.enableVerticalSwipes) {
            tg.enableVerticalSwipes();
        }
    }
  };

  const handlePointerUp = (e) => {
    if (tg?.enableVerticalSwipes) {
        tg.enableVerticalSwipes();
    }
    clearTimeout(gestureTimerRef.current);
    // Если pointerStartRef не сброшен (т.е. это НЕ скролл), это Tap!
    if (pointerStartRef.current) {
        onOpen(u);
    }
    pointerStartRef.current = null;
  };
  // --- Конец логики клика ---

  // --- Логика "Системы Б" (теперь через shared helper) ---
  const transitionConfig = buildFeedItemTransition(index);

  return h(motion.div, { // <-- ИЗМЕНЕНИЕ: 'motion.div'
    ref: cardRef,
    
    // Включаем 'layout' на ребенке (как в PostCard.js)
    layout: isIOS ? false : "position",
    
    variants: cardVariants,
    
    // --- Внедряем "Систему Б" ---
    initial: "hidden",
    exit: "exit",
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        y: 0
    },
    transition: transitionConfig, // <-- Применяем ручную задержку

    // --- Новые обработчики ---
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onContextMenu: (e) => e.preventDefault(),
    // --- Конец ---

    className: 'react-feed-card',
    style: {
      width: '100%', 
      textAlign: 'left', 
      borderRadius: 12,
      padding: 12,
      cursor: 'pointer'
      // 'marginBottom' теперь берется из gap: 12px в FeedList.js
    }
  },
    // Делаем дочерние элементы "прозрачными" для клика
    h('div', {style: {display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none'}},
      h('div', {
        style: {height: 44, width: 44, borderRadius: '50%', background: 'var(--secondary-bg-color)', overflow: 'hidden', flexShrink: 0}
      }, h('img', {
          src: avatar, 
          alt: '', 
          loading: 'lazy',
          style: {width: '100%', height: '100%', objectFit: 'cover'}
        })
      ),
      h('div', {style: {minWidth: 0}},
        h('div', {
          style: {fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'}
        }, u.first_name || 'User'),
        h('div', {
          style: {opacity: .8, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--main-text-color, var(--tg-theme-text-color, #000000))'}
        }, job)
      ),
    ),

    skills && skills.length > 0 && h('div', {
      ref: skillsContainerRef,
      className: 'feed-card-skills-container',
      style: { pointerEvents: 'none' } // <-- Отключаем клики
    },
      ...skills.map(s => h('span', { key: s, className: 'skill-tag skill-tag--display' }, s)),
      hiddenSkillsCount > 0 && h('span', {
        className: 'feed-card-skills-more'
      }, `+${hiddenSkillsCount}`)
    )
  );
});

export default FeedCard;