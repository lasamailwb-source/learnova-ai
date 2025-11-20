import fitz, pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Change this to your actual test PDF path
pdf_path = r"C:\Users\admin\OneDrive\Desktop\Doc1.pdf"

doc = fitz.open(pdf_path)
print("Page count:", len(doc))

for i, page in enumerate(doc, start=1):
    text = page.get_text("text").strip()
    print(f"\nPage {i} text length:", len(text))
    if not text:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("L")
        ocr = pytesseract.image_to_string(img, lang="eng").strip()
        print(f"OCR page {i} length:", len(ocr))
