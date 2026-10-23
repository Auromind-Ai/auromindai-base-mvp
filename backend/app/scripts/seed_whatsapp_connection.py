import argparse
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.core.logger import logger


def seed_whatsapp(
    mode: str = "full",
    workspace_id: str | None = None,
    phone: str = "+91 98765 43210",
    phone_number_id: str = "109876543210987",
    waba_id: str = "102938475610293",
    business_id: str = "192837465019283",
    access_token: str = "EAABw_orbion_mock_token_seeded_active_session_demo",
):
    """
    Seeds WhatsApp connection data into one or all workspaces.

    Modes:
      - 'full': WhatsApp connected, 2FA enabled, Business verified (100% complete).
      - 'step1': WhatsApp connected only, 2FA & verification pending (33% progress).
      - 'reset': Disconnects WhatsApp and reverts onboarding fields.
    """
    db: Session = SessionLocal()
    try:
        query = db.query(Workspace)
        if workspace_id:
            import uuid
            try:
                ws_uuid = uuid.UUID(workspace_id)
            except ValueError:
                ws_uuid = workspace_id
            query = query.filter(Workspace.id == ws_uuid)

        workspaces = query.all()
        if not workspaces:
            print(f"[!] No workspaces found matching query.")
            return

        print(f"[*] Found {len(workspaces)} workspace(s) to process. Mode: {mode.upper()}")

        for ws in workspaces:
            if mode == "reset":
                ws.meta_access_token = None
                ws.meta_phone_number_id = None
                ws.meta_waba_id = None
                ws.meta_business_id = None
                ws.meta_display_phone = None
                ws.meta_2fa_enabled = False
                ws.meta_business_verification_status = "not_verified"
                ws.meta_onboarding_completed_at = None
                ws.meta_onboarding_dismissed = False
                print(f"  [-] Reset/Disconnected WhatsApp on workspace: '{ws.name}' ({ws.id})")
            elif mode == "step1":
                ws.meta_access_token = access_token
                ws.meta_phone_number_id = phone_number_id
                ws.meta_waba_id = waba_id
                ws.meta_business_id = business_id
                ws.meta_display_phone = phone
                ws.meta_2fa_enabled = False
                ws.meta_business_verification_status = "not_verified"
                ws.meta_onboarding_completed_at = None
                ws.meta_onboarding_dismissed = False
                print(f"  [+] Seeded Step 1 (WhatsApp connected, 33%) on: '{ws.name}' ({ws.id})")
            else:  # full
                ws.meta_access_token = access_token
                ws.meta_phone_number_id = phone_number_id
                ws.meta_waba_id = waba_id
                ws.meta_business_id = business_id
                ws.meta_display_phone = phone
                ws.meta_2fa_enabled = True
                ws.meta_business_verification_status = "verified"
                ws.meta_onboarding_completed_at = datetime.now(timezone.utc)
                ws.meta_onboarding_dismissed = False
                print(f"  [+] Seeded Full Connection (100% complete) on: '{ws.name}' ({ws.id})")

        db.commit()
        print("[✓] WhatsApp seeding completed successfully!")
    except Exception as exc:
        db.rollback()
        print(f"[x] Error seeding WhatsApp data: {exc}", file=sys.stderr)
        raise exc
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed WhatsApp connection data for Orbion workspaces.")
    parser.add_argument(
        "--mode",
        choices=["full", "step1", "reset"],
        default="full",
        help="Seed mode: 'full' (100%% complete), 'step1' (WhatsApp connected only, 33%%), or 'reset' (disconnect).",
    )
    parser.add_argument("--workspace-id", type=str, default=None, help="Optional workspace UUID to seed.")
    parser.add_argument("--phone", type=str, default="+91 98765 43210", help="WhatsApp display phone number.")
    parser.add_argument("--phone-id", type=str, default="109876543210987", help="Meta Phone Number ID.")
    parser.add_argument("--waba-id", type=str, default="102938475610293", help="Meta WABA ID.")
    parser.add_argument("--biz-id", type=str, default="192837465019283", help="Meta Business Account ID.")

    args = parser.parse_args()
    seed_whatsapp(
        mode=args.mode,
        workspace_id=args.workspace_id,
        phone=args.phone,
        phone_number_id=args.phone_id,
        waba_id=args.waba_id,
        business_id=args.biz_id,
    )


if __name__ == "__main__":
    main()
