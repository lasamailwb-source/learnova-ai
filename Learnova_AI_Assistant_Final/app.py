from flask import Flask, request, jsonify, render_template
from openai import OpenAI
from utils import (
    extract_text_from_bytes,
    summarize_text,
    extract_keywords,
    generate_quiz,
)
import io
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

# ✅ Load OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# 🏠 Home route
@app.route("/")
def home():
    return render_template("index.html")


# 📰 Reader View route  ✅ (Added new route)
@app.route("/reader-view")
def reader_view():
    """Serves the separate Reader View page for displaying and reading summaries."""
    return render_template("reader_view.html")


# 🩺 Health check route
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "OK"}), 200


# 🧠 Summarization route
@app.route("/api/processnotes", methods=["POST"])
def process_notes():
    try:
        text_content = ""

        # 1️⃣ Check for text input
        if "text" in request.form and request.form["text"].strip():
            text_content = request.form["text"].strip()

        # 2️⃣ Otherwise, process uploaded file
        elif "file" in request.files:
            file = request.files["file"]
            filename = file.filename or ""

            # ✅ Fix: Always rebuffer stream into BytesIO before reading
            file_stream = io.BytesIO(file.read())
            file_bytes = file_stream.getvalue()

            print(f"DEBUG Uploaded file: {filename}, Bytes: {len(file_bytes)}")

            if not file_bytes or len(file_bytes) < 100:
                return jsonify({"error": "Uploaded file is empty or unreadable"}), 400

            # ✅ Extract text (PDF, DOCX, TXT, or image)
            text_content = extract_text_from_bytes(file_bytes, filename)

        # 3️⃣ Verify extraction result
        if not isinstance(text_content, str):
            print("DEBUG extract_text_from_bytes returned non-string:", type(text_content))
            return jsonify({"error": "Internal text extraction error"}), 500

        clean_text = text_content.strip()
        print("DEBUG Extracted text length:", len(clean_text))
        print("DEBUG First 200 chars:", clean_text[:200].replace("\n", " "))

        # 4️⃣ Validate before summarization
        if (
            not clean_text
            or len(clean_text) < 20
            or clean_text.startswith("[Error]")
            or clean_text.startswith("[Warning]")
        ):
            return jsonify({"error": "No text or file content found"}), 400

        # 5️⃣ Generate summary + keywords
        summary = summarize_text(client, clean_text)
        keywords = extract_keywords(client, summary)

        return jsonify({"summary": summary, "keywords": keywords}), 200

    except Exception as e:
        print("❌ ERROR in /api/processnotes:", e)
        return jsonify({"error": str(e)}), 500


# 🎯 Quiz generation
@app.route("/api/generate_quiz", methods=["POST"])
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


if __name__ == "__main__":
    # Run server
    app.run(host="0.0.0.0", port=5000, debug=False)
