# serv_create.py
# УДАЛЕНО: Колонки last_seen и nationality_code

import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
DB_NAME = os.getenv("DB_NAME", "profiles.db")

conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

# --- Таблица Профилей (Проверка существующих колонок) ---
print("--- Checking 'profiles' table ---")
# (Этот блок остается без изменений, как в твоем файле)
# Убедимся, что основная таблица существует
cursor.execute('''
CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT DEFAULT NULL,
    bio TEXT,
    link1 TEXT,
    link2 TEXT,
    photo_path TEXT,
    theme TEXT DEFAULT 'auto',
    custom_theme TEXT DEFAULT NULL,
    -- last_seen DATETIME DEFAULT NULL, (УДАЛЕНО)
    skills TEXT DEFAULT NULL,
    language_code TEXT DEFAULT 'ru',
    -- nationality_code TEXT DEFAULT NULL, (УДАЛЕНО)
    
    -- --- НОВОЕ ПОЛЕ ---
    is_glass_enabled INTEGER DEFAULT 0
)
''')
print("✅ Table 'profiles' base structure OK.")

# Проверка и добавление колонок (если вдруг их нет)
columns_to_check = [
    ('first_name', 'TEXT DEFAULT NULL'),
    ('bio', 'TEXT'),
    ('link1', 'TEXT'),
    ('link2', 'TEXT'),
    ('link3', 'TEXT DEFAULT NULL'),
    ('link4', 'TEXT DEFAULT NULL'),
    ('link5', 'TEXT DEFAULT NULL'),
    ('photo_path', 'TEXT'),
    ('theme', 'TEXT DEFAULT "auto"'),
    ('custom_theme', 'TEXT DEFAULT NULL'),
    # ('last_seen', 'DATETIME DEFAULT NULL'), (УДАЛЕНО)
    ('skills', 'TEXT DEFAULT NULL'),
    ('language_code', 'TEXT DEFAULT "ru"'),
    # ('nationality_code', 'TEXT DEFAULT NULL'), (УДАЛЕНО)
    ('is_glass_enabled', 'INTEGER DEFAULT 0')
]
cursor.execute("PRAGMA table_info(profiles)")
existing_columns = [row[1] for row in cursor.fetchall()]
for col_name, col_type in columns_to_check:
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE profiles ADD COLUMN {col_name} {col_type}")
            print(f"✅ Column '{col_name}' added to 'profiles'.")
        except sqlite3.OperationalError as e:
            print(f"⚠️ Error adding column '{col_name}': {e}")
    else:
        print(f"ℹ️ Column '{col_name}' already exists in 'profiles'.")


# --- Таблица Опыта Работы ---
print("\n--- Creating 'work_experience' table ---")
# (Этот блок остается без изменений)
cursor.execute('''
CREATE TABLE IF NOT EXISTS work_experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_title TEXT,
    company TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    is_current INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
)
''')
cursor.execute("CREATE INDEX IF NOT EXISTS idx_work_experience_user_id ON work_experience (user_id)")
print("✅ Table 'work_experience' created or already exists.")


# --- Таблица Образования ---
print("\n--- Creating 'education' table ---")
# (Этот блок остается без изменений)
cursor.execute('''
CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    institution TEXT,
    degree TEXT,
    field_of_study TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
)
''')
cursor.execute("CREATE INDEX IF NOT EXISTS idx_education_user_id ON education (user_id)")
print("✅ Table 'education' created or already exists.")

# --- Таблица Подписок (Follows) ---
print("\n--- Creating 'follows' table ---")
# (Этот блок остается без изменений)
cursor.execute('''
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES profiles (user_id) ON DELETE CASCADE
)
''')
cursor.execute("CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows (following_id)")
print("✅ Table 'follows' created or already exists.")


# --- (НОВЫЙ БЛОК) Таблица Постов (Запросов) ---
print("\n--- Creating 'posts' table ---")
cursor.execute('''
CREATE TABLE IF NOT EXISTS posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    -- Тип запроса: 'looking' (Ищу), 'offering' (Предлагаю), 'showcase' (Демонстрация)
    post_type TEXT NOT NULL,
    -- Текст запроса
    content TEXT NOT NULL,
    
    -- --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    -- Добавляем недостающее поле из миграции
    full_description TEXT DEFAULT NULL,
    
    -- Навыки, связанные с этим постом (храним как JSON-массив)
    skill_tags TEXT DEFAULT '[]',

    -- --- ИСПРАВЛЕНИЕ ДЛЯ IPHONE ---
    -- Меняем DEFAULT CURRENT_TIMESTAMP (плохой формат 'YYYY-MM-DD HH:MM:SS')
    -- на формат ISO 8601 ('YYYY-MM-DDTHH:MM:SSZ'), который понимает Safari
    created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW')),
    -- --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
    FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
)
''')
# Индекс для быстрой выборки постов по пользователю
cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id)")
# Индекс для быстрой сортировки ленты по дате
cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)")
print("✅ Table 'posts' (for Networking Hub) created or already exists.")
# --- КОНЕЦ НОВОГО БЛОКА ---

conn.commit()
conn.close()

print(f"\n✅ Database '{DB_NAME}' schema check complete.")