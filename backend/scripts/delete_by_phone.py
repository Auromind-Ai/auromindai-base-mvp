
import sys
import os
import re
from sqlalchemy import or_

# Ensure project `backend` package is on sys.path so `import app` works when
# running the script from repo root or from inside the container.
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.database import SessionLocal
from app.models import Conversation


def normalize(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def find_conversations(db, phone: str):
    n = normalize(phone)
    return db.query(Conversation).filter(
        or_(
            Conversation.phone == phone,
            Conversation.phone == f"+{phone}",
            Conversation.phone.like(f"%{phone}"),
            Conversation.phone.like(f"%{n}"),
        )
    ).all()


def main():
    if len(sys.argv) < 2:
        print("Usage: delete_by_phone.py <phone-number>")
        return 2

    phone = sys.argv[1].strip()
    db = SessionLocal()
    try:
        convs = find_conversations(db, phone)
        if not convs:
            print("No conversations found for:", phone)
            return 0

        print(f"Found {len(convs)} conversation(s) for {phone}:")
        for c in convs:
            print(f" - id={c.id} workspace={c.workspace_id} phone={c.phone}")

        print("\nThis will permanently DELETE the conversation(s) and all related records (messages, leads, events, etc).")
        resp = input('Type DELETE to confirm: ')
        if resp != 'DELETE':
            print('Aborted by user.')
            return 1

        for c in convs:
            db.delete(c)
        db.commit()
        print(f"Deleted {len(convs)} conversation(s) for {phone}.")
        return 0
    finally:
        db.close()


if __name__ == '__main__':
    raise SystemExit(main())
