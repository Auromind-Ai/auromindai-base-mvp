#!/usr/bin/env python3
"""
Script: cleanup_lead_agent_data.py
Description: Cleans up or resets data collected by Lead & Sales AI Agents
             (Leads, Lead Score History, Template Logs, Sales Pipeline,
             Conversation States, AI Actions, Support Tickets, Followups).

Usage Examples:
    # Dry-run check for a phone number:
    python scripts/cleanup_lead_agent_data.py --phone 9876543210 --dry-run

    # Delete lead details for a specific phone number:
    python scripts/cleanup_lead_agent_data.py --phone 9876543210

    # Delete all lead details for a specific workspace:
    python scripts/cleanup_lead_agent_data.py --workspace-id <workspace_uuid>

    # Reset extracted fields on leads (keep lead record, clear requirement/budget/custom_fields):
    python scripts/cleanup_lead_agent_data.py --phone 9876543210 --reset-fields-only

    # Clean all lead agent data across the platform (with prompt):
    python scripts/cleanup_lead_agent_data.py --all

    # Run in Docker container:
    docker exec -it auromind_backend python scripts/cleanup_lead_agent_data.py --phone 9876543210
"""

import os
import sys
import argparse
import uuid

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text, or_
from app.database import SessionLocal
from app.models.ai_action import (
    Lead,
    SalesPipeline,
    ConversationState,
    AIAction,
    SupportTicket,
    HumanEscalation,
)
from app.models.lead_scoring import LeadScoreHistory, TemplateLog
from app.models.followup import Followup
from app.models.conversation import Conversation


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False


def cleanup_lead_data(
    phone: str = None,
    workspace_id: str = None,
    lead_id: str = None,
    clean_all: bool = False,
    reset_fields_only: bool = False,
    include_conversations: bool = False,
    dry_run: bool = False,
    auto_confirm: bool = False,
):
    if not (phone or workspace_id or lead_id or clean_all):
        print("❌ Error: You must provide at least one filter (--phone, --workspace-id, --lead-id, or --all).")
        return False

    db = SessionLocal()
    try:
        query = db.query(Lead)

        if lead_id:
            if not is_valid_uuid(lead_id):
                print(f"❌ Invalid lead UUID: {lead_id}")
                return False
            query = query.filter(Lead.id == uuid.UUID(lead_id))
            scope_desc = f"Lead ID = {lead_id}"

        elif phone:
            clean_phone = phone.strip()
            query = query.filter(Lead.phone.ilike(f"%{clean_phone}%"))
            scope_desc = f"Phone matching '{clean_phone}'"

        elif workspace_id:
            if not is_valid_uuid(workspace_id):
                print(f"❌ Invalid workspace UUID: {workspace_id}")
                return False
            query = query.filter(Lead.workspace_id == uuid.UUID(workspace_id))
            scope_desc = f"Workspace ID = {workspace_id}"

        elif clean_all:
            scope_desc = "ALL Workspaces (Full Platform Cleanup)"

        leads = query.all()
        lead_ids = [str(l.id) for l in leads]
        conv_ids = [str(l.conversation_id) for l in leads if l.conversation_id]
        ws_ids = list(set([str(l.workspace_id) for l in leads if l.workspace_id]))

        print("\n" + "=" * 60)
        print(f" 🧹 Lead Agent Data Cleanup — Target: {scope_desc}")
        print("=" * 60)
        print(f"📊 Found {len(leads)} matching Lead record(s).")

        if not leads and not (phone and include_conversations):
            print("ℹ️ No matching records found. Nothing to clean.")
            return True

        # Confirmation prompt if not dry-run and not auto-confirmed
        if not dry_run and not auto_confirm:
            action_word = "RESET FIELDS ON" if reset_fields_only else "PERMANENTLY DELETE"
            prompt = f"\n⚠️ Are you sure you want to {action_word} {len(leads)} lead record(s) and related agent data? [y/N]: "
            choice = input(prompt).strip().lower()
            if choice not in ("y", "yes"):
                print("❌ Operation cancelled by user.")
                return False

        if reset_fields_only:
            # Mode A: Reset extracted details on Lead model without removing rows
            print("\n🔄 Resetting extracted lead details...")
            reset_count = 0
            for lead in leads:
                lead.name = None
                lead.requirement = None
                lead.budget = None
                lead.timeline = None
                lead.goal = None
                lead.business_type = None
                lead.product_type = None
                lead.qualification = None
                lead.lead_score = 0
                lead.score = 0
                lead.behavioral_score = 0
                lead.semantic_intent_score = 0
                lead.lead_tier = "cold"
                lead.status = "new"
                lead.custom_fields = {}
                lead.intent_signals = None
                lead.ai_summary = None
                lead.meeting_date = None
                lead.meeting_link = None
                lead.demo_requested = False
                reset_count += 1

            if not dry_run:
                # Also reset sales pipeline and conversation state stages
                if conv_ids:
                    db.execute(
                        text("""
                            UPDATE sales_pipeline
                            SET stage = 'new', intent = NULL, lead_score = NULL,
                                objection_detected = FALSE, payment_required = FALSE, meeting_required = FALSE
                            WHERE conversation_id IN :cids
                        """).bindparams(cids=tuple(conv_ids))
                    )
                    db.execute(
                        text("""
                            UPDATE conversation_states
                            SET current_stage = 'lead', last_intent = NULL, last_agent = NULL,
                                followup_count = 0, repeat_count = 0
                            WHERE conversation_id IN :cids
                        """).bindparams(cids=tuple(conv_ids))
                    )
                db.commit()
                print(f"✅ Successfully reset extracted fields on {reset_count} Lead record(s).")
            else:
                print(f"🔍 [DRY-RUN] Would reset extracted fields on {reset_count} Lead record(s).")

            return True

        # Mode B: Delete leads and all associated agent artifacts
        print("\n🗑️ Deleting associated lead records and agent traces...")

        # 1. Lead Score History & Template Logs
        score_history_count = 0
        template_log_count = 0
        if lead_ids:
            if not dry_run:
                score_history_count = db.execute(
                    text("DELETE FROM lead_score_history WHERE lead_id IN :lids").bindparams(lids=tuple(lead_ids))
                ).rowcount
                template_log_count = db.execute(
                    text("DELETE FROM template_logs WHERE lead_id IN :lids").bindparams(lids=tuple(lead_ids))
                ).rowcount
            else:
                score_history_count = db.execute(
                    text("SELECT count(*) FROM lead_score_history WHERE lead_id IN :lids").bindparams(lids=tuple(lead_ids))
                ).scalar()
                template_log_count = db.execute(
                    text("SELECT count(*) FROM template_logs WHERE lead_id IN :lids").bindparams(lids=tuple(lead_ids))
                ).scalar()

        # 2. Sales Pipeline, Conversation States, AI Actions, Followups, Support Tickets, Escalations
        pipeline_count = 0
        conv_state_count = 0
        ai_action_count = 0
        followup_count = 0
        ticket_count = 0
        escalation_count = 0

        if conv_ids:
            conv_tuple = tuple(conv_ids)
            if not dry_run:
                pipeline_count = db.execute(text("DELETE FROM sales_pipeline WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).rowcount
                conv_state_count = db.execute(text("DELETE FROM conversation_states WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).rowcount
                followup_count = db.execute(text("DELETE FROM followups WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).rowcount
                ticket_count = db.execute(text("DELETE FROM support_tickets WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).rowcount
                escalation_count = db.execute(text("DELETE FROM human_escalations WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).rowcount
            else:
                pipeline_count = db.execute(text("SELECT count(*) FROM sales_pipeline WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).scalar()
                conv_state_count = db.execute(text("SELECT count(*) FROM conversation_states WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).scalar()
                followup_count = db.execute(text("SELECT count(*) FROM followups WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).scalar()
                ticket_count = db.execute(text("SELECT count(*) FROM support_tickets WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).scalar()
                escalation_count = db.execute(text("SELECT count(*) FROM human_escalations WHERE conversation_id IN :cids").bindparams(cids=conv_tuple)).scalar()

        # 3. AI Actions
        if lead_ids or conv_ids:
            if not dry_run:
                # Delete AI Actions matching workspace and context
                if ws_ids:
                    ai_action_count = db.execute(
                        text("DELETE FROM ai_actions WHERE workspace_id IN :wids").bindparams(wids=tuple(ws_ids))
                    ).rowcount
            else:
                if ws_ids:
                    ai_action_count = db.execute(
                        text("SELECT count(*) FROM ai_actions WHERE workspace_id IN :wids").bindparams(wids=tuple(ws_ids))
                    ).scalar()

        # 4. Leads table
        leads_deleted = 0
        if not dry_run:
            for lead in leads:
                db.delete(lead)
                leads_deleted += 1
        else:
            leads_deleted = len(leads)

        # 5. Optional: Include conversations & chat messages
        convs_deleted = 0
        messages_deleted = 0
        if include_conversations:
            conv_list = []
            if conv_ids:
                conv_list = db.query(Conversation).filter(Conversation.id.in_([uuid.UUID(c) for c in conv_ids])).all()
            elif phone:
                conv_list = db.query(Conversation).filter(Conversation.phone.ilike(f"%{phone.strip()}%")).all()

            for c in conv_list:
                cid = str(c.id)
                if not dry_run:
                    messages_deleted += db.execute(text("DELETE FROM messages WHERE conversation_id = :cid"), {"cid": cid}).rowcount
                    db.execute(text("DELETE FROM outbound_messages WHERE conversation_id = :cid"), {"cid": cid})
                    db.delete(c)
                else:
                    messages_deleted += db.execute(text("SELECT count(*) FROM messages WHERE conversation_id = :cid"), {"cid": cid}).scalar()
                convs_deleted += 1

        action_label = "Would delete" if dry_run else "Deleted"
        print("\n" + "-" * 45)
        print(f" 📋 Summary of Changes ({action_label}):")
        print("-" * 45)
        print(f" • Leads:                  {leads_deleted}")
        print(f" • Lead Score History:     {score_history_count}")
        print(f" • Template Logs:          {template_log_count}")
        print(f" • Sales Pipeline:         {pipeline_count}")
        print(f" • Conversation States:    {conv_state_count}")
        print(f" • Followups:              {followup_count}")
        print(f" • Support Tickets:        {ticket_count}")
        print(f" • Human Escalations:      {escalation_count}")
        if ws_ids:
            print(f" • AI Action Logs:         {ai_action_count}")
        if include_conversations:
            print(f" • Conversations:          {convs_deleted}")
            print(f" • Messages:               {messages_deleted}")
        print("-" * 45)

        if dry_run:
            print("\n⚠️ [DRY-RUN MODE] No changes were committed to database.")
        else:
            db.commit()
            print("\n✅ [SUCCESS] Lead agent data cleanup completed successfully.")

        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ [ERROR] An error occurred during lead data cleanup: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clean up or reset details collected by Lead and Sales AI Agents."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--phone", "-p", help="Phone number or partial phone query (e.g. 9876543210)")
    group.add_argument("--workspace-id", "-w", help="Workspace UUID to clean lead data for")
    group.add_argument("--lead-id", "-l", help="Specific Lead UUID to delete")
    group.add_argument("--all", "-a", action="store_true", help="Clean all lead data across all workspaces")

    parser.add_argument(
        "--reset-fields-only",
        action="store_true",
        help="Clear collected fields (budget, timeline, custom_fields, score, etc.) while keeping the lead record intact",
    )
    parser.add_argument(
        "--include-conversations",
        action="store_true",
        help="Also delete the base chat conversations and messages associated with the leads",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the cleanup and print record counts without making any database changes",
    )
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Skip confirmation prompt and proceed immediately",
    )

    args = parser.parse_args()

    cleanup_lead_data(
        phone=args.phone,
        workspace_id=args.workspace_id,
        lead_id=args.lead_id,
        clean_all=args.all,
        reset_fields_only=args.reset_fields_only,
        include_conversations=args.include_conversations,
        dry_run=args.dry_run,
        auto_confirm=args.yes,
    )
