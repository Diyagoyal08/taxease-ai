import pytest
from tax_engine import calculate_regime


def total(regime, **data):
    return calculate_regime(regime, data)["total_tax"]


def test_new_regime_15_lakh_salary():
    # hand calculation: 93,750 tax + 3,750 cess
    assert total("new", gross_salary=1500000) == pytest.approx(97500)


def test_new_regime_zero_tax_up_to_12_75_lakh_salary():
    # 12,75,000 - 75,000 = 12,00,000 taxable, rebate makes it zero
    assert total("new", gross_salary=1275000) == pytest.approx(0)


def test_new_regime_low_income():
    assert total("new", gross_salary=300000) == pytest.approx(0)


def test_new_regime_marginal_relief():
    # taxable 12,10,000: tax is limited to the 10,000 above 12 lakh, plus 4% cess
    assert total("new", gross_salary=1285000) == pytest.approx(10400)


def test_old_regime_with_80c():
    # 10,00,000 - 50,000 - 1,50,000 = 8,00,000 taxable
    # tax 72,500 + cess 2,900
    assert total("old", gross_salary=1000000, deduction_80c=150000) == pytest.approx(75400)


def test_old_regime_rebate_up_to_5_lakh():
    # 5,50,000 - 50,000 = 5,00,000 taxable, rebate makes it zero
    assert total("old", gross_salary=550000) == pytest.approx(0)


def test_80c_is_capped_at_1_5_lakh():
    a = total("old", gross_salary=1000000, deduction_80c=150000)
    b = total("old", gross_salary=1000000, deduction_80c=400000)
    assert a == pytest.approx(b)