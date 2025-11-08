# server.py
# ОБНОВЛЕНО: Добавлена валидация на стороне сервера
# ОБНОВЛЕНО (Glass): Добавлен эндпоинт /api/save-glass-preference

import sqlite3
import hmac
import hashlib
import json
import os
from urllib.parse import unquote
from werkzeug.utils import secure_filename
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# --- Пути и Конфигурация ---
APP_ROOT = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
DB_NAME = os.getenv("DB_NAME")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True, mode=0o755)

BOT_TOKEN = os.getenv("BOT_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL")
APP_PORT = int(os.getenv("APP_PORT", 5000))

if not BOT_TOKEN:
    raise ValueError("🔴 Не найден BOT_TOKEN в .env файле!")

TRANSLATIONS = {
    # ... (блок переводов без изменений) ...
    'ru': {
        'profile_updated': "✅ *Ваш профиль успешно обновлен!*\n\n",
        'bio_label': "👤 *О себе:*\n",
        'link_1': "🔗 [Ссылка 1]",
        'link_2': "🔗 [Ссылка 2]",
        'link_3': "🔗 [Ссылка 3]",
        'link_4': "🔗 [Ссылка 4]",
        'link_5': "🔗 [Ссылка 5]",
    },
    'en': {
        'profile_updated': "✅ *Your profile has been successfully updated!*\n\n",
        'bio_label': "👤 *About:*\n",
        'link_1': "🔗 [Link 1]",
        'link_2': "🔗 [Link 2]",
        'link_3': "🔗 [Link 3]",
        'link_4': "🔗 [Link 4]",
        'link_5': "🔗 [Link 5]",
    }
}

# --- НОВЫЙ БЛОК: Лимиты валидации ---
# Мы будем использовать их для проверки всех входящих данных
VALIDATION_LIMITS = {
    # Профиль
    'first_name': 100,
    'bio': 1000,
    'skills_json': 5000, # Лимит на JSON-строку
    'links_count': 5,
    'experience_count': 10,
    'education_count': 5,
    
    # Посты
    'post_content': 500,
    'post_full_description': 5000,
    'post_skills_json': 2000 # Лимит на JSON-строку
}
# --- КОНЕЦ НОВОГО БЛОКА ---


# --- Маршруты для фронтенда (без изменений) ---
@app.route('/')
def serve_index():
    return send_from_directory(APP_ROOT, 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'js'), filename)

@app.route('/flags/<path:filename>')
def serve_flag(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'flags'), filename, mimetype='image/svg+xml')

@app.route('/locales/<path:filename>')
def serve_locales(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'locales'), filename)

@app.route('/countries.json')
def serve_countries():
    return send_from_directory(APP_ROOT, 'countries.json')

# --- Маршруты API (без изменений) ---
@app.route('/config')
def get_config():
    return jsonify({
        'backendUrl': BACKEND_URL,
        'botUsername': os.getenv('BOT_USERNAME'),
        'appSlug': os.getenv('APP_SLUG')
    })

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Функции (без изменений) ---
def validate_init_data(init_data: str, bot_token: str):
    # ... (код без изменений) ...
    try:
        parsed_data = dict(item.split("=") for item in init_data.split("&"))
        received_hash = parsed_data.pop("hash")
        user_data_json = unquote(parsed_data.get("user", "{}"))
        user_data = json.loads(user_data_json)
        user_id = user_data.get("id")
        data_check_string = "\n".join(f"{key}={unquote(value)}" for key, value in sorted(parsed_data.items()))
        secret_key = hmac.new("WebAppData".encode(), bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if calculated_hash != received_hash: return None
        return user_id
    except Exception: return None

def send_telegram_message(user_id, profile_data, photo_path, lang='ru'):
    # ... (код без изменений) ...
    t = TRANSLATIONS.get(lang, TRANSLATIONS['ru'])
    caption = t['profile_updated']
    if profile_data.get('bio'):
        caption += f"{t['bio_label']}_{profile_data['bio']}_\n\n"
    for i in range(1, 6):
        link_key = f'link{i}'
        link_label_key = f'link_{i}'
        if profile_data.get(link_key):
             caption += f"{t.get(link_label_key, f'🔗 [Ссылка {i}]')}({profile_data[link_key]})\n"
    caption = caption.strip()
    if photo_path:
        photo_url = f"{BACKEND_URL}/{photo_path}"
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
        payload = {"chat_id": user_id, "photo": photo_url, "caption": caption, "parse_mode": "Markdown"}
    else:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {"chat_id": user_id, "text": caption, "parse_mode": "Markdown", "disable_web_page_preview": True}
    try:
        response = requests.post(url, json=payload)
        print(f"Telegram response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Ошибка отправки сообщения: {e}")

# --- Вспомогательные функции для БД (без изменений) ---
def get_db_connection():
    # ... (код без изменений) ...
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def fetch_list_from_db(conn, table_name, user_id):
    # ... (код без изменений) ...
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} WHERE user_id = ? ORDER BY id DESC", (user_id,))
    items = [dict(row) for row in cursor.fetchall()]
    return items

def save_list_to_db(conn, table_name, user_id, items_json, max_items):
    # ... (код БЕЗ ИЗМЕНЕНИЙ, т.к. лимит уже применяется здесь) ...
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name} WHERE user_id = ?", (user_id,))
    try:
        items = json.loads(items_json)
        if not isinstance(items, list):
            raise ValueError("Data is not a list")
        items_to_save = items[:max_items] # <--- ЛОГИКА ЛИМИТА УЖЕ БЫЛА ЗДЕСЬ
        if not items_to_save:
             return
        sample_item = items_to_save[0]
        fields = [key for key in sample_item.keys() if key not in ('id', 'user_id')]
        placeholders = ', '.join('?' * len(fields))
        field_names = ', '.join(fields)
        for item in items_to_save:
            values = [item.get(field) for field in fields]
            cursor.execute(
                f"INSERT INTO {table_name} (user_id, {field_names}) VALUES (?, {placeholders})",
                (user_id, *values)
            )
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"❌ Ошибка парсинга или сохранения списка {table_name}: {e}")


def get_follow_counts(conn, user_id):
    # ... (код без изменений) ...
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM follows WHERE following_id = ?", (user_id,))
    followers_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM follows WHERE follower_id = ?", (user_id,))
    following_count = cursor.fetchone()[0]
    return followers_count, following_count

def check_is_followed(conn, viewer_id, target_user_id):
    # ... (код без изменений) ...
    if viewer_id == target_user_id:
        return None
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
        (viewer_id, target_user_id)
    )
    return cursor.fetchone() is not None

# --- Обновленные API эндпоинты (без изменений) ---
# ЗАМЕЧАНИЕ: /get-profile и /get-user-by-id УЖЕ используют "SELECT *",
# поэтому они АВТОМАТИЧЕСКИ подхватят новое поле 'is_glass_enabled'.
# Никаких изменений здесь не требуется.

@app.route("/get-profile", methods=["POST"])
def get_profile():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
        profile_row = cursor.fetchone()
        if profile_row:
            profile = dict(profile_row)
            profile['experience'] = fetch_list_from_db(conn, 'work_experience', user_id)
            profile['education'] = fetch_list_from_db(conn, 'education', user_id)
            followers_count, following_count = get_follow_counts(conn, user_id)
            profile['followers_count'] = followers_count
            profile['following_count'] = following_count
            conn.close()
            print("--- /get-profile: УСПЕХ. Профиль найден, отправляю.")
            return jsonify({"ok": True, "profile": profile})
        else:
            conn.close()
            print("--- /get-profile: УСПЕХ. Профиль НЕ найден, отправляю пустой.")
            return jsonify({"ok": True, "profile": {}})
    except Exception as e:
        print(f"--- /get-profile: КРИТИЧЕСКАЯ ОШИБКА (ПАДЕНИЕ): {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/get-user-by-id", methods=["POST"])
def get_user_by_id():
    # ... (код без изменений) ...
    data = request.json
    viewer_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not viewer_id: return jsonify({"ok": False, "error": "Invalid viewer data"}), 403
    target_user_id = data.get("target_user_id")
    if not target_user_id: return jsonify({"ok": False, "error": "Target user ID not provided"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (target_user_id,))
        profile_row = cursor.fetchone()
        if profile_row:
            profile = dict(profile_row)
            profile['experience'] = fetch_list_from_db(conn, 'work_experience', target_user_id)
            profile['education'] = fetch_list_from_db(conn, 'education', target_user_id)
            followers_count, following_count = get_follow_counts(conn, target_user_id)
            profile['followers_count'] = followers_count
            profile['following_count'] = following_count
            profile['is_followed_by_viewer'] = check_is_followed(conn, viewer_id, target_user_id)
            conn.close()
            return jsonify({"ok": True, "profile": profile})
        else:
            conn.close()
            return jsonify({"ok": False, "error": "User not found"})
    except Exception as e:
        print(f"Ошибка получения профиля по ID: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": "Server error"}), 500


# --- ОБНОВЛЕНО: /save-profile ---
@app.route("/save-profile", methods=["POST"])
def save_profile():
    # 1. Валидация initData
    init_data = request.form.get('initData')
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403

    # 2. Загрузка фото (без изменений)
    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            filename = secure_filename(f"{user_id}.jpg")
            try:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                photo_path = f"uploads/{filename}"
                print(f"📸 Фото сохранено: {filepath}")
            except Exception as e:
                 print(f"❌ Ошибка сохранения фото: {e}")

    try:
        # --- 3. НОВЫЙ БЛОК: Валидация данных ПЕРЕД сохранением ---
        
        # Получаем данные
        first_name = request.form.get("first_name", "Пользователь")
        bio = request.form.get("bio")
        skills_json = request.form.get("skills", "[]") # JSON строка
        lang = request.form.get("lang", "ru")
        nationality_code = request.form.get("nationality_code")
        links = {f'link{i}': request.form.get(f'link{i}') for i in range(1, 6)}
        experience_json = request.form.get("experience", "[]")
        education_json = request.form.get("education", "[]")

        # Проверяем лимиты
        if len(first_name) > VALIDATION_LIMITS['first_name']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_name_too_long", "limit": VALIDATION_LIMITS['first_name']}}), 400
        
        if len(bio) > VALIDATION_LIMITS['bio']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_bio_too_long", "limit": VALIDATION_LIMITS['bio']}}), 400

        if len(skills_json) > VALIDATION_LIMITS['skills_json']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_skills_too_long", "limit": VALIDATION_LIMITS['skills_json']}}), 400

        # Проверяем количество элементов в JSON-списках
        if len(json.loads(experience_json)) > VALIDATION_LIMITS['experience_count']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_experience_max_items", "limit": VALIDATION_LIMITS['experience_count']}}), 400
            
        if len(json.loads(education_json)) > VALIDATION_LIMITS['education_count']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_education_max_items", "limit": VALIDATION_LIMITS['education_count']}}), 400

        # (Лимит на ссылки не нужен, т.к. save_list_to_db их обрежет до 5)
        # --- КОНЕЦ БЛОКА ВАЛИДАЦИИ ---

        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем текущий photo_path (без изменений)
        if not photo_path:
            cursor.execute("SELECT photo_path FROM profiles WHERE user_id = ?", (user_id,))
            res = cursor.fetchone()
            if res: photo_path = res[0]
        
        print(f"💾 Сохраняем профиль user_id={user_id}")
        cursor.execute("BEGIN TRANSACTION")

        # 1. Обновляем/вставляем профиль (без изменений)
        cursor.execute("SELECT user_id FROM profiles WHERE user_id = ?", (user_id,))
        exists = cursor.fetchone()
        
        # ЗАМЕЧАНИЕ: Поле 'is_glass_enabled' здесь НЕ трогаем,
        # т.к. оно управляется отдельным эндпоинтом.
        
        profile_fields = (first_name, bio, links['link1'], links['link2'], links['link3'], links['link4'], links['link5'], photo_path, skills_json, lang, nationality_code, user_id)
        if exists:
            cursor.execute('''
                UPDATE profiles
                SET first_name = ?, bio = ?, link1 = ?, link2 = ?, link3 = ?, link4 = ?, link5 = ?, photo_path = ?, skills = ?, language_code = ?, nationality_code = ?
                WHERE user_id = ?
            ''', profile_fields)
        else:
            cursor.execute('''
                INSERT INTO profiles (first_name, bio, link1, link2, link3, link4, link5, photo_path, skills, language_code, nationality_code, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', profile_fields)

        # 2. Сохраняем опыт (лимит 10)
        save_list_to_db(conn, 'work_experience', user_id, experience_json, VALIDATION_LIMITS['experience_count'])

        # 3. Сохраняем образование (лимит 5)
        save_list_to_db(conn, 'education', user_id, education_json, VALIDATION_LIMITS['education_count'])

        conn.commit()
        conn.close()

        message_data = {"bio": bio, **links}
        send_telegram_message(user_id, message_data, photo_path, lang)

        print(f"✅ Профиль user_id={user_id} успешно сохранен.")
        return jsonify({"ok": True})

    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ Ошибка сохранения профиля: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
            conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Остальные API (без изменений) ---
@app.route("/save-language", methods=["POST"])
def save_language():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    lang = data.get("lang")
    if lang not in ['ru', 'en']: return jsonify({"ok": False, "error": "Invalid language code"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE profiles SET language_code = ? WHERE user_id = ?", (lang, user_id))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": "Language saved"})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/save-theme", methods=["POST"])
def save_theme():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    theme = data.get("theme")
    if theme not in ['auto', 'light', 'dark', 'custom']: return jsonify({"ok": False, "error": "Invalid theme value"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE profiles SET theme = ? WHERE user_id = ?", (theme, user_id))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": "Theme saved"})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/save-custom-theme", methods=["POST"])
def save_custom_theme():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    colors = data.get("colors")
    if not colors: return jsonify({"ok": False, "error": "No colors provided"}), 400
    custom_theme_json = json.dumps(colors)
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE profiles SET theme = 'custom', custom_theme = ? WHERE user_id = ?", (custom_theme_json, user_id))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": "Custom theme saved"})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/update-status", methods=["POST"])
def update_status():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        last_seen_iso = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        cursor.execute("UPDATE profiles SET last_seen = ? WHERE user_id = ?", (last_seen_iso, user_id))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/get-telegram-user-info", methods=["POST"])
def get_telegram_user_info():
    # ... (код без изменений) ...
    data = request.json
    viewer_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not viewer_id: return jsonify({"ok": False, "error": "Invalid viewer data"}), 403
    target_user_id = data.get("target_user_id")
    if not target_user_id: return jsonify({"ok": False, "error": "Target user ID not provided"}), 400
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getChat"
        payload = {"chat_id": target_user_id}
        response = requests.post(url, json=payload)
        result = response.json()
        if result.get("ok"):
            chat_data = result.get("result", {})
            return jsonify({
                "ok": True,
                "username": chat_data.get("username"),
                "first_name": chat_data.get("first_name"),
                "user_id": target_user_id
            })
        else:
            return jsonify({ "ok": True, "username": None, "user_id": target_user_id })
    except Exception as e:
        return jsonify({"ok": True, "username": None, "user_id": target_user_id})

@app.route("/get-all-profiles", methods=["POST"])
def get_all_profiles():
    # ... (код без изменений) ...
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT
                p.user_id, p.first_name, p.bio, p.photo_path, p.last_seen, p.skills, p.language_code, p.nationality_code,
                we.job_title,
                we.company
            FROM profiles p
            LEFT JOIN (
                SELECT
                    id, user_id, job_title, company
                FROM (
                    SELECT
                        id, user_id, job_title, company,
                        ROW_NUMBER() OVER(
                            PARTITION BY user_id
                            ORDER BY is_current DESC, id DESC
                        ) as rn
                    FROM work_experience
                ) AS ranked_jobs
                WHERE rn = 1
            ) AS we ON p.user_id = we.user_id
            WHERE
                p.user_id != ?
                AND (
                    (p.bio IS NOT NULL AND p.bio != '') OR
                    (p.photo_path IS NOT NULL) OR
                    (p.skills IS NOT NULL AND p.skills != '[]')
                )
        ''', (user_id,))
        profiles = [dict(row) for row in cursor.fetchall()]
        conn.close()
        print(f"✅ /get-all-profiles (OPTIMIZED + FIXED) OK: Найдено {len(profiles)} профилей.")
        return jsonify({"ok": True, "profiles": profiles})
    except Exception as e:
        print(f"❌ ОШИБКА /get-all-profiles: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Подписки (без изменений) ---
@app.route("/follow", methods=["POST"])
def follow_user():
    # ... (код без изменений) ...
    data = request.json
    viewer_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not viewer_id: return jsonify({"ok": False, "error": "Invalid viewer data"}), 403
    target_user_id = data.get("target_user_id")
    if not target_user_id or target_user_id == viewer_id:
        return jsonify({"ok": False, "error": "Invalid target user"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)",
            (viewer_id, target_user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/unfollow", methods=["POST"])
def unfollow_user():
    # ... (код без изменений) ...
    data = request.json
    viewer_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not viewer_id: return jsonify({"ok": False, "error": "Invalid viewer data"}), 403
    target_user_id = data.get("target_user_id")
    if not target_user_id or target_user_id == viewer_id:
        return jsonify({"ok": False, "error": "Invalid target user"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
            (viewer_id, target_user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- ОБНОВЛЕНО: /api/create-post ---
@app.route("/api/create-post", methods=["POST"])
def create_post():
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403

    post_type = data.get("post_type")
    content = data.get("content")
    full_description = data.get("full_description", "")
    skill_tags_json = json.dumps(data.get("skill_tags", []))

    if not post_type or not content:
        return jsonify({"ok": False, "error": "Missing fields"}), 400

    # --- НОВЫЙ БЛОК: Валидация ---
    if len(content) > VALIDATION_LIMITS['post_content']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_content_too_long", "limit": VALIDATION_LIMITS['post_content']}}), 400
    
    if len(full_description) > VALIDATION_LIMITS['post_full_description']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_full_description_too_long", "limit": VALIDATION_LIMITS['post_full_description']}}), 400
        
    if len(skill_tags_json) > VALIDATION_LIMITS['post_skills_json']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_skills_too_long", "limit": VALIDATION_LIMITS['post_skills_json']}}), 400
    # --- КОНЕЦ БЛОКА ВАЛИДАЦИИ ---

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO posts (user_id, post_type, content, full_description, skill_tags) VALUES (?, ?, ?, ?, ?)",
            (user_id, post_type, content, full_description, skill_tags_json)
        )
        conn.commit()
        conn.close()
        print(f"✅ УСПЕХ: Новый пост создан пользователем {user_id}")
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/create-post: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Лента постов (без изменений) ---
@app.route("/api/get-posts-feed", methods=["POST"])
def get_posts_feed():
    # ... (код без изменений) ...
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                p.post_id, p.user_id, p.post_type, p.content, p.full_description, p.skill_tags,
                SUBSTR(STRFTIME('%Y-%m-%dT%H:%M:%f', p.created_at), 1, 23) || 'Z' as created_at,
                pr.first_name as author_first_name,
                pr.photo_path as author_photo_path
            FROM posts p
            JOIN profiles pr ON p.user_id = pr.user_id
            ORDER BY p.created_at DESC
            LIMIT 50 
        ''')
        posts = []
        for row in cursor.fetchall():
            post = dict(row)
            try:
                post['skill_tags'] = json.loads(post['skill_tags'])
            except:
                post['skill_tags'] = []
            post['author'] = {
                'user_id': post['user_id'],
                'first_name': post.pop('author_first_name'),
                'photo_path': post.pop('author_photo_path')
            }
            posts.append(post)
        conn.close()
        print(f"✅ УСПЕХ: /api/get-posts-feed, найдено {len(posts)} постов.")
        return jsonify({"ok": True, "posts": posts})
    except Exception as e:
        print(f"❌ ОШИБКА /api/get-posts-feed: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/get-my-posts", methods=["POST"])
def get_my_posts():
    # ... (код без изменений) ...
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                p.post_id, p.user_id, p.post_type, p.content, p.full_description, p.skill_tags,
                SUBSTR(STRFTIME('%Y-%m-%dT%H:%M:%f', p.created_at), 1, 23) || 'Z' as created_at,
                pr.first_name as author_first_name,
                pr.photo_path as author_photo_path
            FROM posts p
            JOIN profiles pr ON p.user_id = pr.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        ''', (user_id,))
        posts = []
        for row in cursor.fetchall():
            post = dict(row)
            try:
                post['skill_tags'] = json.loads(post['skill_tags'])
            except:
                post['skill_tags'] = []
            post['author'] = {
                'user_id': post['user_id'],
                'first_name': post.pop('author_first_name'),
                'photo_path': post.pop('author_photo_path')
            }
            posts.append(post)
        conn.close()
        print(f"✅ УСПЕХ: /api/get-my-posts, найдено {len(posts)} постов пользователя {user_id}.")
        return jsonify({"ok": True, "posts": posts})
    except Exception as e:
        print(f"❌ ОШИБКА /api/get-my-posts: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/delete-post", methods=["POST"])
def delete_post():
    # ... (код без изменений) ...
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    post_id = data.get("post_id")
    if not post_id: return jsonify({"ok": False, "error": "Missing post_id"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM posts WHERE post_id = ?", (post_id,))
        post = cursor.fetchone()
        if not post:
            conn.close()
            return jsonify({"ok": False, "error": "Post not found"}), 404
        if post['user_id'] != user_id:
            conn.close()
            return jsonify({"ok": False, "error": "Not authorized"}), 403
        cursor.execute("DELETE FROM posts WHERE post_id = ?", (post_id,))
        conn.commit()
        conn.close()
        print(f"✅ Пост {post_id} удален пользователем {user_id}")
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/delete-post: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- ОБНОВЛЕНО: /api/update-post ---
@app.route("/api/update-post", methods=["POST"])
def update_post():
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    
    post_id = data.get("post_id")
    post_type = data.get("post_type")
    content = data.get("content")
    full_description = data.get("full_description", "")
    skill_tags_json = json.dumps(data.get("skill_tags", []))
    
    if not post_id or not post_type or not content:
        return jsonify({"ok": False, "error": "Missing fields"}), 400

    # --- НОВЫЙ БЛОК: Валидация (такая же, как в create-post) ---
    if len(content) > VALIDATION_LIMITS['post_content']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_content_too_long", "limit": VALIDATION_LIMITS['post_content']}}), 400
    
    if len(full_description) > VALIDATION_LIMITS['post_full_description']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_full_description_too_long", "limit": VALIDATION_LIMITS['post_full_description']}}), 400
        
    if len(skill_tags_json) > VALIDATION_LIMITS['post_skills_json']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_skills_too_long", "limit": VALIDATION_LIMITS['post_skills_json']}}), 400
    # --- КОНЕЦ БЛОКА ВАЛИДАЦИИ ---

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем, что пост принадлежит пользователю (без изменений)
        cursor.execute("SELECT user_id FROM posts WHERE post_id = ?", (post_id,))
        post = cursor.fetchone()
        
        if not post:
            conn.close()
            return jsonify({"ok": False, "error": "Post not found"}), 404
        
        if post['user_id'] != user_id:
            conn.close()
            return jsonify({"ok": False, "error": "Not authorized"}), 403
        
        # Обновляем пост (без изменений)
        cursor.execute(
            "UPDATE posts SET post_type = ?, content = ?, full_description = ?, skill_tags = ? WHERE post_id = ?",
            (post_type, content, full_description, skill_tags_json, post_id)
        )
        conn.commit()
        conn.close()
        
        print(f"✅ Пост {post_id} обновлен пользователем {user_id}")
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/update-post: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

# --- (НОВЫЙ БЛОК) Эндпоинт для сохранения "Стекла" ---
@app.route("/api/save-glass-preference", methods=["POST"])
def save_glass_preference():
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id:
        return jsonify({"ok": False, "error": "Invalid data"}), 403

    is_enabled = data.get("is_enabled")
    if not isinstance(is_enabled, bool):
        return jsonify({"ok": False, "error": "Invalid is_enabled flag"}), 400
    
    glass_value = 1 if is_enabled else 0

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE profiles SET is_glass_enabled = ? WHERE user_id = ?",
            (glass_value, user_id)
        )
        conn.commit()
        conn.close()
        print(f"✅ Настройки 'Стекла' (is_glass_enabled={glass_value}) сохранены для user {user_id}")
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/save-glass-preference: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500
# --- КОНЕЦ НОВОГО БЛОКА ---


# --- Запуск приложения (без изменений) ---
if __name__ == "__main__":
    app.run("0.0.0.0", port=APP_PORT, threaded=True)