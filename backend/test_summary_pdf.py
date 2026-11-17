from summary_pdf import rupees, missing_documents, build_summary_pdf
from tax_engine import compare_regimes


def test_rupees_indian_format():
    assert rupees(97500) == "Rs. 97,500"
    assert rupees(1425000) == "Rs. 14,25,000"
    assert rupees(210600) == "Rs. 2,10,600"
    assert rupees(0) == "Rs. 0"


def test_missing_documents_follow_claims():
    docs = missing_documents({"deduction_80c": 150000, "hra_exemption": 100000, "tds_paid": 5000})
    assert any("80C" in d for d in docs)
    assert any("Rent receipts" in d for d in docs)
    assert not any("Form 16" in d for d in docs)


def test_no_tds_asks_for_form16():
    docs = missing_documents({"tds_paid": 0})
    assert any("Form 16" in d for d in docs)


def test_pdf_is_created():
    data = {"gross_salary": 1500000, "deduction_80c": 150000}
    pdf = build_summary_pdf(compare_regimes(data), data)
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 1000
    