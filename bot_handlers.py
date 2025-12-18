import sqlite3
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv
import asyncio
import threading
import json
from datetime import datetime
import requests

load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')
BOT_USERNAME = os.getenv('BOT_USERNAME')
BACKEND_URL = os.getenv('BACKEND_URL')
DB_NAME = os.getenv('DB_NAME', 'database.db')
ADMIN_USER_IDS = [int(x.strip()) for x in os.getenv('ADMIN_USER_IDS', '').split(',') if x.strip()]

bot = None
dp = Dispatcher()

def init_bot():
    global bot
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN не найден!")
    bot = Bot(token=BOT_TOKEN)
    print(f"✅ Бот инициализирован: @{BOT_USERNAME}")
    return bot, dp

# ============ HELPERS ============

def get_db_connection():
    conn = sqlite3.connect(DB_NAME, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_profile(user_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"❌ Error in get_user_profile: {e}")
        return None

def get_user_name(user_id: int):
    profile = get_user_profile(user_id)
    return profile.get('first_name') if profile else "Пользователь"

def is_admin(user_id: int):
    return user_id in ADMIN_USER_IDS

# ============ COMMANDS ============

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username or "друг"
    args = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None
    
    # Deep link: профиль (формат: user123)
    if args and args.startswith('user'):
        try:
            target_id = int(args[4:])  # Пропустить "user", взять ID
            profile = get_user_profile(target_id)
            if profile:
                name = profile.get('first_name', 'Пользователь')
                bio = profile.get('bio', '')
                status = profile.get('status', 'networking')
                
                text = f"👤 {name}\n\n"
                text += f"🤝 {status}\n"
                if bio:
                    text += f"\n{bio[:200]}"
                
                kb = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="👤 Открыть профиль",
                        url=f"https://t.me/{BOT_USERNAME}/app?startapp=user{target_id}")
                ]])
                await message.answer(text, reply_markup=kb, parse_mode="HTML")
                return
        except Exception as e:
            print(f"❌ Error loading profile: {e}")
    
    # Deep link: пост (формат: p_456)
    elif args and args.startswith('p_'):
        try:
            post_id = int(args[2:])  # Пропустить "p_", взять ID
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.content, p.post_type, pr.first_name, pr.user_id
                FROM posts p JOIN profiles pr ON p.user_id = pr.user_id
                WHERE p.post_id = ?
            """, (post_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                content = row['content'][:250]
                text = f"📝 {row['post_type'].upper()}\n\n{content}\n\n👤 Автор: {row['first_name']}"
                
                kb = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="📄 Открыть пост",
                        url=f"https://t.me/{BOT_USERNAME}/app?startapp=p_{post_id}")
                ]])
                await message.answer(text, reply_markup=kb, parse_mode="HTML")
                return
        except Exception as e:
            print(f"❌ Error loading post: {e}")
    
    # Обычный /start без параметров
    text = f"""👋 Привет, {username}!

Я бот социальной платформы для нетворкинга.

🚀 Открой Mini App чтобы:
• Создать профиль с навыками
• Найти специалистов
• Получать уведомления

📱 Команды: /help"""
    
    from aiogram.types import WebAppInfo
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🚀 Открыть приложение",
            web_app=WebAppInfo(url=BACKEND_URL))
    ]])
    await message.answer(text, reply_markup=kb, parse_mode="HTML")

@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    text = """📋 Команды:

👤 /start - Главное меню
📊 /profile - Твой профиль
🔔 /notifications - Уведомления

💡 Основной функционал в Mini App"""
    
    if is_admin(message.from_user.id):
        text += "\n\n🔧 Админ:\n📊 /stats - Статистика"
    
    await message.answer(text, parse_mode="HTML")

@dp.message(Command("profile"))
async def cmd_profile(message: types.Message):
    profile = get_user_profile(message.from_user.id)
    
    if not profile:
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="✏️ Создать профиль",
                web_app=WebAppInfo(url=BACKEND_URL)
            )
        ]])
        await message.answer(
            "❌ Профиль не найден\n\nСоздай профиль в приложении!",
            reply_markup=kb
        )
        return

    name = profile.get('first_name', 'Пользователь')
    bio = profile.get('bio', '')
    status = profile.get('status', 'networking')
    
    text = f"""👤 <b>{name}</b>

🤝 Статус: {status}"""
    
    if bio:
        text += f"\n\n📝 {bio[:300]}"
    
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="📝 Редактировать",
            web_app=WebAppInfo(url=BACKEND_URL)
        )
    ]])
    await message.answer(text, reply_markup=kb, parse_mode="HTML")

@dp.message(Command("notifications"))
async def cmd_notifications(message: types.Message):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT type, message FROM notifications
            WHERE user_id = ? AND is_read = 0
            ORDER BY created_at DESC LIMIT 10
        """, (message.from_user.id,))
        notifs = cursor.fetchall()
        
        if notifs:
            cursor.execute(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
                (message.from_user.id,)
            )
            conn.commit()
        
        conn.close()
        
        if not notifs:
            await message.answer("🔔 Новых уведомлений нет")
            return
        
        text = "🔔 Уведомления:\n\n"
        for n in notifs:
            icon = {
                'follow': '👤',
                'response_request': '💬'
            }.get(n['type'], '🔔')
            text += f"{icon} {n['message']}\n\n"
        
        await message.answer(text, parse_mode="HTML")
        
    except Exception as e:
        print(f"❌ Error in notifications: {e}")
        await message.answer("⚠️ Ошибка загрузки уведомлений")

# ============ NOTIFICATIONS ============

def notify_new_follower(user_id: int, follower_id: int, follower_name: str):
    try:
        # 1. Сохраняем в БД
        conn = get_db_connection()
        cursor = conn.cursor()
        msg = f"{follower_name} подписался на тебя"
        cursor.execute("""
            INSERT INTO notifications (user_id, type, from_user_id, message)
            VALUES (?, 'follow', ?, ?)
        """, (user_id, follower_id, msg))
        conn.commit()
        conn.close()
        
        # 2. Отправляем через Telegram API напрямую (синхронно)
        def send_in_thread():
            try:
                import requests
                
                text = f"👤 {follower_name} подписался на тебя"
                
                # Формируем inline keyboard
                inline_keyboard = {
                    "inline_keyboard": [[{
                        "text": "👤 Открыть профиль",
                        "url": f"https://t.me/{BOT_USERNAME}/app?startapp=user{follower_id}"
                    }]]
                }
                
                # Отправляем через API
                url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
                payload = {
                    "chat_id": user_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "reply_markup": inline_keyboard
                }
                
                response = requests.post(url, json=payload, timeout=10)
                
                if not response.ok:
                    print(f"⚠️ Failed to send notification to {user_id}: {response.text}")
                    
            except Exception as e:
                print(f"⚠️ Failed to send notification to {user_id}: {e}")
        
        # Запускаем в отдельном потоке
        threading.Thread(target=send_in_thread, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error in notify_new_follower: {e}")

async def notify_followers_new_post(author_id: int, author_name: str, post_id: int, post_content: str):
    """Уведомить подписчиков о новом посте"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Найти всех подписчиков автора
        cursor.execute("""
            SELECT follower_id FROM follows 
            WHERE following_id = ?
        """, (author_id,))
        
        followers = cursor.fetchall()
        conn.close()
        
        if not followers:
            return
        
        # Текст уведомления
        preview = post_content[:50] + "..." if len(post_content) > 50 else post_content
        text = f"📝 <b>{author_name}</b> опубликовал пост:\n\n{preview}"
        
        # Deep link на пост
        keyboard = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="📖 Открыть пост",
                url=f"https://t.me/{os.getenv('BOT_USERNAME')}/{os.getenv('APP_SLUG')}?startapp=p_{post_id}"
            )
        ]])
        
        # Отправить всем подписчикам
        for (follower_id,) in followers:
            try:
                await bot.send_message(
                    chat_id=follower_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )
            except Exception as e:
                print(f"Failed to notify follower {follower_id}: {e}")
                
    except Exception as e:
        print(f"Error in notify_followers_new_post: {e}")


async def notify_skill_match(post_id: int, author_name: str, post_content: str, skill_tags: list):
    """Уведомить пользователей с подходящими скиллами (макс 5 в день)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Найти пользователей с подходящими скиллами
        skill_tags_lower = [s.lower() for s in skill_tags]
        
        cursor.execute("SELECT user_id, skills FROM profiles WHERE skills IS NOT NULL")
        all_profiles = cursor.fetchall()
        
        matched_users = []
        for user_id, skills_json in all_profiles:
            try:
                user_skills = json.loads(skills_json) if skills_json else []
                user_skills_lower = [s.lower() for s in user_skills]
                
                # Проверить есть ли пересечение
                if any(skill in user_skills_lower for skill in skill_tags_lower):
                    matched_users.append(user_id)
            except:
                continue
        
        if not matched_users:
            conn.close()
            return
        
        # Проверить лимит 5 постов в день
        today = datetime.now().date().isoformat()
        
        for user_id in matched_users:
            # Считаем сколько уведомлений сегодня
            cursor.execute("""
                SELECT COUNT(*) FROM notification_log 
                WHERE user_id = ? AND date = ? AND type = 'skill_match'
            """, (user_id, today))
            
            count = cursor.fetchone()[0]
            
            if count >= 5:
                print(f"User {user_id} reached daily limit (5)")
                continue
            
            # Отправить уведомление
            preview = post_content[:50] + "..." if len(post_content) > 50 else post_content
            skills_str = ", ".join(skill_tags[:3])  # Показать первые 3 скилла
            text = f"🎯 Новый пост по вашим навыкам (<b>{skills_str}</b>):\n\n{preview}"
            
            keyboard = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(
                    text="📖 Открыть пост",
                    url=f"https://t.me/{os.getenv('BOT_USERNAME')}/{os.getenv('APP_SLUG')}?startapp=p_{post_id}"
                )
            ]])
            
            try:
                await bot.send_message(
                    chat_id=user_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )
                
                # Логировать отправку
                cursor.execute("""
                    INSERT INTO notification_log (user_id, type, date, post_id)
                    VALUES (?, 'skill_match', ?, ?)
                """, (user_id, today, post_id))
                conn.commit()
                
            except Exception as e:
                print(f"Failed to notify user {user_id}: {e}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error in notify_skill_match: {e}")

def get_bot_info():
    return {
        'bot_username': BOT_USERNAME,
        'backend_url': BACKEND_URL,
        'admins': ADMIN_USER_IDS
    }

# ============ POLLING START ============

async def start_polling():
    """Запуск бота в polling режиме"""
    print("🤖 Запуск бота (polling)...")
    await dp.start_polling(bot, skip_updates=True)

__all__ = ['init_bot', 'bot', 'dp', 'notify_new_follower', 'notify_followers_new_post', 'notify_skill_match', 'get_bot_info', 'start_polling']