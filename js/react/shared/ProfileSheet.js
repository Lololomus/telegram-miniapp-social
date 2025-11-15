// react/shared/ProfileSheet.js
//
// ОБЩИЙ КОМПОНЕНТ "шторки" профиля.
// (Перенесен из /js/react-shared.js)
// Теперь импортирует утилиты из ./utils.js

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm';
import { createPortal } from 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm';
import { motion } from 'https://cdn.jsdelivr.net/npm/framer-motion@10.16.5/+esm';

// --- ИМПОРТ ОБЩИХ УТИЛИТ ---
import { tg, isIOS, t, postJSON } from '../shared/react_shared_utils.js';

const h = React.createElement;

// --- КОМПОНЕНТ ProfileSheet и его хелперы ---

export function ProfileSheet({user, onClose}) {
  const avatar = user.photo_path ? `${window.__CONFIG?.backendUrl || location.origin}/${user.photo_path}` : 'https://t.me/i/userpic/320/null.jpg';
  // Парсим данные, проверяя тип (может быть строка JSON или уже объект/массив)
  const skills = (()=> { try { return user.skills ? (typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills) : []; } catch { return []; } })();
  const experience = (()=> { try { return user.experience ? (typeof user.experience === 'string' ? JSON.parse(user.experience) : user.experience) : []; } catch { return []; } })();
  const education = (()=> { try { return user.education ? (typeof user.education === 'string' ? JSON.parse(user.education) : user.education) : []; } catch { return []; } })();
  const links = [user.link1, user.link2, user.link3, user.link4, user.link5].filter(Boolean);

  const userIdForLayout = user.user_id || `temp-${Math.random()}`; // Убедимся, что ID есть

  return h(motion.div,{ 
    style:{ 
        position:'fixed', 
        inset:0, 
        zIndex:1000,
        display: 'flex',
        alignItems: 'flex-end'
    }, 
    initial:{opacity:0}, 
    animate:{opacity:1}, 
    exit:{opacity:0} 
  },
    // backdrop
    h(motion.div,{ 
        onClick:onClose, 
        style:{position:'absolute', inset:0, background:'rgba(0,0,0,.5)'}, 
        initial:{opacity:0}, 
        animate:{opacity:1}, 
        exit:{opacity:0},
        transition: { duration: 0.15, ease: 'easeOut' }
    }),
    
    // Внешняя обертка для анимации и шеврона
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
        // "Шеврон" (ручка)
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
            
        // sheet (контент)
        h(motion.div,{
          className: `react-sheet-content ${isIOS ? 'is-ios' : ''}`,
          style:{ 
            position:'relative', 
            width:'100%', 
            maxHeight: '85vh',
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            borderTop:'none', 
            overflow:'auto', 
            padding:'0 16px 80px 16px' 
          },
        },
          // Кнопка "..." (действия)
          h('button',{ 
              onClick:(e)=>{e.stopPropagation(); if(tg) tg.showAlert('Меню в разработке');}, 
              className: `react-sheet-actions-button ${isIOS ? 'is-ios' : ''}`,
              'aria-label': 'Действия',
          }, '⋯'),
    
    
          // Шапка
          h('div',{style:{padding:'20px 0', borderBottom:'1px solid var(--main-bg-color)'}},
            h('div',{style:{display:'flex',alignItems:'center',gap:12}},
              h(motion.div,{ layoutId:`avatar-${userIdForLayout}`, style:{height:64, width:64, borderRadius:'50%', overflow:'hidden', background:'var(--main-bg-color)', flexShrink:0} },
                 h('img',{src:avatar, alt:'', style:{width:'100%', height:'100%', objectFit:'cover'}})
              ),
              h('div',{style:{minWidth:0, flex:1}},
                h(motion.div,{ layoutId:`name-${userIdForLayout}`, style:{fontSize:20, fontWeight:700, marginBottom:4} }, user.first_name || 'User'),
                h('div',{style:{opacity:.7, fontSize:14}}, user.bio || 'Нет описания')
              ),
            )
          ),
          // Навыки
          skills.length > 0 && h('div',{ className: 'profile-section', style:{ display: 'block', marginTop: '15px' } },
            h('h3',{className: 'profile-section-title'}, t('skills')),
            h('div',{ className: 'skills-container', style:{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: 'none', marginTop: 0, justifyContent: 'center' } },
              ...skills.map(s=>h('span',{ key:s, className: 'skill-tag skill-tag--display' }, s))
            )
          ),
          // Опыт работы
          experience.length > 0 && h(SectionBlock,{ title:t('experience'), items:experience, renderItem:(exp, isLast)=>h('div', { className: 'profile-item', key:exp.id || Math.random(), style: { borderBottom: isLast ? 'none' : null, paddingBottom: isLast ? 0 : null, marginBottom: isLast ? 0 : null } },
              h('p',{className: 'item-title'}, exp.job_title || '—'), h('p',{className: 'item-subtitle'}, exp.company || ''),
              h('p',{className: 'item-period'}, [exp.start_date, exp.is_current == 1 ? t('present_time') : exp.end_date].filter(Boolean).join(' — ')),
              exp.description && h('p',{className: 'item-description'}, exp.description)
            )
          }),
          // Образование
          education.length > 0 && h(SectionBlock,{ title:t('education'), items:education, renderItem:(edu, isLast)=>h('div', { className: 'profile-item', key:edu.id || Math.random(), style: { borderBottom: isLast ? 'none' : null, paddingBottom: isLast ? 0 : null, marginBottom: isLast ? 0 : null } },
              h('p',{className: 'item-title'}, edu.institution || '—'), h('p',{className: 'item-subtitle'}, [edu.degree, edu.field_of_study].filter(Boolean).join(', ')),
              h('p',{className: 'item-period'}, [edu.start_date, edu.end_date].filter(Boolean).join(' — '))
            )
          }),
          // Ссылки
          links.length > 0 && h(LinksCard, {links}),
          
        ), // <-- Конец .react-sheet-content
        
        // FAB-контейнер
        window.__CURRENT_USER_ID && window.__CURRENT_USER_ID !== user.user_id && h(FABContainer, {user})
        
    ) // <-- Конец внешней motion.div (анимации)
  );
}

// Вспомогательный компонент для секций Опыта/Образования
function SectionBlock({title, items, renderItem}) {
  return h('div', { className: 'profile-section', style:{ display: 'block', marginTop: '15px' } },
    h('h3',{className: 'profile-section-title'}, title),
    h('div',{style:{display:'grid', gap:0}}, ...items.map((item, index) => renderItem(item, index === items.length - 1)))
  );
}

// Вспомогательный компонент для Ссылок
function LinksCard({links}) {
  return h('div',{ className: 'profile-section', style:{ display: 'block', marginTop: '15px' } },
    h('div', {style:{display:'grid', gap:10, width: '100%'}},
      ...links.map((link,i)=>h('a',{ 
        key:i, 
        href:link, 
        target:'_blank', 
        rel:'noopener noreferrer', 
        className: 'profile-link-button'
      }, 
        h('span',{className: 'link-icon'}, '🔗'), h('span', {className: 'link-text'}, link)
      ))
    )
  );
}

// Вспомогательный компонент FAB для чужого профиля
function FABContainer({user}) {
  const [isFollowed, setIsFollowed] = useState(user.is_followed_by_viewer || false);
  // Обработчик "Написать"
  const handleContact = useCallback(async () => {
    if (!tg || !window.__CONFIG) return;
    console.log("FAB: Contact clicked for", user.user_id);
    try {
      const resp = await postJSON(`${window.__CONFIG.backendUrl}/get-telegram-user-info`, { initData: tg.initData, target_user_id: user.user_id });
      console.log("FAB: Contact response:", resp);
      if (resp.ok && resp.username) {
        tg.openTelegramLink(`https://t.me/${resp.username}`);
      } else {
        tg.showAlert('Не удалось открыть профиль пользователя (возможно, у него нет @username)');
      }
    } catch(e) {
      console.error("FAB: Contact error:", e);
      if(tg) tg.showAlert('Ошибка связи с сервером при получении @username');
    }
  }, [user.user_id]);

  // Обработчик "Подписаться/Отписаться"
  const handleFollow = useCallback(async () => {
    if (!tg || !window.__CONFIG) return;
    const newState = !isFollowed;
    console.log(`FAB: ${newState ? 'Follow' : 'Unfollow'} clicked for`, user.user_id);
    setIsFollowed(newState); // Оптимистичное обновление UI
    try {
      const endpoint = newState ? '/follow' : '/unfollow';
      const resp = await postJSON(`${window.__CONFIG.backendUrl}${endpoint}`, { initData: tg.initData, target_user_id: user.user_id });
      console.log(`FAB: ${newState ? 'Follow' : 'Unfollow'} response:`, resp);
      if (!resp.ok) { // Если сервер вернул ошибку, откатываем UI
          setIsFollowed(!newState);
          tg.showAlert('Не удалось выполнить действие');
      } else if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred('light');
      }
    } catch(e) {
      console.error(`FAB: ${newState ? 'Follow' : 'Unfollow'} error:`, e);
      setIsFollowed(!newState); // Откатываем UI при ошибке сети
      if(tg) tg.showAlert('Ошибка связи с сервером при подписке/отписке');
    }
  }, [isFollowed, user.user_id]);

  return h('div',{className: 'fab-container' },
    h('button',{ onClick:handleContact, title:'Написать', className: 'fab-button fab-secondary' }, '💬'),
    h('button',{
        onClick:handleFollow, title: isFollowed ? 'Отписаться' : 'Подписаться',
        className: `fab-button fab-primary ${isFollowed ? 'is-unfollow' : ''}`
      }, isFollowed ? '✓' : '+'
    )
  );
}

// Экспортируем ProfileSheet по умолчанию (для React.lazy)
export default ProfileSheet;