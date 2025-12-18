import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
DB_NAME = os.getenv('DB_NAME', 'database.db')

def create_database():
    """Создание всех таблиц базы данных"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA foreign_keys = ON")
    print("🔧 Создание/обновление базы данных...")
    
    # Таблица профилей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            user_id INTEGER PRIMARY KEY,
            first_name TEXT,
            bio TEXT,
            link1 TEXT,
            link2 TEXT,
            link3 TEXT,
            link4 TEXT,
            link5 TEXT,
            photo_path TEXT,
            skills TEXT,
            language_code TEXT DEFAULT 'ru',
            theme TEXT DEFAULT 'auto',
            custom_theme TEXT,
            is_glass_enabled INTEGER DEFAULT 1,
            status TEXT DEFAULT 'networking',
            followers_count INTEGER DEFAULT 0,
            following_count INTEGER DEFAULT 0,
            is_private INTEGER DEFAULT 0,
            telegram_username TEXT,
            last_active TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("✅ Таблица profiles")
    
    # Таблица опыта работы
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS work_experience (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_title TEXT,
            company TEXT,
            start_date TEXT,
            end_date TEXT,
            is_current INTEGER DEFAULT 0,
            description TEXT,
            FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица work_experience")
    
    # Таблица образования
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS education (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            institution TEXT,
            degree TEXT,
            field_of_study TEXT,
            start_date TEXT,
            end_date TEXT,
            FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица education")
    
    # Таблица подписок
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS follows (
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица follows")
    
    # Таблица постов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            post_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_type TEXT NOT NULL,
            content TEXT NOT NULL,
            full_description TEXT,
            skill_tags TEXT,
            experience_years TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица posts")
    
    # Таблица уведомлений
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            from_user_id INTEGER,
            post_id INTEGER,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
            FOREIGN KEY (from_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица notifications")
    
    # Таблица логов уведомлений
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notification_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            post_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_notif_user_date 
        ON notification_log(user_id, date, type)
    ''')
    print("✅ Таблица notification_log")
    
    # Таблица запросов на отклик
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS response_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (from_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
            FOREIGN KEY (to_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица response_requests")
    
    # Таблица жалоб
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            resolved_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица reports")
    
    # Таблица банов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bans (
            user_id INTEGER PRIMARY KEY,
            banned_by INTEGER NOT NULL,
            reason TEXT,
            ban_type TEXT DEFAULT 'shadow',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
        )
    ''')
    print("✅ Таблица bans")
    
    # Индексы
    print("\n🔧 Создание индексов...")
    indexes = [
        ("idx_notifications_user", "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)"),
        ("idx_response_requests_status", "CREATE INDEX IF NOT EXISTS idx_response_requests_status ON response_requests(to_user_id, status)"),
        ("idx_reports_status", "CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)"),
        ("idx_posts_created", "CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)")
    ]
    
    for idx_name, idx_sql in indexes:
        try:
            cursor.execute(idx_sql)
            print(f" ✅ Индекс {idx_name}")
        except sqlite3.OperationalError as e:
            print(f" ⚠️ Индекс {idx_name}: {e}")
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*60)
    print("✅ БАЗА ДАННЫХ УСПЕШНО СОЗДАНА/ОБНОВЛЕНА!")
    print("="*60)
    print(f"📁 Файл: {DB_NAME}")
    print("\n📊 Таблицы:")
    print(" • profiles")
    print(" • work_experience")
    print(" • education")
    print(" • follows")
    print(" • posts")
    print(" • notifications")
    print(" • notification_log")
    print(" • response_requests")
    print(" • reports")
    print(" • bans")
    print("\n🚀 Готово к работе с ботом!")
    print("="*60)

if __name__ == '__main__':
    try:
        create_database()
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()