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
        """
        Creates an Invoice database entry, snapshotting customer/supplier profiles,
        calculating sequence locks, and generating/storing the PDF invoice.
        """
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Fetch supplier settings from database
        supplier_name = get_setting(db, "supplier_name", "Auromind AI Private Limited")
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
        try:
            pdf_bytes = cls.generate_pdf_invoice(invoice)
            file_name = f"invoices/{invoice.id}.pdf"
            pdf_url = get_storage()._build_provider()._save_file_sync(file_name, pdf_bytes, "application/pdf")
            invoice.pdf_url = pdf_url
            db.flush()
        except Exception as pdf_error:
            logger.error(f"Failed to generate/store PDF for invoice {invoice_number}: {pdf_error}")
            # Do not fail transaction, but log the error
        
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
        # Lock sequence to generate new invoice number for Credit Note
        supplier_name = original_invoice.supplier_name
        supplier_gstin = original_invoice.supplier_gstin
        supplier_address = original_invoice.supplier_address
        supplier_state = original_invoice.supplier_state
        supplier_country = original_invoice.supplier_country
        invoice_prefix = "CN"

        fy = cls.get_or_create_financial_year(db)
        cn_number = cls.generate_invoice_number(db, invoice_prefix, fy)

        # Reverse amounts (GST reversed properly)
        credit_note = Invoice(
            id=uuid.uuid4(),
            workspace_id=original_invoice.workspace_id,
            payment_id=original_invoice.payment_id,
            flow_pack_purchase_id=original_invoice.flow_pack_purchase_id,
            wcc_recharge_log_id=original_invoice.wcc_recharge_log_id,
            amount=original_invoice.amount,
            currency=original_invoice.currency,
            status=InvoiceStatus.paid,  # Credit note is processed and completed
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

        # Update original invoice status to refunded
        original_invoice.status = InvoiceStatus.refunded
        db.flush()

        # Generate and save PDF Credit Note
        try:
            pdf_bytes = cls.generate_pdf_invoice(credit_note, original_invoice_num=original_invoice.invoice_number)
            file_name = f"invoices/{credit_note.id}.pdf"
            pdf_url = get_storage()._build_provider()._save_file_sync(file_name, pdf_bytes, "application/pdf")
            credit_note.pdf_url = pdf_url
            db.flush()
        except Exception as pdf_error:
            logger.error(f"Failed to generate PDF credit note {cn_number}: {pdf_error}")

        return credit_note

    @staticmethod
    def generate_pdf_invoice(invoice: Invoice, original_invoice_num: Optional[str] = None) -> bytes:
        """
        Uses ReportLab to compile a highly polished, GST-compliant PDF invoice/credit note.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Define clean, modern styles
        style_normal = styles["Normal"]
        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#3F51B5"),
            spaceAfter=10
        )
        header_label_style = ParagraphStyle(
            "HeaderLabel",
            parent=style_normal,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#757575")
        )
        header_val_style = ParagraphStyle(
            "HeaderValue",
            parent=style_normal,
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#212121"),
            fontName="Helvetica-Bold"
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=style_normal,
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#3F51B5"),
            fontName="Helvetica-Bold",
            spaceAfter=6
        )

        story = []

        # --- Header Section ---
        title_text = "TAX INVOICE"
        if invoice.invoice_type == "credit_note":
            title_text = "CREDIT NOTE"
        elif invoice.invoice_type == "refund_invoice":
            title_text = "REFUND INVOICE"
            
        story.append(Paragraph(title_text, title_style))
        story.append(Spacer(1, 10))

        # Main details block: Supplier vs Invoice details
        date_str = invoice.issued_at.strftime("%d-%b-%Y") if invoice.issued_at else "N/A"
        
        top_data = [
            [
                Paragraph(f"<b>Supplier:</b><br/>{invoice.supplier_name}<br/>{invoice.supplier_address}<br/>GSTIN: {invoice.supplier_gstin}<br/>State: {invoice.supplier_state}", style_normal),
                Paragraph(f"<b>Invoice No:</b> {invoice.invoice_number}<br/><b>Date:</b> {date_str}<br/><b>Place of Supply:</b> {invoice.place_of_supply}<br/><b>Currency:</b> {invoice.currency}", style_normal)
            ]
        ]
        top_table = Table(top_data, colWidths=[270, 270])
        top_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(top_table)
        story.append(Spacer(1, 15))

        # Customer Billing Details
        customer_name = invoice.customer_name
        if not customer_name:
            if hasattr(invoice, "workspace") and invoice.workspace and getattr(invoice.workspace, "name", None):
                customer_name = invoice.workspace.name
            else:
                customer_name = "Valued Customer"

        cust_info_lines = [f"<b>Bill To:</b>", customer_name]
        if invoice.customer_address and invoice.customer_address != "N/A":
            cust_info_lines.append(invoice.customer_address)
        
        location_line = []
        if invoice.customer_state and invoice.customer_state != "N/A":
            location_line.append(f"State: {invoice.customer_state}")
        if invoice.customer_country:
            location_line.append(f"Country: {invoice.customer_country}")
        if location_line:
            cust_info_lines.append(", ".join(location_line))

        if invoice.customer_gstin and invoice.customer_gstin.strip():
            cust_info_lines.append(f"GSTIN: {invoice.customer_gstin.strip()}")

        cust_data = [
            [
                Paragraph("<br/>".join(cust_info_lines), style_normal)
            ]
        ]
        cust_table = Table(cust_data, colWidths=[540])
        cust_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F5F5F5")),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(cust_table)
        story.append(Spacer(1, 20))

        if original_invoice_num:
            story.append(Paragraph(f"<i>Reference Original Invoice: {original_invoice_num}</i>", style_normal))
            story.append(Spacer(1, 10))

        # --- Product & Tax Calculations Table ---
        # Headers
        table_headers = [
            Paragraph("<b>Sl. No.</b>", style_normal),
            Paragraph("<b>Description</b>", style_normal),
            Paragraph("<b>SAC Code</b>", style_normal),
            Paragraph("<b>Taxable Value</b>", style_normal),
            Paragraph("<b>GST Rate</b>", style_normal),
            Paragraph("<b>Tax Amount</b>", style_normal),
            Paragraph("<b>Total</b>", style_normal)
        ]

        # Row Data
        desc_mapping = {
            "subscription": "Auromind SaaS Platform Subscription Plan",
            "ai_credits": "AI Token Credit Pack Recharge",
            "flow_packs": "AI Automation Flow Pack",
            "wcc_recharge": "WhatsApp Conversation Cloud Wallet Recharge"
        }
        product_desc = desc_mapping.get(invoice.product_type, f"Auromind Platform Recharge ({invoice.product_type})")
        
        # Display GST breakdown nicely
        tax_detail = ""
        if invoice.igst and invoice.igst > 0:
            tax_detail = f"IGST: {invoice.currency} {invoice.igst}"
        else:
            tax_detail = f"CGST: {invoice.currency} {invoice.cgst}<br/>SGST: {invoice.currency} {invoice.sgst}"

        row_data = [
            Paragraph("1", style_normal),
            Paragraph(product_desc, style_normal),
            Paragraph("997331", style_normal),
            Paragraph(f"{invoice.currency} {invoice.taxable_amount}", style_normal),
            Paragraph(f"{invoice.gst_rate}%", style_normal),
            Paragraph(tax_detail, style_normal),
            Paragraph(f"{invoice.currency} {invoice.total_amount}", style_normal)
        ]

        grid_data = [table_headers, row_data]
        
        # Totals Rows
        grid_data.append([
            "", "", "",
            Paragraph("<b>Subtotal (Taxable Value):</b>", style_normal),
            "", "",
            Paragraph(f"<b>{invoice.currency} {invoice.taxable_amount}</b>", style_normal)
        ])

        if invoice.igst and invoice.igst > 0:
            grid_data.append([
                "", "", "",
                Paragraph(f"<b>IGST ({invoice.gst_rate}%):</b>", style_normal),
                "", "",
                Paragraph(f"<b>{invoice.currency} {invoice.igst}</b>", style_normal)
            ])
        elif invoice.cgst and invoice.sgst and (invoice.cgst > 0 or invoice.sgst > 0):
            half_rate = (invoice.gst_rate / Decimal("2.00")) if invoice.gst_rate else Decimal("9.00")
            grid_data.append([
                "", "", "",
                Paragraph(f"<b>CGST ({half_rate}%):</b>", style_normal),
                "", "",
                Paragraph(f"<b>{invoice.currency} {invoice.cgst}</b>", style_normal)
            ])
            grid_data.append([
                "", "", "",
                Paragraph(f"<b>SGST ({half_rate}%):</b>", style_normal),
                "", "",
                Paragraph(f"<b>{invoice.currency} {invoice.sgst}</b>", style_normal)
            ])
        else:
            gst_label = f"GST ({invoice.gst_rate}%)" if invoice.gst_rate else "GST (18%)"
            grid_data.append([
                "", "", "",
                Paragraph(f"<b>{gst_label}:</b>", style_normal),
                "", "",
                Paragraph(f"<b>{invoice.currency} {invoice.gst_amount}</b>", style_normal)
            ])

        grid_data.append([
            "", "", "",
            Paragraph("<b>Grand Total:</b>", style_normal),
            "", "",
            Paragraph(f"<b>{invoice.currency} {invoice.total_amount}</b>", style_normal)
        ])

        item_table = Table(grid_data, colWidths=[40, 160, 60, 80, 50, 80, 70])
        item_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#3F51B5")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,1), 0.5, colors.HexColor("#BDBDBD")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            # Span columns for totals rows
            ('SPAN', (3, 2), (5, 2)),
            ('SPAN', (3, 3), (5, 3)),
            ('SPAN', (3, 4), (5, 4)),
            ('BACKGROUND', (3, 4), (-1, 4), colors.HexColor("#E0E0E0")),
        ]))
        
        # Adjust header text colors to white programmatically
        for i in range(len(table_headers)):
            table_headers[i].style.textColor = colors.white

        story.append(item_table)
        story.append(Spacer(1, 30))

        # --- Declaration and Footer ---
        declaration_text = (
            "<b>Declaration:</b><br/>"
            "We declare that this invoice shows the actual price of the services described and "
            "that all particulars are true and correct. This is a computer generated invoice and "
            "requires no signature."
        )
        story.append(Paragraph(declaration_text, style_normal))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
