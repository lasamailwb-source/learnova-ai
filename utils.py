# 📘 Learnova AI Assistant - Backend Utility Functions (FINAL SMART STRUCTURED VERSION)

import io
from typing import List
from PIL import Image
import pytesseract
import docx
from PyPDF2 import PdfReader

# ✅ Tesseract OCR path (update if installed elsewhere)
pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"


# ========== 1️⃣ FILE TEXT EXTRACTION ==========
def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extract text from uploaded file bytes.
    Supports: .txt, .pdf, .docx, .jpg/.jpeg/.png/.bmp/.tiff
    Uses OCR for image-based PDFs automatically.
    """
    if not file_bytes:
        return ""

    name = (filename or "").lower()

    # ----- TXT -----
    if name.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    # ----- PDF -----
    if name.endswith(".pdf"):
        try:
            from pdf2image import convert_from_bytes
        except ImportError:
            convert_from_bytes = None

        text_parts = []
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    text_parts.append(text)
        except Exception:
            text_parts = []

        if text_parts:
            return "\n".join(text_parts)

        # OCR fallback for image-based PDFs
        if convert_from_bytes:
            try:
                images = convert_from_bytes(file_bytes)
                ocr_results = [pytesseract.image_to_string(img) for img in images]
                combined = "\n".join(ocr_results).strip()
                if combined:
                    return combined
            except Exception as e:
                print("⚠️ OCR PDF extraction failed:", e)

        return ""

    # ----- DOCX -----
    if name.endswith(".docx"):
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            return ""

    # ----- IMAGE (JPG, PNG, etc.) -----
    if any(name.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]):
        try:
            image = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(image)
        except Exception:
            return ""

    # ----- Fallback -----
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ========== 2️⃣ AI STRUCTURED SUMMARIZATION ==========
def summarize_text(client, text: str) -> str:
    """
    Generate a topic-based, structured summary using AI.
    The AI automatically detects logical sections and creates headings.
    The summary length scales with input size.
    """
    text = (text or "").strip()
    if not text:
        return ""

    # Adjust length dynamically
    word_count = len(text.split())
    if word_count < 300:
        detail = "short (about 1–2 concise paragraphs)"
        max_tokens = 300
    elif word_count < 1000:
        detail = "medium (3–5 structured paragraphs)"
        max_tokens = 600
    else:
        detail = "detailed (5–10 paragraphs with topic sections)"
        max_tokens = 900

    prompt = f"""
You are an academic summarization assistant.

Your goal: produce an intelligent, topic-based summary that automatically detects key sections.

Instructions:
• Detect the main themes in the text and create appropriate section titles.
• Under each section, summarize in clear bullet points or short sentences.
• Highlight key terms using CAPITALIZATION (avoid markdown like * or **).
• Ensure logical flow and clarity.
• Adjust summary size to match text length ({detail}).
• Avoid repeating the same idea in different sections.
• Keep the language neutral, factual, and easy to study.

Example format:
---
Photosynthesis in Plants:
• Plants convert sunlight into chemical energy.
• Chlorophyll absorbs light to start the reaction.

Importance for the Ecosystem:
• Produces oxygen essential for life.
• Reduces atmospheric carbon dioxide.
---

Now summarize the following text accordingly:
{text[:9000]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[Summarization failed: {e}]"


# ========== 3️⃣ KEYWORD EXTRACTION ==========
def extract_keywords(client, summary: str, max_keywords: int = 12) -> List[str]:
    """Extract key academic terms or concepts from summary text."""
    summary = (summary or "").strip()
    if not summary:
        return []

    prompt = (
        f"Extract up to {max_keywords} important keywords or phrases "
        f"from the following summary. Return only a comma-separated list:\n\n{summary}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        items = [w.strip() for w in raw.replace("\n", " ").split(",") if len(w.strip()) > 2]
        seen, unique = set(), []
        for k in items:
            if k.lower() not in seen:
                seen.add(k.lower())
                unique.append(k)
        return unique
    except Exception:
        return []


# ========== 4️⃣ QUIZ GENERATION ==========
def generate_quiz(client, summary: str, question_count: int = 12) -> str:
    """Generate quiz questions from the AI-generated summary."""
    summary = (summary or "").strip()
    if not summary:
        return ""

    prompt = (
        f"Create about {question_count} study questions from the following text. "
        f"Include a mix of multiple-choice and short-answer types. "
        f"Each MCQ should have 4 options labeled (A–D). "
        f"At the end, include an 'Answer Key' listing correct answers.\n\n"
        f"Text:\n{summary}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[Quiz generation failed: {e}]"
