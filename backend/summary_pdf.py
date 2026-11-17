from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def rupees(amount):
    """Format a number in Indian style, e.g. 1425000 -> Rs. 14,25,000."""
    digits = f"{abs(round(amount)):d}"
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        digits = ",".join(parts + [tail])
    return ("-" if amount < 0 else "") + "Rs. " + digits


def missing_documents(data):
    """List the proofs a user should keep, based on what they claimed."""
    docs = []
    if data.get("tds_paid", 0) == 0:
        docs.append("Form 16 or Form 26AS to confirm the tax already deducted (TDS)")
    if data.get("deduction_80c", 0) > 0:
        docs.append("Proof of 80C investments (PPF, ELSS, LIC, EPF statement)")
    if data.get("deduction_80d", 0) > 0:
        docs.append("Health insurance premium receipt (80D)")
    if data.get("nps_80ccd_1b", 0) > 0:
        docs.append("NPS contribution statement")
    if data.get("hra_exemption", 0) > 0:
        docs.append("Rent receipts and landlord PAN if rent is high (HRA)")
    if data.get("home_loan_interest", 0) > 0:
        docs.append("Home loan interest certificate from the bank")
    return docs


def build_summary_pdf(result, data):
    """Build the PDF in memory and return its bytes."""
    styles = getSampleStyleSheet()
    new, old = result["new_regime"], result["old_regime"]
    story = []

    story.append(Paragraph("Tax Preparation Summary", styles["Title"]))
    story.append(Paragraph(f"Rules used: {result['rules_year']}", styles["Normal"]))
    story.append(Paragraph(
        "<b>Preliminary estimate. Verify with official rules or a tax "
        "professional before filing.</b>", styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Your inputs", styles["Heading2"]))
    inputs = [["Gross salary", rupees(data["gross_salary"])],
              ["Other income", rupees(data.get("other_income", 0))],
              ["TDS already paid", rupees(data.get("tds_paid", 0))]]
    story.append(Table(inputs, colWidths=[200, 200]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("New regime vs old regime", styles["Heading2"]))
    rows = [["", "New regime", "Old regime"],
            ["Taxable income", rupees(new["taxable_income"]), rupees(old["taxable_income"])],
            ["Tax on slabs", rupees(new["tax_on_slabs"]), rupees(old["tax_on_slabs"])],
            ["Rebate (87A)", rupees(new["rebate"]), rupees(old["rebate"])],
            ["Cess (4%)", rupees(new["cess"]), rupees(old["cess"])],
            ["Total tax", rupees(new["total_tax"]), rupees(old["total_tax"])],
            ["Net payable (negative = refund)",
             rupees(new["net_payable_or_refund"]), rupees(old["net_payable_or_refund"])]]
    table = Table(rows, colWidths=[200, 130, 130])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))

    regime_name = "new" if result["recommended"] == "new" else "old"
    story.append(Paragraph(
        f"<b>Lower tax: {regime_name} regime</b>, saving about {rupees(result['savings'])}.",
        styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("How the recommended figure was calculated", styles["Heading2"]))
    chosen = new if result["recommended"] == "new" else old
    for step in chosen["steps"]:
        story.append(Paragraph("- " + step, styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Documents to keep ready", styles["Heading2"]))
    docs = missing_documents(data)
    if docs:
        for item in docs:
            story.append(Paragraph("- " + item, styles["Normal"]))
    else:
        story.append(Paragraph("No extra documents identified from your inputs.", styles["Normal"]))

    buffer = BytesIO()
    SimpleDocTemplate(buffer, pagesize=A4).build(story)
    return buffer.getvalue()