from validators import validate_pan, validate_gstin


def test_valid_pan():
    assert validate_pan("ABCPE1234F")["valid"] is True


def test_pan_wrong_length():
    assert validate_pan("ABCDE123")["valid"] is False


def test_pan_wrong_pattern():
    assert validate_pan("ABCDE12345")["valid"] is False


def test_pan_lowercase_is_accepted():
    assert validate_pan("abcpe1234f")["valid"] is True


def test_valid_gstin():
    assert validate_gstin("27AAPFU0939F1ZV")["valid"] is True


def test_gstin_wrong_check_character():
    assert validate_gstin("27AAPFU0939F1ZA")["valid"] is False


def test_gstin_wrong_length():
    assert validate_gstin("27AAPFU0939F1Z")["valid"] is False


def test_gstin_invalid_state_code():
    assert validate_gstin("50AAPFU0939F1ZV")["valid"] is False

def test_pan_invalid_holder_type():
    assert validate_pan("ABCDE1234F")["valid"] is False