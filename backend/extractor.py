import re
import pdfplumber
from validators import validate_pan

AMOUNT = r"(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)"
PAN = r"([A-Z]{5}[0-9]{4}[A-Z])"
TAN = r"([A-Z]{4}[0-9]{5}[A-Z])"
YEAR = r"(\d{4}\s*-\s*\d{2,4})"


def label(text):
    """Pattern for 'some label: amount'."""
    return text + r"[^:\n]*:\s*" + AMOUNT


# For each field: a list of patterns, tried in order.
# The first one that matches wins.
FIELD_PATTERNS = {
    "employee_name": [r"Name and address of the Employee\s*:\s*(.+)",
                      r"Name of (?:the )?Employee\s*:\s*(.+)"],
    "employee_pan": [r"PAN of the Employee\s*:\s*" + PAN,
                     r"Employee PAN(?: No\.?)?\s*:\s*" + PAN],
    "employer_name": [r"Name and address of the Employer\s*:\s*(.+)",
                      r"Name of (?:the )?Employer\s*:\s*(.+)"],
    "employer_tan": [r"TAN of the (?:Deductor|Employer)\s*:\s*" + TAN,
                     r"TAN of Employer\s*:\s*" + TAN],
    "assessment_year": [r"Assessment Year\s*:\s*" + YEAR,
                        r"A\.Y\.\s*:\s*" + YEAR],
    "gross_salary": [label(r"Gross Salary"), label(r"Total Emoluments")],
    "standard_deduction": [label(r"Standard deduction"),
                           label(r"Std\.? Deduction")],
    "salary_income": [label(r"Income chargeable under the head Salaries"),
                      label(r"Income under the head Salaries")],
    "chapter_via_deductions": [label(r"Total deductions under Chapter VI-?A"),
                               label(r"Aggregate of deductible amount under Chapter VI-?A")],
    "taxable_income": [label(r"Total taxable income")],
    "tax_on_income": [label(r"Tax on total income")],
    "cess": [label(r"Health and education cess"),
             label(r"Education cess")],
    "total_tax_payable": [label(r"Net tax payable"),
                          label(r"Tax payable")],
    "tds_deducted": [label(r"Total tax deducted"),
                     label(r"Total TDS deducted")],
}

AMOUNT_FIELDS = {
    "gross_salary", "standard_deduction", "salary_income",
    "chapter_via_deductions", "taxable_income", "tax_on_income",
    "cess", "total_tax_payable", "tds_deducted",
}


def extract_text(pdf_path):
    """Read all the text from a PDF."""
    with pdfplumber.open(pdf_path) as pdf:
        return "\n".join((page.extract_text() or "") for page in pdf.pages)


def extract_fields(text):
    """Find each field in the text. Returns value and confidence for each."""
    fields = {}
    for name, patterns in FIELD_PATTERNS.items():
        value, confidence = None, 0.0
        for index, pattern in enumerate(patterns):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                # first pattern = expected wording, later = backup wording
                confidence = 0.95 if index == 0 else 0.75
                break
        if value is not None:
            if name in AMOUNT_FIELDS:
                value = float(value.replace(",", ""))
            elif name in ("employee_pan", "employer_tan"):
                value = value.upper()
        fields[name] = {"value": value, "confidence": confidence}
    return fields


def run_checks(fields):
    """Look for missing or suspicious values. Returns a list of warnings."""
    warnings = []

    def v(key):
        return fields[key]["value"]

    missing = [k for k, f in fields.items() if f["value"] is None]
    if missing:
        warnings.append("Could not find: " + ", ".join(missing))

    if v("employee_pan") and not validate_pan(v("employee_pan"))["valid"]:
        warnings.append("Employee PAN does not look valid")

    # Simple Form 16s: gross salary minus standard deduction = salary income
    if None not in (v("gross_salary"), v("standard_deduction"), v("salary_income")):
        if abs(v("gross_salary") - v("standard_deduction") - v("salary_income")) > 1:
            warnings.append("Gross salary minus standard deduction does not equal "
                            "income under Salaries (exempt allowances may explain this, please check)")

    if None not in (v("tax_on_income"), v("cess"), v("total_tax_payable")):
        if abs(v("tax_on_income") + v("cess") - v("total_tax_payable")) > 1:
            warnings.append("Tax on income plus cess does not equal net tax payable "
                            "(a rebate or relief may explain this, please check)")

    return warnings