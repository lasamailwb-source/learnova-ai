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
import io
import os
import json

# -------------------------------------
# APP CONFIG
# -------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "learnova-secret-key"        # Change if you want
USER_DB = "users.json"

# -------------------------------------
# OPENAI CLIENT
# -------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -------------------------------------
# USER ACCOUNT FUNCTIONS
# -------------------------------------
def load_users():
    """Load user database from JSON."""
    if not os.path.exists(USER_DB):
        return {}
    try:
        with open(USER_DB, "r") as f:
            return json.load(f)
    except:
        return {}


def save_users(data):
    """Save user database to JSON."""
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
# ROUTE: REGISTER
# -------------------------------------
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    if not username or not password:
        return "Invalid input."

    users = load_users()

    if username in users:
        return "User already exists."

    users[username] = {"password": password}
    save_users(users)

    return redirect("/login")


# -------------------------------------
# ROUTE: LOGIN
# -------------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    users = load_users()

    if username in users and users[username]["password"] == password:
        session["username"] = username
        return redirect("/")

    return "Invalid username or password."


# -------------------------------------
# ROUTE: LOGOUT
# -------------------------------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# -------------------------------------
# HOME PAGE (PROTECTED)
# -------------------------------------
@app.route("/")
@login_required
def home():
    return render_template("index.html")


# -------------------------------------
# READER VIEW PAGE (PROTECTED)
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

        # Check text input
        if "text" in request.form and request.form["text"].strip():
            text_content = request.form["text"].strip()

        # Otherwise process uploaded file
        elif "file" in request.files:
            file = request.files["file"]
            filename = file.filename or ""

            file_stream = io.BytesIO(file.read())
            file_bytes = file_stream.getvalue()

            if not file_bytes or len(file_bytes) < 100:
                return jsonify({"error": "Uploaded file is empty or unreadable"}), 400

            text_content = extract_text_from_bytes(file_bytes, filename)

        # Validate
        if not isinstance(text_content, str):
            return jsonify({"error": "Internal text extraction error"}), 500

        clean_text = text_content.strip()

        if (
            not clean_text
            or len(clean_text) < 20
            or clean_text.startswith("[Error]")
            or clean_text.startswith("[Warning]")
        ):
            return jsonify({"error": "No text or file content found"}), 400

        # Generate summary + keywords
        summary = summarize_text(client, clean_text)
        keywords = extract_keywords(client, summary)

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
            return jsonify({"error": "Summary text is required"}), 400

        quiz = generate_quiz(client, summary, question_count=question_count)
        return jsonify({"quiz": quiz}), 200

    except Exception as e:
        print("❌ ERROR in /api/generate_quiz:", e)
        return jsonify({"error": str(e)}), 500


# -------------------------------------
# SERVER RUN
# -------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
