"""
ISO 7064 Mod 11-2 ORCID Checksum Algorithm Implementation.
Authoritative standard for 16-digit Open Researcher and Contributor ID checksum verification.
"""
import re

ORCID_REGEX = r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$"


def validate_orcid_checksum(orcid: str) -> bool:
    """
    Validates an ORCID identifier using the ISO 7064 Mod 11-2 algorithm.
    An ORCID consists of 16 characters in 4 groups of 4 separated by hyphens.
    The first 15 characters are digits, and the 16th character is a check digit
    (0-9 or 'X').
    """
    if not orcid or not isinstance(orcid, str):
        return False

    cleaned = orcid.strip().replace("-", "")
    if len(cleaned) != 16:
        return False

    digits = cleaned[:15]
    if not digits.isdigit():
        return False

    check_char = cleaned[15].upper()
    total = 0
    for d in digits:
        total = (total + int(d)) * 2

    remainder = total % 11
    result = (12 - remainder) % 11
    expected = 'X' if result == 10 else str(result)

    return check_char == expected


def is_valid_orcid(orcid: str) -> bool:
    """
    Full format and checksum validation.
    """
    if not orcid or not isinstance(orcid, str):
        return False
    if not re.match(ORCID_REGEX, orcid.strip()):
        return False
    return validate_orcid_checksum(orcid)

