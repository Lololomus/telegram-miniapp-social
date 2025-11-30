# server.py
# ОБНОВЛЕНО: Добавлена поддержка поля experience_years для постов
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
# SECURITY: Максимальный размер загружаемого файла (5MB)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

BOT_TOKEN = os.getenv("BOT_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL")
APP_PORT = int(os.getenv("APP_PORT", 5000))

if not BOT_TOKEN:
    raise ValueError("🔴 Не найден BOT_TOKEN в .env файле!")

TRANSLATIONS = {
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
VALIDATION_LIMITS = {
    # Профиль
    'first_name': 100,
    'bio': 1000,
    'skills_json': 5000,
    'links_count': 5,
    'experience_count': 10,
    'education_count': 5,
    
    # Посты
    'post_content': 500,
    'post_full_description': 2000,
    'post_skills_json': 2000,
    
    # --- НОВОЕ ПОЛЕ ---
    'post_experience': 50 # Например "1-3 года"
}
# --- КОНЕЦ НОВОГО БЛОКА ---


# --- Маршруты для фронтенда ---
@app.route('/')
def serve_index():
    return send_from_directory(APP_ROOT, 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'js'), filename)

@app.route('/locales/<path:filename>')
def serve_locales(filename):
    return send_from_directory(os.path.join(APP_ROOT, 'locales'), filename)

# --- Маршруты API ---
@app.route('/config')
def get_config():
    return jsonify({
        'backendUrl': BACKEND_URL,
        'botUsername': os.getenv('BOT_USERNAME'),
        'appSlug': os.getenv('APP_SLUG'),
        'validationLimits': VALIDATION_LIMITS 
    })

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Функции ---
def validate_init_data(init_data: str, bot_token: str):
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
        url = f"https.api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {"chat_id": user_id, "text": caption, "parse_mode": "Markdown", "disable_web_page_preview": True}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Ошибка отправки сообщения: {e}")

# --- Вспомогательные функции для БД ---
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

ALLOWED_TABLES = ['work_experience', 'education']

def fetch_list_from_db(conn, table_name, user_id):
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"[SECURITY] Invalid table name: {table_name}")
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} WHERE user_id = ? ORDER BY id DESC", (user_id,))
    items = [dict(row) for row in cursor.fetchall()]
    return items

def save_list_to_db(conn, table_name, user_id, items_json, max_items):
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"[SECURITY] Invalid table name: {table_name}")
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name} WHERE user_id = ?", (user_id,))
    try:
        items = json.loads(items_json)
        if not isinstance(items, list):
            raise ValueError("Data is not a list")
        items_to_save = items[:max_items]
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
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM follows WHERE following_id = ?", (user_id,))
    followers_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM follows WHERE follower_id = ?", (user_id,))
    following_count = cursor.fetchone()[0]
    return followers_count, following_count

def check_is_followed(conn, viewer_id, target_user_id):
    if viewer_id == target_user_id:
        return None
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
        (viewer_id, target_user_id)
    )
    return cursor.fetchone() is not None

@app.route("/get-profile", methods=["POST"])
def get_profile():
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
            return jsonify({"ok": True, "profile": profile})
        else:
            conn.close()
            return jsonify({"ok": True, "profile": {}})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/get-user-by-id", methods=["POST"])
def get_user_by_id():
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
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": "Server error"}), 500

@app.route("/api/get-post-by-id", methods=["POST"])
def get_post_by_id():
    data = request.json
    viewer_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not viewer_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    
    post_id = data.get("post_id")
    if not post_id: return jsonify({"ok": False, "error": "Missing post_id"}), 400

    try:
        post_id_int = int(post_id)
    except ValueError:
        return jsonify({"ok": False, "error": "Invalid post_id format"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # --- ОБНОВЛЕНО: Добавлено experience_years ---
        cursor.execute('''
            SELECT 
                p.post_id, p.user_id, p.post_type, p.content, p.full_description, p.skill_tags, p.experience_years,
                SUBSTR(STRFTIME('%Y-%m-%dT%H:%M:%f', p.created_at), 1, 23) || 'Z' as created_at,
                pr.first_name as author_first_name,
                pr.photo_path as author_photo_path
            FROM posts p
            JOIN profiles pr ON p.user_id = pr.user_id
            WHERE p.post_id = ?
        ''', (post_id_int,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"ok": False, "error": "Post not found"}), 404
            
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
        
        return jsonify({"ok": True, "post": post})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/save-profile", methods=["POST"])
def save_profile():
    init_data = request.form.get('initData')
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403

    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            if not file.content_type or not file.content_type.startswith('image/'):
                return jsonify({"ok": False, "error": "validation", "details": {"key": "error_invalid_file_type", "message": "Only images allowed"}}), 400
            allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in allowed_extensions:
                return jsonify({"ok": False, "error": "Invalid file extension"}), 400
            filename = secure_filename(f"{user_id}.jpg")
            try:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                photo_path = f"uploads/{filename}"
            except Exception as e:
                 print(f"❌ Ошибка сохранения фото: {e}")

    try:
        first_name = request.form.get("first_name", "Пользователь")
        bio = request.form.get("bio")
        skills_json = request.form.get("skills", "[]")
        lang = request.form.get("lang", "ru")
        links = {f'link{i}': request.form.get(f'link{i}') for i in range(1, 6)}
        experience_json = request.form.get("experience", "[]")
        education_json = request.form.get("education", "[]")

        if len(first_name) > VALIDATION_LIMITS['first_name']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_name_too_long", "limit": VALIDATION_LIMITS['first_name']}}), 400
        
        if len(bio) > VALIDATION_LIMITS['bio']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_bio_too_long", "limit": VALIDATION_LIMITS['bio']}}), 400

        if len(skills_json) > VALIDATION_LIMITS['skills_json']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_skills_too_long", "limit": VALIDATION_LIMITS['skills_json']}}), 400

        if len(json.loads(experience_json)) > VALIDATION_LIMITS['experience_count']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_experience_max_items", "limit": VALIDATION_LIMITS['experience_count']}}), 400
            
        if len(json.loads(education_json)) > VALIDATION_LIMITS['education_count']:
            return jsonify({"ok": False, "error": "validation", "details": {"key": "error_education_max_items", "limit": VALIDATION_LIMITS['education_count']}}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        if not photo_path:
            cursor.execute("SELECT photo_path FROM profiles WHERE user_id = ?", (user_id,))
            res = cursor.fetchone()
            if res: photo_path = res[0]
        
        cursor.execute("BEGIN TRANSACTION")

        cursor.execute("SELECT user_id FROM profiles WHERE user_id = ?", (user_id,))
        exists = cursor.fetchone()
        
        profile_fields = (first_name, bio, links['link1'], links['link2'], links['link3'], links['link4'], links['link5'], photo_path, skills_json, lang, user_id)
        if exists:
            cursor.execute('''
                UPDATE profiles
                SET first_name = ?, bio = ?, link1 = ?, link2 = ?, link3 = ?, link4 = ?, link5 = ?, photo_path = ?, skills = ?, language_code = ?
                WHERE user_id = ?
            ''', profile_fields)
        else:
            cursor.execute('''
                INSERT INTO profiles (first_name, bio, link1, link2, link3, link4, link5, photo_path, skills, language_code, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', profile_fields)

        save_list_to_db(conn, 'work_experience', user_id, experience_json, VALIDATION_LIMITS['experience_count'])
        save_list_to_db(conn, 'education', user_id, education_json, VALIDATION_LIMITS['education_count'])

        conn.commit()
        conn.close()

        message_data = {"bio": bio, **links}
        send_telegram_message(user_id, message_data, photo_path, lang)

        return jsonify({"ok": True})

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
            conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/save-language", methods=["POST"])
def save_language():
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

@app.route("/get-telegram-user-info", methods=["POST"])
def get_telegram_user_info():
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
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # --- ОБНОВЛЕНО: Добавлено p.status в SELECT ---
        cursor.execute('''
            SELECT
                p.user_id, p.first_name, p.bio, p.photo_path, p.skills, p.language_code, p.status,
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
        return jsonify({"ok": True, "profiles": profiles})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/follow", methods=["POST"])
def follow_user():
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

@app.route("/api/create-post", methods=["POST"])
def create_post():
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403

    post_type = data.get("post_type")
    content = data.get("content")
    full_description = data.get("full_description", "")
    skill_tags_json = json.dumps(data.get("skill_tags", []))
    
    # --- ОБНОВЛЕНО: Получаем опыт ---
    experience_years = data.get("experience_years")

    if not post_type or not content:
        return jsonify({"ok": False, "error": "Missing fields"}), 400

    if len(content) > VALIDATION_LIMITS['post_content']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_content_too_long", "limit": VALIDATION_LIMITS['post_content']}}), 400
    
    if len(full_description) > VALIDATION_LIMITS['post_full_description']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_full_description_too_long", "limit": VALIDATION_LIMITS['post_full_description']}}), 400
        
    if len(skill_tags_json) > VALIDATION_LIMITS['post_skills_json']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_skills_too_long", "limit": VALIDATION_LIMITS['post_skills_json']}}), 400
    
    # --- ОБНОВЛЕНО: Валидация опыта ---
    if experience_years and len(str(experience_years)) > VALIDATION_LIMITS['post_experience']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_experience_too_long", "limit": VALIDATION_LIMITS['post_experience']}}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # --- ОБНОВЛЕНО: Insert experience_years ---
        cursor.execute(
            "INSERT INTO posts (user_id, post_type, content, full_description, skill_tags, experience_years) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, post_type, content, full_description, skill_tags_json, experience_years)
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/create-post: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/get-posts-feed", methods=["POST"])
def get_posts_feed():
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # --- ОБНОВЛЕНО: Select experience_years ---
        cursor.execute('''
            SELECT 
                p.post_id, p.user_id, p.post_type, p.content, p.full_description, p.skill_tags, p.experience_years,
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
        return jsonify({"ok": True, "posts": posts})
    except Exception as e:
        print(f"❌ ОШИБКА /api/get-posts-feed: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/get-my-posts", methods=["POST"])
def get_my_posts():
    init_data = request.json.get("initData")
    user_id = validate_init_data(init_data, BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # --- ОБНОВЛЕНО: Select experience_years ---
        cursor.execute('''
            SELECT 
                p.post_id, p.user_id, p.post_type, p.content, p.full_description, p.skill_tags, p.experience_years,
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
        return jsonify({"ok": True, "posts": posts})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/delete-post", methods=["POST"])
def delete_post():
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
        return jsonify({"ok": True})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

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
    # --- ОБНОВЛЕНО: Получаем опыт ---
    experience_years = data.get("experience_years")
    
    if not post_id or not post_type or not content:
        return jsonify({"ok": False, "error": "Missing fields"}), 400

    if len(content) > VALIDATION_LIMITS['post_content']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_content_too_long", "limit": VALIDATION_LIMITS['post_content']}}), 400
    
    if len(full_description) > VALIDATION_LIMITS['post_full_description']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_full_description_too_long", "limit": VALIDATION_LIMITS['post_full_description']}}), 400
        
    if len(skill_tags_json) > VALIDATION_LIMITS['post_skills_json']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_skills_too_long", "limit": VALIDATION_LIMITS['post_skills_json']}}), 400
        
    # --- ОБНОВЛЕНО: Валидация опыта ---
    if experience_years and len(str(experience_years)) > VALIDATION_LIMITS['post_experience']:
        return jsonify({"ok": False, "error": "validation", "details": {"key": "error_post_experience_too_long", "limit": VALIDATION_LIMITS['post_experience']}}), 400

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
        
        # --- ОБНОВЛЕНО: Update experience_years ---
        cursor.execute(
            "UPDATE posts SET post_type = ?, content = ?, full_description = ?, skill_tags = ?, experience_years = ? WHERE post_id = ?",
            (post_type, content, full_description, skill_tags_json, experience_years, post_id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({"ok": True})
    except Exception as e:
        print(f"❌ ОШИБКА /api/update-post: {e}")
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

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
        return jsonify({"ok": True})
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/set-status", methods=["POST"])
def set_status():
    data = request.json
    user_id = validate_init_data(data.get("initData"), BOT_TOKEN)
    if not user_id: return jsonify({"ok": False, "error": "Invalid data"}), 403

    new_status = data.get("status")
    allowed_statuses = ['networking', 'open_to_work', 'hiring', 'open_to_gigs', 'busy']
    
    if new_status not in allowed_statuses:
        return jsonify({"ok": False, "error": "Invalid status"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE profiles SET status = ? WHERE user_id = ?", (new_status, user_id))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    print("[SECURITY] Security fixes enabled: MAX_CONTENT_LENGTH, file MIME check, table whitelist")
    app.run("0.0.0.0", port=APP_PORT, threaded=True)