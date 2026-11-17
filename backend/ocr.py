import os
from pathlib import Path

import pdfplumber
import pytesseract
from PIL import Image, ImageOps

from extractor import extract_text

DEFAULT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(DEFAULT_PATH):
    pytesseract.pytesseract.tesseract_cmd = DEFAULT_PATH

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")


def ocr_available():
    """True if the Tesseract program can be found."""
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def preprocess(image):
    """Make a picture easier for OCR: upright, grey, large, high contrast."""
    image = ImageOps.exif_transpose(image)   # fixes sideways phone photos
    image = image.convert("L")               # grayscale
    if image.width < 1500:                   # small text is read badly
        scale = 1500 / image.width
        image = image.resize((int(image.width * scale), int(image.height * scale)))
    return ImageOps.autocontrast(image)


def ocr_image(image):
    return pytesseract.image_to_string(preprocess(image), config="--psm 6")


def read_any(path):
    """Get text from a PDF or an image. Returns (text, method).

    method is 'text' (real text in a PDF), 'ocr', or 'ocr_unavailable'.
    """
    suffix = Path(path).suffix.lower()

    if suffix in IMAGE_EXTENSIONS:
        if not ocr_available():
            return "", "ocr_unavailable"
        with Image.open(path) as image:
            return ocr_image(image), "ocr"

    text = extract_text(path)          # try real text first, it is exact
    if text.strip():
        return text, "text"

    if not ocr_available():            # scanned PDF, but no OCR program
        return "", "ocr_unavailable"

    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(ocr_image(page.to_image(resolution=300).original))
    return "\n".join(pages), "ocr"