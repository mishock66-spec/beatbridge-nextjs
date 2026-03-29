"""
BeatBridge — 2-Step DM Migration
1. Creates the "follow_up" field in Airtable (via Meta API)
2. Updates all records: strips [LINK] from template (adds closing question),
   sets follow_up to the short reply message.

Run: python migrate_followup.py
"""
import requests
import time
import re

AIRTABLE_API_KEY = "YOUR_AIRTABLE_PERSONAL_ACCESS_TOKEN"  # set before running
BASE_ID = "appW42oNhB9Hl14bq"
TABLE_ID = "tbl0nVXbK5BQnU5FM"

HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_API_KEY}",
    "Content-Type": "application/json"
}

FOLLOW_UP_MSG = "Appreciate the reply — here it is: [LINK]"

# Regex matches any [LINK] / [YOUR LINK] / [YOUR LISTENING LINK] variant,
# plus the connector phrase before it (colon, dash, em-dash, space combos)
LINK_RE = re.compile(
    r'[:\s\u2014\u2013-]*\[(?:YOUR\s+(?:LISTENING\s+)?)?LINK\]\s*\.?$',
    re.IGNORECASE,
)


def pick_closing_question(text: str) -> str:
    t = text.lower()
    if "pass" in t or "forward" in t or "circle" in t:
        return " — would you be open to hearing it?"
    if "check" in t:
        return " — got a minute to check it out?"
    return " — think it could fit your lane?"


def clean_template(template: str) -> str:
    """Remove [LINK] from template; ensure it ends with a question."""
    cleaned = LINK_RE.sub("", template).rstrip()
    if cleaned and not cleaned.endswith("?"):
        cleaned += pick_closing_question(cleaned)
    return cleaned


# ─── Step 1: create field via Meta API ───────────────────────────────────────

def create_follow_up_field():
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/{TABLE_ID}/fields"
    resp = requests.post(url, headers=HEADERS, json={
        "name": "follow_up",
        "type": "multilineText",
        "description": "Step 2 follow-up message (with link) — sent only after contact replies",
    })
    if resp.status_code in (200, 201):
        print("OK: 'follow_up' field created in Airtable")
    elif resp.status_code == 422 and "already exists" in resp.text.lower():
        print("INFO: 'follow_up' field already exists -- skipping creation")
    else:
        print(f"WARN: Could not create field via API (status {resp.status_code}): {resp.text[:120]}")
        print("   -> Please create it manually in Airtable: a Long Text field named exactly 'follow_up'")


# ─── Step 2: fetch + update records ──────────────────────────────────────────

def fetch_all_records():
    records = []
    offset = None
    while True:
        params = {"pageSize": "100", "fields[]": ["template", "follow_up"]}
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}",
            headers=HEADERS,
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        time.sleep(0.2)
    return records


def update_record(record_id, template, follow_up):
    resp = requests.patch(
        f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}/{record_id}",
        headers=HEADERS,
        json={"fields": {"template": template, "follow_up": follow_up}},
    )
    return resp.status_code == 200


def main():
    print("\n=== BeatBridge: 2-Step DM Migration ===\n")

    create_follow_up_field()
    print()

    print("Fetching all Airtable records...")
    records = fetch_all_records()
    print(f"Found {len(records)} records total\n")

    needs_update = [
        r for r in records
        if r.get("fields", {}).get("template", "").strip()
        and not r.get("fields", {}).get("follow_up", "").strip()
    ]
    print(f"{len(needs_update)} records need template update + follow_up set\n")

    ok = err = skipped = 0
    for i, record in enumerate(needs_update, 1):
        rid = record["id"]
        original = record["fields"].get("template", "").strip()

        if not original:
            skipped += 1
            continue

        new_template = clean_template(original)
        follow_up = FOLLOW_UP_MSG

        success = update_record(rid, new_template, follow_up)
        if success:
            ok += 1
            print(f"  OK  {i}/{len(needs_update)}  {rid[:8]}")
        else:
            err += 1
            print(f"  ERR {i}/{len(needs_update)}  {rid[:8]}")

        time.sleep(0.22)  # stay well under 5 req/s rate limit

    print(f"\nDone -- {ok} updated, {err} errors, {skipped} skipped")


if __name__ == "__main__":
    main()
