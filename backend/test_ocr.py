from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont

from ocr import preprocess, read_any, ocr_available

DATA = Path(__file__).parent.parent / "data"
needs_tesseract = pytest.mark.skipif(not ocr_available(),
                                     reason="Tesseract is not installed")
LINES = ["PPF DEPOSIT RECEIPT", "Date: 2026-03-20", "Amount paid: 1,00,000"]


def make_image(lines):
    image = Image.new("RGB", (1400, 500), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=40)
    y = 50
    for line in lines:
        draw.text((50, y), line, fill="black", font=font)
        y += 80
    return image


def test_preprocess_makes_grey_and_large():
    result = preprocess(Image.new("RGB", (600, 300), "white"))
    assert result.mode == "L"
    assert result.width >= 1500


def test_digital_pdf_does_not_need_ocr():
    text, method = read_any(DATA / "bill_ppf.pdf")
    assert method == "text"
    assert "PPF" in text


@needs_tesseract
def test_ocr_reads_clean_image(tmp_path):
    path = tmp_path / "scan.png"
    make_image(LINES).save(path)
    text, method = read_any(path)
    assert method == "ocr"
    assert "PPF" in text.upper()
    assert "1,00,000" in text


@needs_tesseract
def test_ocr_reads_scanned_pdf(tmp_path):
    path = tmp_path / "scan.pdf"
    make_image(LINES).save(path)
    text, method = read_any(path)
    assert method == "ocr"
    assert "1,00,000" in text