from extractor import extract_fields, run_checks

GOOD_TEXT = """
PAN of the Employee: ABCPE1234F
Gross Salary: 15,00,000
Standard deduction under section 16(ia): 75,000
Income chargeable under the head Salaries: 14,25,000
Tax on total income: 93,750
Health and education cess: 3,750
Net tax payable: 97,500
"""


def test_reads_amounts_with_commas():
    fields = extract_fields(GOOD_TEXT)
    assert fields["gross_salary"]["value"] == 1500000
    assert fields["gross_salary"]["confidence"] == 0.95


def test_reads_pan():
    fields = extract_fields(GOOD_TEXT)
    assert fields["employee_pan"]["value"] == "ABCPE1234F"


def test_missing_field_is_reported():
    fields = extract_fields("Standard deduction under section 16(ia): 75,000")
    assert fields["gross_salary"]["value"] is None
    warnings = run_checks(fields)
    assert any("gross_salary" in w for w in warnings)


def test_inconsistent_numbers_give_warning():
    text = GOOD_TEXT.replace("Net tax payable: 97,500", "Net tax payable: 50,000")
    warnings = run_checks(extract_fields(text))
    assert any("equal net tax payable" in w for w in warnings)

def test_total_emoluments_counts_as_gross_salary():
    fields = extract_fields("Total Emoluments: 1800000")
    assert fields["gross_salary"]["value"] == 1800000
    assert fields["gross_salary"]["confidence"] == 0.75


def test_the_second_sample_form16_is_read_completely():
    from pathlib import Path

    from extractor import extract_text

    text = extract_text(Path(__file__).parent.parent / "data" / "sample_form16_b.pdf")
    fields = extract_fields(text)
    assert fields["gross_salary"]["value"] == 1800000
    assert run_checks(fields) == []
