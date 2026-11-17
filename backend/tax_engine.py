# Tax rules for one year. Change these when the law changes.
RULES = {
    "year": "FY 2025-26 (AY 2026-27)",
    "cess_rate": 0.04,
    "new": {
        "standard_deduction": 75000,
        "slabs": [(400000, 0.00), (800000, 0.05), (1200000, 0.10),
                  (1600000, 0.15), (2000000, 0.20), (2400000, 0.25),
                  (None, 0.30)],
        "rebate_limit": 1200000,
        "rebate_max": 60000,
    },
    "old": {
        "standard_deduction": 50000,
        "slabs": [(250000, 0.00), (500000, 0.05), (1000000, 0.20),
                  (None, 0.30)],
        "rebate_limit": 500000,
        "rebate_max": 12500,
    },
    # Old regime deduction limits (simplified: person below 60 years)
    "limits": {
        "80c": 150000,
        "80ccd_1b": 50000,
        "80d": 25000,
        "home_loan_interest": 200000,
    },
}


def slab_tax(income, slabs):
    """Cut income into pieces and tax each piece at its own rate."""
    tax = 0.0
    lower = 0
    for upper, rate in slabs:
        if upper is None or income <= upper:
            tax += (income - lower) * rate
            break
        tax += (upper - lower) * rate
        lower = upper
    return tax


def calculate_regime(regime, data):
    """Calculate tax for one regime ('new' or 'old')."""
    rules = RULES[regime]
    limits = RULES["limits"]
    salary = data["gross_salary"]
    other_income = data.get("other_income", 0)
    steps = []

    standard = min(rules["standard_deduction"], salary)
    steps.append(f"Standard deduction: {standard}")

    deductions = 0
    if regime == "old":
        hra = min(data.get("hra_exemption", 0), salary)
        d80c = min(data.get("deduction_80c", 0), limits["80c"])
        nps = min(data.get("nps_80ccd_1b", 0), limits["80ccd_1b"])
        d80d = min(data.get("deduction_80d", 0), limits["80d"])
        loan = min(data.get("home_loan_interest", 0), limits["home_loan_interest"])
        deductions = hra + d80c + nps + d80d + loan
        steps.append(f"Old regime deductions and exemptions: {deductions}")

    taxable = max(0, salary + other_income - standard - deductions)
    steps.append(f"Taxable income: {taxable}")

    tax = slab_tax(taxable, rules["slabs"])
    tax_on_slabs = tax
    steps.append(f"Tax on slabs: {round(tax, 2)}")

    rebate = 0.0
    marginal_relief = 0.0
    if taxable <= rules["rebate_limit"]:
        rebate = min(tax, rules["rebate_max"])
        tax -= rebate
        if rebate > 0:
            steps.append(f"Rebate under 87A: {round(rebate, 2)}")
    elif regime == "new":
        extra_income = taxable - rules["rebate_limit"]
        if tax > extra_income:
            marginal_relief = tax - extra_income
            tax = extra_income
            steps.append(f"Marginal relief: {round(marginal_relief, 2)}")

    cess = tax * RULES["cess_rate"]
    total = tax + cess
    steps.append(f"Cess (4%): {round(cess, 2)}")
    steps.append(f"Total tax: {round(total, 2)}")

    tds_paid = data.get("tds_paid", 0)
    net = total - tds_paid  # positive = still to pay, negative = refund

    return {
        "regime": regime,
        "taxable_income": round(taxable, 2),
        "tax_on_slabs": round(tax_on_slabs, 2),
        "rebate": round(rebate, 2),
        "marginal_relief": round(marginal_relief, 2),
        "cess": round(cess, 2),
        "total_tax": round(total, 2),
        "tds_paid": tds_paid,
        "net_payable_or_refund": round(net, 2),
        "steps": steps,
    }


def compare_regimes(data):
    """Calculate both regimes and recommend the cheaper one."""
    new = calculate_regime("new", data)
    old = calculate_regime("old", data)
    if new["total_tax"] <= old["total_tax"]:
        recommended = "new"
    else:
        recommended = "old"
    return {
        "rules_year": RULES["year"],
        "new_regime": new,
        "old_regime": old,
        "recommended": recommended,
        "savings": round(abs(new["total_tax"] - old["total_tax"]), 2),
        "disclaimer": "Preliminary estimate. Verify with official rules or a tax professional.",
    }