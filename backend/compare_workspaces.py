import sys
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

print("=== 1. SEARCH FOR NON-EMPTY META FIELDS IN ALL WORKSPACES ===")
res = db.execute(text("SELECT id, name, meta_waba_id, meta_phone_number_id, meta_business_id, meta_display_phone, CASE WHEN meta_access_token IS NOT NULL THEN length(meta_access_token) ELSE NULL END as token_len FROM workspaces WHERE meta_waba_id IS NOT NULL OR meta_phone_number_id IS NOT NULL OR meta_access_token IS NOT NULL")).fetchall()

print(f"Workspaces with Meta columns non-null: {len(res)}")
for r in res:
    print(dict(r._mapping))

print("\n=== 2. SEARCH FOR SPECIFIC WORKSPACE ID eef0519e-142a-4a6f-b073-411764a755f3 ===")
ws_eef = db.execute(text("SELECT * FROM workspaces WHERE id::text = 'eef0519e-142a-4a6f-b073-411764a755f3'")).fetchall()
print(f"Workspace eef0519e found: {len(ws_eef)}")
for r in ws_eef:
    d = dict(r._mapping)
    if d.get('meta_access_token'):
        d['meta_access_token'] = f"PRESENT (len={len(d['meta_access_token'])})"
    print(d)

print("\n=== 3. DUMP ALL WORKSPACES AND THEIR NON-NULL COLUMNS ===")
all_ws = db.execute(text("SELECT * FROM workspaces")).fetchall()
print(f"Total workspaces: {len(all_ws)}")
for r in all_ws:
    d = dict(r._mapping)
    non_nulls = {k: v for k, v in d.items() if v is not None and k != 'meta_access_token'}
    if d.get('meta_access_token'):
        non_nulls['meta_access_token'] = f"PRESENT (len={len(d['meta_access_token'])})"
    print(f"WS ID: {d['id']} | Name: {d['name']} | Fields: {non_nulls}")

print("\n=== 4. SEARCH ALL TABLES FOR STRING '1091122894' or '143137951' or 'eef0519e' ===")
tables_res = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
tables = [t[0] for t in tables_res]

for tbl in tables:
    try:
        cnt_109 = db.execute(text(f"SELECT count(*) FROM \"{tbl}\" WHERE CAST(row_to_json(\"{tbl}\") AS text) LIKE '%1091122894082907%'")).scalar()
        cnt_143 = db.execute(text(f"SELECT count(*) FROM \"{tbl}\" WHERE CAST(row_to_json(\"{tbl}\") AS text) LIKE '%1431379519043801%'")).scalar()
        cnt_eef = db.execute(text(f"SELECT count(*) FROM \"{tbl}\" WHERE CAST(row_to_json(\"{tbl}\") AS text) LIKE '%eef0519e-142a-4a6f-b073-411764a755f3%'")).scalar()
        if cnt_109 > 0 or cnt_143 > 0 or cnt_eef > 0:
            print(f"Table '{tbl}' -> 1091122894082907: {cnt_109} | 1431379519043801: {cnt_143} | eef0519e: {cnt_eef}")
            rows = db.execute(text(f"SELECT * FROM \"{tbl}\" WHERE CAST(row_to_json(\"{tbl}\") AS text) LIKE '%eef0519e%' OR CAST(row_to_json(\"{tbl}\") AS text) LIKE '%1091122894082907%' OR CAST(row_to_json(\"{tbl}\") AS text) LIKE '%1431379519043801%'")).fetchall()
            for r in rows:
                row_dict = dict(r._mapping)
                if 'meta_access_token' in row_dict and row_dict['meta_access_token']:
                    row_dict['meta_access_token'] = f"PRESENT (len={len(row_dict['meta_access_token'])})"
                print("  Row:", row_dict)
    except Exception as e:
        print(f"Error searching {tbl}: {e}")

db.close()
