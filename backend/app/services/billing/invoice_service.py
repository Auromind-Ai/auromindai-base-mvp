import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.invoice import Invoice
from app.models.invoice_sequence import InvoiceSequence
from app.models.workspace import Workspace
from app.core.enums import InvoiceStatus
from app.services.platform_settings_service import get_setting
from app.services.storage.service import get_storage
from app.core.logger import logger

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import threading
from io import BytesIO

_invoice_seq_lock = threading.Lock()

class InvoiceService:
    @staticmethod
    def get_or_create_financial_year(db: Session) -> str:
        """
        Determines current financial year in India (starts April 1st).
        Format: "2026-27"
        """
        now = datetime.now(timezone.utc)
        year = now.year
        if now.month < 4:
            # E.g., March 2026 is in FY 2025-26
            fy_start = year - 1
            fy_end = year
        else:
            # E.g., April 2026 is in FY 2026-27
            fy_start = year
            fy_end = year + 1
        return f"{fy_start}-{str(fy_end)[2:]}"

    @staticmethod
    def generate_invoice_number(db: Session, prefix: str, year: str) -> str:
        """
        Generates invoice number sequentially under a strict SELECT FOR UPDATE row lock
        to prevent duplicates across concurrent workers.
        """
        from sqlalchemy.exc import IntegrityError

        # Find or create sequence row for the specific prefix and year
        seq = db.query(InvoiceSequence).filter(
            InvoiceSequence.prefix == prefix,
            InvoiceSequence.year == year
        ).with_for_update().first()
        
        if not seq:
            try:
                with db.begin_nested():
                    seq = InvoiceSequence(prefix=prefix, year=year, current_value=0)
                    db.add(seq)
                    db.flush()
            except IntegrityError:
                seq = db.query(InvoiceSequence).filter(
                    InvoiceSequence.prefix == prefix,
                    InvoiceSequence.year == year
                ).with_for_update().first()

        seq.current_value += 1
        db.flush()

        sequence_str = str(seq.current_value).zfill(6)
        return f"{prefix}/{year}/{sequence_str}"



    @classmethod
    def create_invoice(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        amount: Decimal,
        currency: str,
        gst_calculations: Dict[str, Any],
        product_type: str,
        payment_id: Optional[uuid.UUID] = None,
        flow_pack_purchase_id: Optional[uuid.UUID] = None,
        wcc_recharge_log_id: Optional[uuid.UUID] = None,
        invoice_type: str = "tax_invoice",  # tax_invoice, credit_note
        subscription_id: Optional[uuid.UUID] = None
    ) -> Invoice:

        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Fetch supplier settings from database
        supplier_name = get_setting(db, "supplier_name", "Orbion Agents Private Limited")
        supplier_gstin = get_setting(db, "supplier_gstin", "33ABCDE1234F1Z5")
        supplier_address = get_setting(db, "supplier_address", "123, FinTech Hub, Chennai, Tamil Nadu")
        supplier_state = get_setting(db, "supplier_state", "Tamil Nadu")
        supplier_country = get_setting(db, "supplier_country", "IN")
        invoice_prefix = get_setting(db, "invoice_prefix", "AUR")

        fy = cls.get_or_create_financial_year(db)
        invoice_number = cls.generate_invoice_number(db, invoice_prefix, fy)

        # Snapshot customer billing details (fallback to workspace details)
        customer_name = workspace.name
        customer_gstin = workspace.billing_gstin
        customer_address = workspace.billing_address or "N/A"
        customer_state = workspace.billing_state or "N/A"
        customer_country = workspace.billing_country or "IN"

        invoice = Invoice(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            subscription_id=subscription_id,
            payment_id=payment_id,
            flow_pack_purchase_id=flow_pack_purchase_id,
            wcc_recharge_log_id=wcc_recharge_log_id,
            amount=amount,
            currency=currency,
            status=InvoiceStatus.paid if invoice_type == "tax_invoice" else InvoiceStatus.open,
            invoice_number=invoice_number,
            invoice_type=invoice_type,
            product_type=product_type,
            subtotal=gst_calculations["subtotal"],
            gst_rate=gst_calculations["gst_rate"],
            gst_amount=gst_calculations["gst_amount"],
            cgst=gst_calculations["cgst"],
            sgst=gst_calculations["sgst"],
            igst=gst_calculations["igst"],
            taxable_amount=gst_calculations["taxable_amount"],
            total_amount=gst_calculations["total_amount"],
            place_of_supply=gst_calculations["place_of_supply"],
            supplier_name=supplier_name,
            supplier_gstin=supplier_gstin,
            supplier_address=supplier_address,
            supplier_state=supplier_state,
            supplier_country=supplier_country,
            customer_name=customer_name,
            customer_gstin=customer_gstin,
            customer_address=customer_address,
            customer_state=customer_state,
            customer_country=customer_country,
            issued_at=datetime.now(timezone.utc),
            paid_at=datetime.now(timezone.utc) if invoice_type == "tax_invoice" else None
        )
        db.add(invoice)
        db.flush()

        # Generate PDF and upload to Storage
import qrcode

def number_to_words_inr(amount: Any) -> str:
    """
    Converts a numeric amount to Indian Rupee words.
    E.g. 4602.00 -> "Rupees Four Thousand Six Hundred Two Only."
    """
    units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ]

    def _convert_below_thousand(n: int) -> str:
        if n == 0:
            return ""
        elif n < 20:
            return units[n]
        elif n < 100:
            return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")
        else:
            return units[n // 100] + " Hundred" + (" " + _convert_below_thousand(n % 100) if n % 100 != 0 else "")

    try:
        val = float(amount)
        rupees = int(val)
        paise = int(round((val - rupees) * 100))

        if rupees == 0:
            words = "Zero"
        else:
            parts = []
            if rupees >= 10000000:
                crore = rupees // 10000000
                rupees %= 10000000
                parts.append(_convert_below_thousand(crore) + " Crore")
            if rupees >= 100000:
                lakh = rupees // 100000
                rupees %= 100000
                parts.append(_convert_below_thousand(lakh) + " Lakh")
            if rupees >= 1000:
                thousand = rupees // 1000
                rupees %= 1000
                parts.append(_convert_below_thousand(thousand) + " Thousand")
            if rupees > 0:
                parts.append(_convert_below_thousand(rupees))

            words = " ".join(parts)

        result = f"Rupees {words}"
        if paise > 0:
            result += f" and {_convert_below_thousand(paise)} Paise"
        result += " Only."
        return result
    except Exception:
        return f"Rupees {amount} Only."


def generate_qr_code_stream(data: str) -> BytesIO:
    """Generates a QR code image stream."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=4,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A5C2B", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


class InvoiceService:
    @staticmethod
    def get_or_create_financial_year(db: Session) -> str:
        """
        Determines current financial year in India (starts April 1st).
        Format: "2026-27"
        """
        now = datetime.now(timezone.utc)
        year = now.year
        if now.month < 4:
            fy_start = year - 1
            fy_end = year
        else:
            fy_start = year
            fy_end = year + 1
        return f"{fy_start}-{str(fy_end)[2:]}"

    @staticmethod
    def generate_invoice_number(db: Session, prefix: str, year: str) -> str:
        """
        Generates invoice number sequentially under a strict SELECT FOR UPDATE row lock
        to prevent duplicates across concurrent workers.
        """
        from sqlalchemy.exc import IntegrityError

        seq = db.query(InvoiceSequence).filter(
            InvoiceSequence.prefix == prefix,
            InvoiceSequence.year == year
        ).with_for_update().first()
        
        if not seq:
            try:
                with db.begin_nested():
                    seq = InvoiceSequence(prefix=prefix, year=year, current_value=0)
                    db.add(seq)
                    db.flush()
            except IntegrityError:
                seq = db.query(InvoiceSequence).filter(
                    InvoiceSequence.prefix == prefix,
                    InvoiceSequence.year == year
                ).with_for_update().first()

        seq.current_value += 1
        db.flush()

        sequence_str = str(seq.current_value).zfill(6)
        return f"{prefix}/{year}/{sequence_str}"

    @classmethod
    def create_invoice(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        amount: Decimal,
        currency: str,
        gst_calculations: Dict[str, Any],
        product_type: str,
        payment_id: Optional[uuid.UUID] = None,
        flow_pack_purchase_id: Optional[uuid.UUID] = None,
        wcc_recharge_log_id: Optional[uuid.UUID] = None,
        invoice_type: str = "tax_invoice",
        subscription_id: Optional[uuid.UUID] = None
    ) -> Invoice:
        """
        Creates an Invoice database entry, snapshotting customer/supplier profiles,
        calculating sequence locks, and generating/storing the PDF invoice.
        """
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        supplier_name = get_setting(db, "supplier_name", "Orbion Agents Private Limited")
        supplier_gstin = get_setting(db, "supplier_gstin", "33ABCDE1234F1Z5")
        supplier_address = get_setting(db, "supplier_address", "123, FinTech Hub, Chennai, Tamil Nadu - 600001, India")
        supplier_state = get_setting(db, "supplier_state", "Tamil Nadu")
        supplier_country = get_setting(db, "supplier_country", "IN")
        invoice_prefix = get_setting(db, "invoice_prefix", "AUR")

        fy = cls.get_or_create_financial_year(db)
        invoice_number = cls.generate_invoice_number(db, invoice_prefix, fy)

        customer_name = workspace.name
        customer_gstin = workspace.billing_gstin
        customer_address = workspace.billing_address or "N/A"
        customer_state = workspace.billing_state or "N/A"
        customer_country = workspace.billing_country or "IN"

        invoice = Invoice(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            subscription_id=subscription_id,
            payment_id=payment_id,
            flow_pack_purchase_id=flow_pack_purchase_id,
            wcc_recharge_log_id=wcc_recharge_log_id,
            amount=amount,
            currency=currency,
            status=InvoiceStatus.paid if invoice_type == "tax_invoice" else InvoiceStatus.open,
            invoice_number=invoice_number,
            invoice_type=invoice_type,
            product_type=product_type,
            subtotal=gst_calculations["subtotal"],
            gst_rate=gst_calculations["gst_rate"],
            gst_amount=gst_calculations["gst_amount"],
            cgst=gst_calculations["cgst"],
            sgst=gst_calculations["sgst"],
            igst=gst_calculations["igst"],
            taxable_amount=gst_calculations["taxable_amount"],
            total_amount=gst_calculations["total_amount"],
            place_of_supply=gst_calculations["place_of_supply"],
            supplier_name=supplier_name,
            supplier_gstin=supplier_gstin,
            supplier_address=supplier_address,
            supplier_state=supplier_state,
            supplier_country=supplier_country,
            customer_name=customer_name,
            customer_gstin=customer_gstin,
            customer_address=customer_address,
            customer_state=customer_state,
            customer_country=customer_country,
            issued_at=datetime.now(timezone.utc),
            paid_at=datetime.now(timezone.utc) if invoice_type == "tax_invoice" else None
        )
        db.add(invoice)
        db.flush()

        try:
            pdf_bytes = cls.generate_pdf_invoice(invoice)
            file_name = f"invoices/{invoice.id}.pdf"
            pdf_url = get_storage().provider._save_file_sync(file_name, pdf_bytes, "application/pdf")
            invoice.pdf_url = pdf_url
            db.flush()
        except Exception as pdf_error:
            logger.error(f"Failed to generate/store PDF for invoice {invoice_number}: {pdf_error}")

        return invoice

    @classmethod
    def create_credit_note(
        cls,
        db: Session,
        original_invoice: Invoice,
        refund_reason: str = "Refund processed"
    ) -> Invoice:
        """
        Creates a Credit Note reversing the original invoice amount and GST properly.
        """
        supplier_name = original_invoice.supplier_name
        supplier_gstin = original_invoice.supplier_gstin
        supplier_address = original_invoice.supplier_address
        supplier_state = original_invoice.supplier_state
        supplier_country = original_invoice.supplier_country
        invoice_prefix = "CN"

        fy = cls.get_or_create_financial_year(db)
        cn_number = cls.generate_invoice_number(db, invoice_prefix, fy)

        credit_note = Invoice(
            id=uuid.uuid4(),
            workspace_id=original_invoice.workspace_id,
            payment_id=original_invoice.payment_id,
            flow_pack_purchase_id=original_invoice.flow_pack_purchase_id,
            wcc_recharge_log_id=original_invoice.wcc_recharge_log_id,
            amount=original_invoice.amount,
            currency=original_invoice.currency,
            status=InvoiceStatus.paid,
            invoice_number=cn_number,
            invoice_type="credit_note",
            product_type=original_invoice.product_type,
            subtotal=original_invoice.subtotal,
            gst_rate=original_invoice.gst_rate,
            gst_amount=original_invoice.gst_amount,
            cgst=original_invoice.cgst,
            sgst=original_invoice.sgst,
            igst=original_invoice.igst,
            taxable_amount=original_invoice.taxable_amount,
            total_amount=original_invoice.total_amount,
            place_of_supply=original_invoice.place_of_supply,
            supplier_name=supplier_name,
            supplier_gstin=supplier_gstin,
            supplier_address=supplier_address,
            supplier_state=supplier_state,
            supplier_country=supplier_country,
            customer_name=original_invoice.customer_name,
            customer_gstin=original_invoice.customer_gstin,
            customer_address=original_invoice.customer_address,
            customer_state=original_invoice.customer_state,
            customer_country=original_invoice.customer_country,
            issued_at=datetime.now(timezone.utc),
            paid_at=datetime.now(timezone.utc)
        )
        db.add(credit_note)
        db.flush()

        original_invoice.status = InvoiceStatus.refunded
        db.flush()

        try:
            pdf_bytes = cls.generate_pdf_invoice(credit_note, original_invoice_num=original_invoice.invoice_number)
            file_name = f"invoices/{credit_note.id}.pdf"
            pdf_url = get_storage().provider._save_file_sync(file_name, pdf_bytes, "application/pdf")
            credit_note.pdf_url = pdf_url
            db.flush()
        except Exception as pdf_error:
            logger.error(f"Failed to generate PDF credit note {cn_number}: {pdf_error}")

        return credit_note

    @staticmethod
    def generate_pdf_invoice(invoice: Invoice, original_invoice_num: Optional[str] = None) -> bytes:
        """
        Generates a modern, GST-compliant PDF invoice matching the reference template with balanced vertical density.
        """
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import Image as RLImage

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=24,
            rightMargin=24,
            topMargin=20,
            bottomMargin=18
        )

        # Color Palette
        DARK_GREEN = colors.HexColor("#0A5C2B")
        LIGHT_GREEN_BG = colors.HexColor("#F4F8F5")
        BORDER_GREEN = colors.HexColor("#E0EBE2")
        TEXT_DARK = colors.HexColor("#1E293B")
        TEXT_MUTED = colors.HexColor("#64748B")
        WHITE = colors.HexColor("#FFFFFF")

        styles = getSampleStyleSheet()
        normal = styles["Normal"]

        style_brand = ParagraphStyle(
            "BrandName",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=TEXT_DARK
        )
        style_brand_sub = ParagraphStyle(
            "BrandSub",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=DARK_GREEN
        )
        style_title = ParagraphStyle(
            "DocTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=DARK_GREEN,
            alignment=2
        )
        style_meta_label = ParagraphStyle(
            "MetaLabel",
            parent=normal,
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=TEXT_DARK
        )
        style_meta_val = ParagraphStyle(
            "MetaVal",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=14,
            textColor=TEXT_DARK
        )
        style_card_title = ParagraphStyle(
            "CardTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=DARK_GREEN
        )
        style_card_body = ParagraphStyle(
            "CardBody",
            parent=normal,
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=TEXT_DARK
        )
        style_tbl_hdr = ParagraphStyle(
            "TblHdr",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=WHITE,
            alignment=1
        )
        style_tbl_cell = ParagraphStyle(
            "TblCell",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=TEXT_DARK
        )
        style_tbl_cell_center = ParagraphStyle(
            "TblCellCenter",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=TEXT_DARK,
            alignment=1
        )
        style_tbl_cell_right = ParagraphStyle(
            "TblCellRight",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=TEXT_DARK,
            alignment=2
        )
        style_grand_total = ParagraphStyle(
            "GrandTotalText",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=WHITE,
            alignment=1
        )

        story = []

        # --- 1. Top Header (Logo/Brand vs Title) ---
        title_text = "TAX INVOICE"
        if invoice.invoice_type == "credit_note":
            title_text = "CREDIT NOTE"
        elif invoice.invoice_type == "refund_invoice":
            title_text = "REFUND INVOICE"

        brand_paragraph = Paragraph("<b>ORBION AGENTS</b>", style_brand)
        brand_sub_paragraph = Paragraph("AI-powered Business Automation Platform", style_brand_sub)
        header_left = [brand_paragraph, Spacer(1, 3), brand_sub_paragraph]

        header_table = Table([[header_left, Paragraph(f"<b>{title_text}</b>", style_title)]], colWidths=[330, 217])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))

        # Green Horizontal Rule
        rule_data = [[""]]
        rule_table = Table(rule_data, colWidths=[547], rowHeights=[2])
        rule_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BORDER_GREEN),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(rule_table)
        story.append(Spacer(1, 10))

        # --- 2. Sub-Header (Supplier Top & Invoice Meta Details) ---
        date_str = invoice.issued_at.strftime("%d-%b-%Y") if invoice.issued_at else "N/A"
        
        sup_info = (
            f"<b>{invoice.supplier_name or 'Orbion Agents Private Limited'}</b><br/>"
            f"{invoice.supplier_address or '123, FinTech Hub, Chennai, Tamil Nadu - 600001, India'}<br/>"
            f"GSTIN: {invoice.supplier_gstin or '33ABCDE1234F1Z5'}<br/>"
            f"State: {invoice.supplier_state or 'Tamil Nadu'}"
        )
        sup_para = Paragraph(sup_info, style_card_body)

        meta_rows = [
            [Paragraph("Invoice No.", style_meta_label), Paragraph(":", style_meta_label), Paragraph(f"{invoice.invoice_number or 'N/A'}", style_meta_val)],
            [Paragraph("Invoice Date", style_meta_label), Paragraph(":", style_meta_label), Paragraph(f"{date_str}", style_meta_val)],
            [Paragraph("Place of Supply", style_meta_label), Paragraph(":", style_meta_label), Paragraph(f"{invoice.place_of_supply or 'Tamil Nadu'}", style_meta_val)],
            [Paragraph("Currency", style_meta_label), Paragraph(":", style_meta_label), Paragraph(f"{invoice.currency or 'INR'}", style_meta_val)],
        ]
        meta_table = Table(meta_rows, colWidths=[95, 10, 120])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 2),
            ('RIGHTPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))

        top_meta_grid = Table([[sup_para, meta_table]], colWidths=[310, 237])
        top_meta_grid.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(top_meta_grid)
        story.append(Spacer(1, 14))

        # --- 3. Billed To & Supplier Cards (Side-by-side) ---
        customer_name = invoice.customer_name
        if not customer_name:
            if hasattr(invoice, "workspace") and invoice.workspace and getattr(invoice.workspace, "name", None):
                customer_name = invoice.workspace.name
            else:
                customer_name = "Valued Workspace"

        billed_to_content = [
            Paragraph("<b>BILLED TO</b>", style_card_title),
            Spacer(1, 5),
            Paragraph(f"<b>{customer_name}</b>", style_card_body),
            Paragraph(f"{invoice.customer_address or 'Tamil Nadu, India'}", style_card_body),
            Paragraph(f"GSTIN: {invoice.customer_gstin or 'N/A'}", style_card_body),
        ]

        supplier_card_content = [
            Paragraph("<b>SUPPLIER</b>", style_card_title),
            Spacer(1, 5),
            Paragraph(f"<b>{invoice.supplier_name or 'Orbion Agents Private Limited'}</b>", style_card_body),
            Paragraph(f"{invoice.supplier_address or '123, FinTech Hub, Chennai, Tamil Nadu - 600001, India'}", style_card_body),
            Paragraph(f"GSTIN: {invoice.supplier_gstin or '33ABCDE1234F1Z5'}", style_card_body),
            Paragraph(f"State: {invoice.supplier_state or 'Tamil Nadu'}", style_card_body),
        ]

        cards_table = Table([[billed_to_content, supplier_card_content]], colWidths=[266, 266], spaceBefore=0)
        cards_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (0,0), LIGHT_GREEN_BG),
            ('BACKGROUND', (1,0), (1,0), LIGHT_GREEN_BG),
            ('BOX', (0,0), (0,0), 0.8, BORDER_GREEN),
            ('BOX', (1,0), (1,0), 0.8, BORDER_GREEN),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))

        wrapper_cards = Table([[cards_table]], colWidths=[547])
        wrapper_cards.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(wrapper_cards)
        story.append(Spacer(1, 14))

        if original_invoice_num:
            story.append(Paragraph(f"<i>Reference Original Invoice: {original_invoice_num}</i>", style_card_body))
            story.append(Spacer(1, 10))

        # --- 4. Product & Tax Items Table ---
        table_headers = [
            Paragraph("<b>Sl.<br/>No.</b>", style_tbl_hdr),
            Paragraph("<b>Description</b>", style_tbl_hdr),
            Paragraph("<b>SAC<br/>Code</b>", style_tbl_hdr),
            Paragraph(f"<b>Taxable<br/>Value ({invoice.currency})</b>", style_tbl_hdr),
            Paragraph("<b>GST<br/>Rate</b>", style_tbl_hdr),
            Paragraph(f"<b>CGST<br/>({invoice.currency})</b>", style_tbl_hdr),
            Paragraph(f"<b>SGST<br/>({invoice.currency})</b>", style_tbl_hdr),
            Paragraph(f"<b>Total<br/>({invoice.currency})</b>", style_tbl_hdr),
        ]

        desc_mapping = {
            "subscription": "Auromind SaaS Platform Subscription Plan",
            "ai_credits": "AI Token Credit Pack Recharge",
            "flow_packs": "AI Automation Flow Pack",
            "wcc_recharge": "WhatsApp Conversation Cloud Wallet Recharge"
        }
        product_desc = desc_mapping.get(invoice.product_type, f"Auromind Platform Recharge ({invoice.product_type})")

        # Tax calculations format
        cgst_str = f"{invoice.cgst:,.2f}<br/>({invoice.gst_rate / Decimal('2.00'):.0f}%)" if invoice.cgst and invoice.cgst > 0 else "-"
        sgst_str = f"{invoice.sgst:,.2f}<br/>({invoice.gst_rate / Decimal('2.00'):.0f}%)" if invoice.sgst and invoice.sgst > 0 else "-"
        if invoice.igst and invoice.igst > 0:
            cgst_str = "-"
            sgst_str = f"IGST:<br/>{invoice.igst:,.2f}"

        row_1 = [
            Paragraph("1", style_tbl_cell_center),
            Paragraph(product_desc, style_tbl_cell),
            Paragraph("997331", style_tbl_cell_center),
            Paragraph(f"{invoice.taxable_amount:,.2f}", style_tbl_cell_right),
            Paragraph(f"{invoice.gst_rate:.0f}%", style_tbl_cell_center),
            Paragraph(cgst_str, style_tbl_cell_center),
            Paragraph(sgst_str, style_tbl_cell_center),
            Paragraph(f"<b>{invoice.total_amount:,.2f}</b>", style_tbl_cell_right),
        ]

        item_table = Table([table_headers, row_1], colWidths=[30, 167, 50, 75, 45, 55, 55, 70])
        item_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), DARK_GREEN),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.6, BORDER_GREEN),
            ('TOPPADDING', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('TOPPADDING', (0,1), (-1,1), 12),
            ('BOTTOMPADDING', (0,1), (-1,1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(item_table)
        story.append(Spacer(1, 14))

        # --- 5. Amount in Words, Declaration vs Summary Breakdown ---
        amount_in_words_text = number_to_words_inr(invoice.total_amount)

        left_decl_content = [
            Paragraph("<b>AMOUNT IN WORDS</b>", style_card_title),
            Spacer(1, 3),
            Paragraph(f"{amount_in_words_text}", style_card_body),
            Spacer(1, 10),
            Paragraph("<b>DECLARATION</b>", style_card_title),
            Spacer(1, 3),
            Paragraph("We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.", style_card_body),
            Spacer(1, 10),
            Paragraph("<i>This is a computer generated invoice and requires no signature.</i>", style_card_body)
        ]

        # Right Summary Totals
        half_rate = (invoice.gst_rate / Decimal("2.00")) if invoice.gst_rate else Decimal("9.00")
        summary_rows = [
            [Paragraph("Subtotal (Taxable Value)", style_card_body), Paragraph(f"{invoice.currency} {invoice.taxable_amount:,.2f}", style_tbl_cell_right)],
        ]

        if invoice.igst and invoice.igst > 0:
            summary_rows.append([Paragraph(f"IGST ({invoice.gst_rate:.0f}%)", style_card_body), Paragraph(f"{invoice.currency} {invoice.igst:,.2f}", style_tbl_cell_right)])
        else:
            summary_rows.append([Paragraph(f"CGST ({half_rate:.0f}%)", style_card_body), Paragraph(f"{invoice.currency} {invoice.cgst:,.2f}", style_tbl_cell_right)])
            summary_rows.append([Paragraph(f"SGST ({half_rate:.0f}%)", style_card_body), Paragraph(f"{invoice.currency} {invoice.sgst:,.2f}", style_tbl_cell_right)])

        summary_inner_table = Table(summary_rows, colWidths=[140, 100])
        summary_inner_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER_GREEN),
        ]))

        grand_total_badge = Table(
            [[Paragraph(f"<b>GRAND TOTAL</b>", ParagraphStyle("GTLabel", parent=normal, fontName="Helvetica-Bold", fontSize=11, textColor=TEXT_DARK)),
              Paragraph(f"<b>{invoice.currency} {invoice.total_amount:,.2f}</b>", style_grand_total)]],
            colWidths=[105, 135]
        )
        grand_total_badge.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (1,0), (1,0), DARK_GREEN),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (1,0), (1,0), 10),
            ('RIGHTPADDING', (1,0), (1,0), 10),
        ]))

        right_summary_content = [
            summary_inner_table,
            Spacer(1, 14),
            grand_total_badge
        ]

        decl_summary_table = Table([[left_decl_content, right_summary_content]], colWidths=[266, 266])
        decl_summary_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (0,0), LIGHT_GREEN_BG),
            ('BACKGROUND', (1,0), (1,0), LIGHT_GREEN_BG),
            ('BOX', (0,0), (0,0), 0.8, BORDER_GREEN),
            ('BOX', (1,0), (1,0), 0.8, BORDER_GREEN),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(decl_summary_table)
        story.append(Spacer(1, 14))

        # --- 6. Payment Status Banner ---
        status_str = invoice.status.value.upper() if hasattr(invoice.status, "value") else str(invoice.status).upper()
        status_para = Paragraph(f"<b>PAYMENT STATUS</b><br/><font size=16 color='#0A5C2B'><b>{status_str}</b></font>", style_card_body)
        thanks_para = Paragraph("Thank you for choosing Orbion Agents.", ParagraphStyle("Thanks", parent=normal, fontName="Helvetica-Bold", fontSize=11, textColor=TEXT_DARK, alignment=2))

        status_table = Table([[status_para, thanks_para]], colWidths=[260, 287])
        status_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_GREEN_BG),
            ('BOX', (0,0), (-1,-1), 0.8, BORDER_GREEN),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 14))

        # Fetch dynamic platform settings
        support_email = get_setting(None, "invoice_support_email", "billing@auromind.ai")
        support_url = get_setting(None, "invoice_support_url", "https://auromind.ai")
        qr_action = get_setting(None, "invoice_qr_action", "view_invoice_online")
        qr_custom_url = get_setting(None, "invoice_qr_custom_url", "https://auromind.ai/billing")
        qr_caption = get_setting(None, "invoice_qr_caption", "Scan to view invoice online")
        frontend_url = get_setting(None, "frontend_url", "https://app.auromind.ai").rstrip("/")

        # Determine QR destination URL
        if qr_action == "company_website":
            verify_url = support_url
        elif qr_action == "custom_url":
            verify_url = qr_custom_url
        else:  # view_invoice_online (Recommended)
            if invoice.pdf_url and invoice.pdf_url.startswith("http"):
                verify_url = invoice.pdf_url
            else:
                verify_url = f"{frontend_url}/invoices/{invoice.id}"

        qr_buf = generate_qr_code_stream(verify_url)
        qr_image = RLImage(qr_buf, width=75, height=75)

        support_text = (
            "<b>For billing support, contact us at:</b><br/>"
            f"✉ <b>{support_email}</b> &nbsp;&nbsp;|&nbsp;&nbsp; 🌐 <b>{support_url}</b>"
        )
        support_para = Paragraph(support_text, style_card_body)

        qr_block = [
            qr_image,
            Spacer(1, 3),
            Paragraph(f"<font size=7.5 color='#64748B'>{qr_caption}</font>", style_tbl_cell_center)
        ]

        footer_top_grid = Table([[support_para, qr_block]], colWidths=[420, 127])
        footer_top_grid.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(footer_top_grid)
        story.append(Spacer(1, 10))

        # Dark Green Bottom Full-Width Bar
        bottom_bar_text = Paragraph("<font color='#FFFFFF' size=8.5><b>Orbion Agents Private Limited</b> &nbsp;|&nbsp; All rights reserved.</font>", ParagraphStyle("BtmBar", parent=normal, fontName="Helvetica", fontSize=8.5, alignment=1))
        bottom_bar = Table([[bottom_bar_text]], colWidths=[547], rowHeights=[24])
        bottom_bar.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), DARK_GREEN),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(bottom_bar)

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

