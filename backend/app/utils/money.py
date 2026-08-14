from decimal import Decimal, ROUND_HALF_UP
from typing import Union, Any

Number = Union[Decimal, float, int, str]


def to_paise(amount: Number) -> int:
    if amount is None:
        return 0
    dec_amount = Decimal(str(amount))
    return int((dec_amount * Decimal("100.00")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def to_rupees(paise: int) -> Decimal:
    if paise is None:
        return Decimal("0.00")
    return (Decimal(str(paise)) / Decimal("100.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def verify_paise_amount(received_paise: Any, expected_paise: Any, max_tolerance_paise: int = 2) -> bool:
    try:
        rec = int(received_paise or 0)
        exp = int(expected_paise or 0)
        return abs(rec - exp) <= max_tolerance_paise
    except (ValueError, TypeError):
        return False
