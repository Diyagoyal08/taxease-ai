from datetime import date

from validators import gstin_check_char
from invoice_checker import check_invoice, check_batch

TODAY = date(2026, 11, 6)


def make_gstin(first14):
    return first14 + gstin_check_char(first14)


SELLER = make_gstin("08AAPFU0939F1Z")        # Rajasthan
BUYER_SAME = make_gstin("08AAACB1234C1Z")    # Rajasthan
BUYER_OTHER = make_gstin("27AAACB1234C1Z")   # Maharashtra


def good(**changes):
    inv = {"invoice_no": "INV-001", "invoice_date": "2026-10-05",
           "supplier_gstin": SELLER, "buyer_gstin": BUYER_SAME,
           "taxable_value": 10000, "gst_rate": 18,
           "cgst": 900, "sgst": 900, "igst": 0, "total": 11800}
    inv.update(changes)
    return inv


def codes(inv):
    return {i["code"] for i in check_invoice(inv, TODAY)}


def test_good_invoice_has_no_issues():
    assert check_invoice(good(), TODAY) == []


def test_interstate_invoice_with_igst_is_good():
    inv = good(buyer_gstin=BUYER_OTHER, cgst=0, sgst=0, igst=1800)
    assert check_invoice(inv, TODAY) == []


def test_wrong_tax_type():
    # buyer is in another state but CGST/SGST was charged
    assert "WRONG_TAX_TYPE" in codes(good(buyer_gstin=BUYER_OTHER))


def test_wrong_tax_amount():
    assert "TAX_AMOUNT" in codes(good(cgst=800, sgst=800, total=11600))


def test_wrong_total():
    assert "TOTAL" in codes(good(total=12000))


def test_rate_12_after_gst_2_is_flagged():
    inv = good(gst_rate=12, cgst=600, sgst=600, total=11200)
    assert "RATE_CHECK" in codes(inv)


def test_rate_12_before_gst_2_is_fine():
    inv = good(invoice_date="2025-08-10", gst_rate=12, cgst=600, sgst=600, total=11200)
    assert "RATE_CHECK" not in codes(inv)


def test_bad_supplier_gstin():
    last = "B" if SELLER[-1] == "A" else "A"
    assert "SUPPLIER_GSTIN" in codes(good(supplier_gstin=SELLER[:-1] + last))


def test_bad_date_format():
    assert "DATE" in codes(good(invoice_date="05-10-2026"))


def test_future_date():
    assert "DATE_FUTURE" in codes(good(invoice_date="2027-01-01"))


def test_invoice_number_too_long():
    assert "INVOICE_NO" in codes(good(invoice_no="INVOICE/2026/0000001"))


def test_duplicate_invoice_is_flagged():
    result = check_batch([good(), good()], TODAY)
    first = {i["code"] for i in result["results"][0]["issues"]}
    second = {i["code"] for i in result["results"][1]["issues"]}
    assert "DUPLICATE" not in first
    assert "DUPLICATE" in second