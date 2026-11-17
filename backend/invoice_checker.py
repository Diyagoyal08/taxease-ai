import re
from datetime import date, datetime

from validators import validate_gstin

GST2_START = date(2025, 9, 22)  # GST 2.0 rates start [verify on the GST portal]
RATES_AFTER = {0, 0.25, 3, 5, 18, 40}
RATES_BEFORE = {0, 0.25, 3, 5, 12, 18, 28}
INVOICE_NO = re.compile(r"^[A-Za-z0-9/-]{1,16}$")


def close(a, b):
    """Two amounts are equal if they differ by at most 1 rupee."""
    return abs(a - b) <= 1


def check_invoice(inv, today=None):
    """Check one invoice. Returns a list of issues."""
    today = today or date.today()
    issues = []

    def add(severity, code, message):
        issues.append({"severity": severity, "code": code, "message": message})

    # 1. invoice number
    number = str(inv.get("invoice_no") or "").strip()
    if not INVOICE_NO.match(number):
        add("error", "INVOICE_NO",
            "Invoice number must be 1 to 16 characters: letters, digits, / or -")

    # 2. date
    invoice_date = None
    try:
        invoice_date = datetime.strptime(str(inv.get("invoice_date")), "%Y-%m-%d").date()
    except ValueError:
        add("error", "DATE", "Date must be in YYYY-MM-DD format")
    if invoice_date and invoice_date > today:
        add("error", "DATE_FUTURE", "Invoice date is in the future")

    # 3. GSTINs (reuses the Step 4 validator)
    supplier = validate_gstin(inv.get("supplier_gstin") or "")
    if not supplier["valid"]:
        add("error", "SUPPLIER_GSTIN", "Supplier GSTIN: " + "; ".join(supplier["errors"]))

    buyer = None
    if inv.get("buyer_gstin"):
        buyer = validate_gstin(inv["buyer_gstin"])
        if not buyer["valid"]:
            add("error", "BUYER_GSTIN", "Buyer GSTIN: " + "; ".join(buyer["errors"]))

    # 4. GST rate allowed on this date?
    rate = float(inv.get("gst_rate") or 0)
    if invoice_date:
        allowed = RATES_AFTER if invoice_date >= GST2_START else RATES_BEFORE
        if rate not in allowed:
            add("warning", "RATE_CHECK",
                f"Rate {rate}% is unusual for an invoice dated {invoice_date}. "
                "Check the item's HSN code (12% and 28% ended on 22 Sep 2025 for most items)")

    # 5. CGST/SGST or IGST?
    cgst = float(inv.get("cgst") or 0)
    sgst = float(inv.get("sgst") or 0)
    igst = float(inv.get("igst") or 0)
    supplier_state = supplier["state_code"]
    place = inv.get("place_of_supply") or (buyer["state_code"] if buyer else None)

    if supplier_state and place:
        if supplier_state == place:
            if abs(igst) > 1 or not close(cgst, sgst):
                add("error", "WRONG_TAX_TYPE",
                    "Same-state sale should have equal CGST and SGST and no IGST")
        else:
            if abs(cgst) > 1 or abs(sgst) > 1:
                add("error", "WRONG_TAX_TYPE",
                    "Different-state sale should have only IGST")
    elif supplier_state:
        add("warning", "PLACE_OF_SUPPLY",
            "Place of supply is missing, so the tax type could not be checked")

    # 6. arithmetic
    taxable = float(inv.get("taxable_value") or 0)
    expected_tax = taxable * rate / 100
    actual_tax = cgst + sgst + igst
    if not close(expected_tax, actual_tax):
        add("error", "TAX_AMOUNT",
            f"Tax should be about {expected_tax:.2f} ({rate}% of {taxable:.2f}) "
            f"but the invoice shows {actual_tax:.2f}")

    total = float(inv.get("total") or 0)
    if not close(taxable + actual_tax, total):
        add("error", "TOTAL",
            f"Total should be {taxable + actual_tax:.2f} but the invoice shows {total:.2f}")

    return issues


def check_batch(invoices, today=None):
    """Check many invoices, including duplicate detection."""
    seen = set()
    results = []
    total_taxable = 0.0
    total_gst = 0.0

    for position, inv in enumerate(invoices, start=1):
        issues = check_invoice(inv, today)

        key = (str(inv.get("supplier_gstin") or "").strip().upper(),
               str(inv.get("invoice_no") or "").strip().upper())
        if key in seen:
            issues.append({"severity": "error", "code": "DUPLICATE",
                           "message": "This supplier and invoice number appeared earlier in the list"})
        seen.add(key)

        total_taxable += float(inv.get("taxable_value") or 0)
        total_gst += (float(inv.get("cgst") or 0) + float(inv.get("sgst") or 0)
                      + float(inv.get("igst") or 0))

        results.append({
            "position": position,
            "invoice_no": inv.get("invoice_no"),
            "ok": not any(i["severity"] == "error" for i in issues),
            "issues": issues,
        })

    return {
        "summary": {
            "invoices": len(results),
            "with_errors": sum(1 for r in results if not r["ok"]),
            "total_taxable_value": round(total_taxable, 2),
            "total_gst": round(total_gst, 2),
        },
        "results": results,
    }