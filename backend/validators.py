import re

PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
GSTIN_PATTERN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")

PAN_TYPES = {
    "P": "Individual", "C": "Company", "H": "HUF", "F": "Firm",
    "A": "Association of Persons", "T": "Trust", "B": "Body of Individuals",
    "L": "Local Authority", "J": "Artificial Juridical Person", "G": "Government",
}

# Valid GST state codes [verify against the GST portal]
STATE_CODES = {f"{i:02d}" for i in range(1, 39)} | {"97", "99"}

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def validate_pan(pan):
    pan = pan.strip().upper()
    errors = []
    if len(pan) != 10:
        errors.append("PAN must be exactly 10 characters")
    elif not PAN_PATTERN.match(pan):
        errors.append("PAN format must be 5 letters, 4 digits, 1 letter")
    elif pan[3] not in PAN_TYPES:
        errors.append("4th character is not a valid holder type")
    return {
        "value": pan,
        "valid": not errors,
        "holder_type": PAN_TYPES.get(pan[3]) if not errors else None,
        "errors": errors,
    }


def gstin_check_char(first14):
    """Work out what the 15th character should be."""
    total = 0
    for i, ch in enumerate(first14):
        value = CHARS.index(ch)
        factor = 2 if i % 2 == 1 else 1
        product = value * factor
        total += product // 36 + product % 36
    return CHARS[(36 - total % 36) % 36]


def validate_gstin(gstin):
    gstin = gstin.strip().upper()
    errors = []
    if len(gstin) != 15:
        errors.append("GSTIN must be exactly 15 characters")
    elif not GSTIN_PATTERN.match(gstin):
        errors.append("GSTIN format is wrong (check state code, PAN part and the letter Z)")
    else:
        if gstin[:2] not in STATE_CODES:
            errors.append("State code is not valid")
        if not validate_pan(gstin[2:12])["valid"]:
            errors.append("The PAN inside the GSTIN is not valid")
        if gstin_check_char(gstin[:14]) != gstin[14]:
            errors.append("Check character does not match, there may be a typing mistake")
    return {
        "value": gstin,
        "valid": not errors,
        "state_code": gstin[:2] if not errors else None,
        "pan": gstin[2:12] if not errors else None,
        "errors": errors,
    }