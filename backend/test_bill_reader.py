from bill_reader import classify, find_amount, find_date, summarize_bills


def test_ppf_is_80c():
    category, confidence, problem = classify("PUBLIC PROVIDENT FUND (PPF) DEPOSIT RECEIPT")
    assert category == "investment_80c" and confidence == 0.9


def test_health_insurance_is_80d():
    assert classify("Health insurance premium receipt")[0] == "health_insurance"


def test_life_insurance_is_80c_not_health():
    assert classify("LIC LIFE INSURANCE PREMIUM RECEIPT")[0] == "investment_80c"


def test_unknown_bill_has_no_category():
    category, confidence, problem = classify("GROCERY BILL Total: 850")
    assert category is None and problem is not None


def test_mixed_bill_is_ambiguous():
    category, confidence, problem = classify("Health insurance premium and PPF deposit")
    assert category is None and confidence == 0.5


def test_amount_with_indian_commas():
    assert find_amount("Amount paid: 1,00,000") == 100000
    assert find_amount("Premium paid: Rs. 18,500") == 18500


def test_amount_missing():
    assert find_amount("nothing here") is None


def test_date_found():
    assert find_date("Date: 2026-04-30") == "2026-04-30"


def test_summary_adds_per_field_and_keeps_rent_separate():
    bills = [
        {"category": "investment_80c", "amount": 100000, "needs_review": False},
        {"category": "investment_80c", "amount": 30000, "needs_review": False},
        {"category": "health_insurance", "amount": 18500, "needs_review": False},
        {"category": "rent", "amount": 20000, "needs_review": False},
        {"category": None, "amount": 850, "needs_review": True},
    ]
    result = summarize_bills(bills)
    assert result["tax_input_suggestion"] == {"deduction_80c": 130000, "deduction_80d": 18500}
    assert result["rent_paid"] == 20000
    assert result["needs_review"] == 1