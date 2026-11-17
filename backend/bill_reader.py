import re

from ocr import read_any

# (category, readable name, keyword patterns, calculator field)
CATEGORIES = [
    ("rent", "Rent receipt", [r"rent receipt", r"received rent", r"rent paid"], None),
    ("health_insurance", "Health insurance premium (80D)",
     [r"health insurance", r"mediclaim", r"medical insurance"], "deduction_80d"),
    ("investment_80c", "80C investment",
     [r"\bppf\b", r"public provident fund", r"\belss\b", r"life insurance premium",
      r"\blic\b", r"national savings certificate", r"tuition fee"], "deduction_80c"),
    ("nps", "NPS contribution (80CCD(1B))",
     [r"national pension", r"\bnps\b"], "nps_80ccd_1b"),
    ("home_loan_interest", "Home loan interest (24(b))",
     [r"interest certificate", r"home loan", r"housing loan"], "home_loan_interest"),
]

AMOUNT_PATTERN = re.compile(
    r"(?:total amount|amount paid|premium paid|rent paid|interest paid|"
    r"contribution amount|total)[^:\n]*:\s*(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE)
DATE_PATTERN = re.compile(
    r"(?:date|dated)\s*:\s*(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", re.IGNORECASE)


def classify(text):
    """Pick the bill category by counting keyword matches."""
    scores = {}
    for key, name, patterns, field in CATEGORIES:
        hits = sum(1 for p in patterns if re.search(p, text, re.IGNORECASE))
        if hits:
            scores[key] = hits
    if not scores:
        return None, 0.0, "No known bill type found"
    best = max(scores.values())
    winners = [k for k, v in scores.items() if v == best]
    if len(winners) > 1:
        return None, 0.5, "Matches more than one bill type: " + ", ".join(winners)
    return winners[0], 0.9, None


def find_amount(text):
    match = AMOUNT_PATTERN.search(text)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def find_date(text):
    match = DATE_PATTERN.search(text)
    return match.group(1) if match else None


def read_bill(path, filename):
    text, method = read_any(path)
    if not text.strip():
        if method == "ocr_unavailable":
            message = "This looks like a scan or photo, but OCR (Tesseract) is not installed"
        else:
            message = "No readable text found in this file"
        return {"filename": filename, "method": method, "error": message}

    category, confidence, problem = classify(text)
    amount = find_amount(text)
    needs_review = category is None or amount is None or method == "ocr"
    return {
        "filename": filename,
        "method": method,
        "category": category,
        "category_confidence": confidence,
        "amount": amount,
        "date": find_date(text),
        "needs_review": needs_review,
        "problem": problem if category is None else (None if amount else "Amount not found"),
    }


def summarize_bills(bills):
    """Add up amounts per calculator field."""
    field_of = {key: field for key, name, patterns, field in CATEGORIES}
    totals = {}
    rent_paid = 0.0
    needs_review = 0
    for bill in bills:
        if bill.get("error") or bill.get("needs_review"):
            needs_review += 1
            continue
        if bill["category"] == "rent":
            rent_paid += bill["amount"]
            continue
        field = field_of[bill["category"]]
        totals[field] = totals.get(field, 0) + bill["amount"]
    return {
        "bills": bills,
        "tax_input_suggestion": totals,
        "rent_paid": rent_paid,
        "needs_review": needs_review,
        "note": ("Please review every bill. Limits such as the 80C cap are applied by the "
                 "calculator. Rent paid is not the same as the HRA exemption."),
    }