import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FOLDER = Path(__file__).parent


def draw_bill(lines):
    image = Image.new("RGB", (1400, 600), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=40)
    y = 50
    for line in lines:
        draw.text((50, y), line, fill="black", font=font)
        y += 80
    return image


def make_messy(image):
    """Imitate a phone photo: slight tilt, blur and speckle noise."""
    random.seed(1)
    image = image.rotate(2, expand=True, fillcolor="white")
    image = image.filter(ImageFilter.GaussianBlur(1.2))
    pixels = image.load()
    for _ in range(6000):
        x, y = random.randrange(image.width), random.randrange(image.height)
        g = random.randint(0, 255)
        pixels[x, y] = (g, g, g)
    return image


ppf = draw_bill(["PUBLIC PROVIDENT FUND (PPF) DEPOSIT RECEIPT",
                 "Date: 2026-03-20", "Amount paid: 1,00,000"])
health = draw_bill(["HEALTH INSURANCE PREMIUM RECEIPT",
                    "Date: 2026-06-10", "Premium paid: 18,500"])
lic = draw_bill(["LIC LIFE INSURANCE PREMIUM RECEIPT",
                 "Date: 2026-01-15", "Premium paid: 30,000"])

ppf.save(FOLDER / "scan_ppf_clean.png")                # clean image
make_messy(health).save(FOLDER / "scan_health_messy.png")   # phone-photo style
lic.save(FOLDER / "scan_lic.pdf")                      # PDF that is only a picture
print("Created scan_ppf_clean.png, scan_health_messy.png, scan_lic.pdf")