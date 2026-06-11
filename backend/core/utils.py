"""
Shared helpers for validation, password hashing, and amount parsing.
"""

import re
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password

# Maps frontend dropdown labels to numeric upper-bound amounts (INR).
FUNDING_RANGE_MAP = {
    '10,000 - 50,000': Decimal('50000'),
    '50,000 - 2,00,000': Decimal('200000'),
    '2,00,000 - 5,00,000': Decimal('500000'),
    '5,00,000 - 10,00,000': Decimal('1000000'),
    '10,00,000 - 50,00,000': Decimal('5000000'),
    '50,00,000 - 1,00,00,000': Decimal('10000000'),
    'Above 1 Crore': Decimal('10000001'),
}

EMAIL_PATTERN = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
PHONE_PATTERN = re.compile(r'^[0-9]{10}$')


def hash_password(raw_password: str) -> str:
    """Return a securely hashed password using Django's default hasher."""
    return make_password(raw_password)


def verify_password(raw_password: str, hashed_password: str) -> bool:
    """Verify a raw password against a stored hash."""
    return check_password(raw_password, hashed_password)


def parse_funding_range(range_label: str) -> Decimal | None:
    """Convert a frontend funding range label to a decimal amount."""
    if not range_label:
        return None
    cleaned = range_label.strip()
    if cleaned in FUNDING_RANGE_MAP:
        return FUNDING_RANGE_MAP[cleaned]
    # Allow direct numeric input as fallback.
    try:
        return Decimal(str(cleaned).replace(',', ''))
    except Exception:
        return None


def validate_email(email: str) -> bool:
    return bool(EMAIL_PATTERN.match(email or ''))


def validate_phone(phone: str) -> bool:
    return bool(PHONE_PATTERN.match(phone or ''))


def validate_uploaded_file(uploaded_file) -> str | None:
    """
    Validate file extension against allowed types.
    Returns an error message string, or None if valid.
    """
    if not uploaded_file:
        return 'File is required.'

    name = uploaded_file.name.lower()
    allowed = settings.ALLOWED_DOCUMENT_EXTENSIONS
    if not any(name.endswith(ext) for ext in allowed):
        return f'Invalid file type. Allowed: {", ".join(sorted(allowed))}'

    return None
