from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.platform_settings_service import get_setting

class GSTService:
    @staticmethod
    def calculate_gst(
        amount: Decimal,  # The price of the product
        customer_state: Optional[str],
        customer_country: Optional[str] = "IN",
        product_type: str = "subscription",  # subscription, ai_credits, flow_packs, wcc_recharge
        db: Session = None,
        tax_inclusive: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Calculates GST based on Indian tax compliance.
        Handles intra-state (CGST+SGST), inter-state (IGST), and export (0% GST).
        Supports both tax-inclusive and tax-exclusive calculations.
        """
        # Ensure Decimal type
        amount = Decimal(str(amount))

        # Check platform settings for GST status
        gst_enabled = get_setting(db, "gst_enabled", True)
        product_enabled = get_setting(db, f"gst_enabled_{product_type}", True)

        # Fallback values if GST is disabled globally or for this specific product
        if not gst_enabled or not product_enabled:
            return {
                "subtotal": amount,
                "gst_rate": Decimal("0.00"),
                "gst_amount": Decimal("0.00"),
                "cgst": Decimal("0.00"),
                "sgst": Decimal("0.00"),
                "igst": Decimal("0.00"),
                "taxable_amount": amount,
                "total_amount": amount,
                "customer_state": customer_state or "N/A",
                "customer_country": customer_country or "IN",
                "place_of_supply": customer_state or "N/A",
            }

        # Retrieve GST rate and supplier settings
        gst_rate = Decimal(str(get_setting(db, "gst_rate", 18.0)))
        supplier_state = get_setting(db, "supplier_state", "Tamil Nadu")
        supplier_country = get_setting(db, "supplier_country", "IN")

        if tax_inclusive is None:
            # Default to tax-exclusive unless set to inclusive
            tax_inclusive = get_setting(db, "gst_tax_type", "exclusive") == "inclusive"

        rate_fraction = gst_rate / Decimal("100.00")

        if tax_inclusive:
            total_amount = amount
            taxable_amount = (total_amount / (Decimal("1.00") + rate_fraction)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            gst_amount = (total_amount - taxable_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal = taxable_amount
        else:
            taxable_amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal = taxable_amount
            gst_amount = (taxable_amount * rate_fraction).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total_amount = taxable_amount + gst_amount

        # Check country & state comparison to calculate CGST, SGST, IGST
        customer_country_clean = (customer_country or "IN").strip().upper()
        customer_state_clean = (customer_state or "").strip().lower()
        supplier_state_clean = (supplier_state or "").strip().lower()

        if customer_country_clean != "IN":
            # Export transaction - 0% GST (with LUT or zero rated)
            cgst = Decimal("0.00")
            sgst = Decimal("0.00")
            igst = Decimal("0.00")
            gst_amount = Decimal("0.00")
            gst_rate = Decimal("0.00")
            total_amount = taxable_amount
        elif customer_state_clean == supplier_state_clean:
            # Intra-state transaction (CGST + SGST)
            cgst = (gst_amount / Decimal("2.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sgst = (gst_amount - cgst).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            igst = Decimal("0.00")
        else:
            # Inter-state transaction (IGST only)
            cgst = Decimal("0.00")
            sgst = Decimal("0.00")
            igst = gst_amount

        return {
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "taxable_amount": taxable_amount,
            "total_amount": total_amount,
            "place_of_supply": customer_state or "N/A",
            "customer_state": customer_state or "N/A",
            "customer_country": customer_country_clean,
        }
