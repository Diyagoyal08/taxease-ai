from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

FOLDER = Path(__file__).parent


def make_pdf(filename, lines):
    c = canvas.Canvas(str(FOLDER / filename), pagesize=A4)
    y = 800
    for line in lines:
        c.drawString(50, y, line)
        y -= 22
    c.save()


make_pdf("bill_rent.pdf", [
    "RENT RECEIPT",
    "Date: 2026-04-30",
    "Received rent from Riya Sharma for April 2026",
    "Landlord: Mohan Lal",
    "Rent paid: 20,000",
])
make_pdf("bill_health.pdf", [
    "HEALTH INSURANCE PREMIUM RECEIPT",
    "Date: 2026-06-10",
    "Policy: Mediclaim Family Floater",
    "Premium paid: 18,500",
])
make_pdf("bill_ppf.pdf", [
    "PUBLIC PROVIDENT FUND (PPF) DEPOSIT RECEIPT",
    "Date: 2026-03-20",
    "Amount paid: 1,00,000",
])
make_pdf("bill_lic.pdf", [
    "LIC LIFE INSURANCE PREMIUM RECEIPT",
    "Date: 2026-01-15",
    "Premium paid: 30,000",
])
make_pdf("bill_homeloan.pdf", [
    "HOME LOAN INTEREST CERTIFICATE",
    "Financial year: 2025-26",
    "Interest paid: 1,80,000",
])
make_pdf("bill_grocery.pdf", [
    "GROCERY BILL",
    "Date: 2026-10-02",
    "Total: 850",
])
print("Created 6 sample bills")