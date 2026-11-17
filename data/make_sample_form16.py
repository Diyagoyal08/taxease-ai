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


# Sample A: standard wording
make_pdf("sample_form16_a.pdf", [
    "FORM NO. 16 - PART A",
    "Name and address of the Employer: Sample Tech Pvt Ltd, Jaipur",
    "Name and address of the Employee: Riya Sharma, Jaipur",
    "PAN of the Employee: ABCPE1234F",
    "TAN of the Deductor: JPRS12345B",
    "Assessment Year: 2026-27",
    "Total tax deducted: 97,500",
    "",
    "PART B",
    "Gross Salary: 15,00,000",
    "Standard deduction under section 16(ia): 75,000",
    "Income chargeable under the head Salaries: 14,25,000",
    "Total deductions under Chapter VI-A: 0",
    "Total taxable income: 14,25,000",
    "Tax on total income: 93,750",
    "Health and education cess: 3,750",
    "Net tax payable: 97,500",
])

# Sample B: different wording, same kind of information
make_pdf("sample_form16_b.pdf", [
    "FORM NO. 16 - PART A",
    "Name of Employer: Demo Traders LLP",
    "Name of Employee: Arjun Mehta",
    "Employee PAN No.: AXYPM5678Q",
    "TAN of Employer: BLRD54321C",
    "A.Y.: 2026-27",
    "Total TDS deducted: 150800",
    "",
    "PART B",
    "Total Emoluments: 1800000",
    "Std. Deduction u/s 16(ia): 75000",
    "Income under the head Salaries: 1725000",
    "Aggregate of deductible amount under Chapter VI-A: 0",
    "Total Taxable Income: 1725000",
    "Tax on total income: 145000",
    "Education Cess: 5800",
    "Tax payable: 150800",
])

print("Created sample_form16_a.pdf and sample_form16_b.pdf")