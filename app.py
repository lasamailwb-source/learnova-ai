from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    redirect,
    url_for,
    session
)
from openai import OpenAI
from utils import (
    extract_text_from_bytes,
    summarize_text,
    extract_keywords,
    generate_quiz,
)
from datetime import datetime
from models import SessionLocal, ActivityLog, UserHistory
import io
import os
import json

# -------------------------------------
# APP CONFIG
# -------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "learnova-secret-key"  # change if you like
USER_DB = "users.json"

# -------------------------------------
# OPENAI CLIENT
# -------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# -------------------------------------
# USER ACCOUNT FUNCTIONS (JSON)
# -------------------------------------
def load_users():
    if not os.path.exists(USER_DB):
        return {}
    try:
        with open(USER_DB, "r") as f:
            return json.load(f)
    except:
        return {}


def save_users(data):
    with open(USER_DB, "w") as f:
        json.dump(data, f, indent=4)


# -------------------------------------
# LOGIN REQUIRED DECORATOR
# -------------------------------------
def login_required(func):
    def wrapper(*args, **kwargs):
        if "username" not in session:
            return redirect("/login")
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


# -------------------------------------
# DB LOGGING HELPERS
# -------------------------------------
def log_action(action, input_length=0, output_length=0, ip="Unknown"):
    """General system log into activity_logs."""
    try:
        db = SessionLocal()
        row = ActivityLog(
            action=action,
            input_length=input_length,
            output_length=output_length,
            ip_address=ip,
            timestamp=datetime.now().isoformat()
        )
        db.add(row)
        db.commit()
    except Exception as e:
        print("⚠️ Logging failed:", e)
    finally:
        db.close()


def log_user_history(username, action, input_text="", output_text=""):
    """Per-user history into user_history."""
    if not username:
        return
    try:
        db = SessionLocal()
        row = UserHistory(
            username=username,
            action=action,
            input_preview=(input_text or "")[:2000],
            output_preview=(output_text or "")[:4000],
            timestamp=datetime.now().isoformat()
        )
        db.add(row)
        db.commit()
    except Exception as e:
        print("⚠️ User history logging failed:", e)
    finally:
        db.close()


# -------------------------------------
# ROUTE: REGISTER
# -------------------------------------
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    if not username or not password:
        return render_template("register.html", error="Username and password required")

    users = load_users()

    if username in users:
        return render_template("register.html", error="User already exists")

    users[username] = {"password": password}
    save_users(users)

    return redirect("/login")


# -------------------------------------
# ROUTE: LOGIN
# -------------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if "username" in session:
            return redirect("/")
        return render_template("login.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    users = load_users()

    if username in users and users[username]["password"] == password:
        session["username"] = username
        return redirect("/")

    return render_template("login.html", error="Invalid username or password")


# -------------------------------------
# ROUTE: LOGOUT
# -------------------------------------
@app.route("/logout")
@login_required
def logout():
    session.clear()
    return redirect("/login")


# -------------------------------------
# HOME PAGE (DASHBOARD)
# -------------------------------------
@app.route("/")
@login_required
def home():
    return render_template("index.html", username=session.get("username"))


# -------------------------------------
# USER HISTORY PAGE
# -------------------------------------
@app.route("/history")
@login_required
def history():
    username = session.get("username")
    db = SessionLocal()
    try:
        records = (
            db.query(UserHistory)
            .filter(UserHistory.username == username)
            .order_by(UserHistory.id.desc())
            .limit(50)
            .all()
        )
    finally:
        db.close()

    return render_template("history.html", username=username, history=records)


# -------------------------------------
# READER VIEW PAGE
# -------------------------------------
@app.route("/reader-view")
@login_required
def reader_view():
    return render_template("reader_view.html")


# -------------------------------------
# HEALTH CHECK
# -------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "OK"}), 200


# -------------------------------------
# SUMMARIZATION ENDPOINT
# -------------------------------------
@app.route("/api/processnotes", methods=["POST"])
@login_required
def process_notes():
    try:
        text_content = ""

        # Direct text input
        if "text" in request.form and request.form["text"].strip():
            text_content = request.form["text"].strip()

        # Uploaded file
        elif "file" in request.files:
            file = request.files["file"]
            filename = file.filename or ""

            file_stream = io.BytesIO(file.read())
            file_bytes = file_stream.getvalue()

            if not file_bytes or len(file_bytes) < 50:
                return jsonify({"error": "Uploaded file is empty or unreadable"}), 400

            text_content = extract_text_from_bytes(file_bytes, filename)

        clean_text = (text_content or "").strip()

        if not clean_text or len(clean_text) < 10:
            return jsonify({"error": "No usable text found"}), 400

        # Process content
        summary = summarize_text(client, clean_text)
        keywords = extract_keywords(client, summary)

        # System-wide log
        log_action(
            action="summarize",
            input_length=len(clean_text),
            output_length=len(summary),
            ip=request.remote_addr
        )

        # Per-user history log
        log_user_history(
            username=session.get("username"),
            action="summarize",
            input_text=clean_text,
            output_text=summary
        )

        return jsonify({"summary": summary, "keywords": keywords}), 200

    except Exception as e:
        print("❌ ERROR in /api/processnotes:", e)
        return jsonify({"error": str(e)}), 500


# -------------------------------------
# QUIZ GENERATION ENDPOINT
# -------------------------------------
@app.route("/api/generate_quiz", methods=["POST"])
@login_required
def api_generate_quiz():
    try:
        data = request.get_json(silent=True) or {}
        summary = (data.get("summary") or "").strip()
        question_count = int(data.get("question_count") or 10)

        if not summary:
            return jsonify({"error": "Summary text required"}), 400

        quiz = generate_quiz(client, summary, question_count=question_count)

        # System log
        log_action(
            action="generate_quiz",
            input_length=len(summary),
            output_length=len(quiz),
            ip=request.remote_addr
        )

        # Per-user history log
        log_user_history(
            username=session.get("username"),
            action="generate_quiz",
            input_text=summary,
            output_text=quiz
        )

        return jsonify({"quiz": quiz}), 200

    except Exception as e:
        print("❌ ERROR in /api_generate_quiz:", e)
        return jsonify({"error": str(e)}), 500


# -------------------------------------
# SERVER RUN
# -------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
