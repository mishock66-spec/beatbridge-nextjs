"""
BeatBridge — Import Wheezy remaining profiles to Airtable
Run: python import_wheezy_all.py
"""
import requests
import time
import csv
import json

# ⚠️ Replace with your Airtable API key
# Get it at: airtable.com/account → API → Generate API key
AIRTABLE_API_KEY = "YOUR_AIRTABLE_API_KEY"  # Set via env or replace before running

BASE_ID = "appW42oNhB9Hl14bq"
TABLE_ID = "tbl0nVXbK5BQnU5FM"

headers = {
    "Authorization": f"Bearer {AIRTABLE_API_KEY}",
    "Content-Type": "application/json"
}

# Already imported usernames — skip these
ALREADY_IMPORTED = {
    'dripczn', '_nrique305', 'silenthustler', 'vinnywisco', 'judobeatz',
    'californiazomb', '1sirfredo', 'nickkolous', 'boeskee', 'carlo.the.lo',
    'phvnzo', 'currency1st', '_djonthetrack', 'winstonwolfesprotege',
    'onthetrackwin', 'wolfproducer', 'producerbenford', 'velvet_negroni',
    'livingthalife01', 'thefatboi_', 'thismfslimey', 'goodmorningestrada',
    'oscar_zulu', 'dnyc3_bdm', 'beatsbydsims', 'ivymixedit', 'fanoforreal',
    'nicklin.jn', 'dollaz_r3', 'chrisfrmdallas', 'winnbillion', 'krissadity',
    'thead901', 'prodbymiku', '_suavethedon', 'demonchild_1', 'sachie.pond',
    'knowbody_at_all', 'eazydabarba'
}

def load_profiles(csv_path):
    profiles = []
    with open(csv_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                followers = int(row.get('Followers', 0) or 0)
                is_private = row.get('Is private', 'No').strip().lower()
                username = row.get('userName', '').strip()

                if not username or is_private == 'yes':
                    continue
                if followers < 500 or followers > 50000:
                    continue
                if username in ALREADY_IMPORTED:
                    continue

                profiles.append({
                    'username': username,
                    'name': row.get('fullName', '').strip(),
                    'followers': followers,
                    'bio': row.get('Biography', '').strip()[:300],
                    'email': row.get('Email', '').strip(),
                    'profileUrl': row.get('profileUrl', '').strip(),
                    'category': row.get('Category', '').strip(),
                })
            except:
                continue

    profiles.sort(key=lambda x: x['followers'])
    return profiles


def import_profile(profile):
    notes_parts = []
    if profile['bio']:
        notes_parts.append(f"Bio: {profile['bio'][:200]}")
    if profile['email']:
        notes_parts.append(f"Email: {profile['email']}")

    data = {
        "fields": {
            "Pseudo Instagram": profile['username'],
            "Nom complet": profile['name'] or profile['username'],
            "Lien profil": profile['profileUrl'],
            "Nombre de followers": profile['followers'],
            "Type de profil": "Autre",
            "Suivi par": "Wheezy",
            "Statut de contact": "À contacter",
            "Notes": " | ".join(notes_parts) if notes_parts else ""
        }
    }

    resp = requests.post(
        f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}",
        headers=headers,
        json=data
    )
    return resp.status_code == 200, resp.text


def main():
    csv_path = "wheezy_followers_1-1069.csv"  # Put CSV in same folder as this script

    print("Loading profiles...")
    profiles = load_profiles(csv_path)
    print(f"Found {len(profiles)} profiles to import\n")

    success = 0
    errors = 0

    for i, profile in enumerate(profiles, 1):
        ok, response = import_profile(profile)
        if ok:
            success += 1
            print(f"OK {i}/{len(profiles)} @{profile['username']} - {profile['followers']} followers")
        else:
            errors += 1
            print(f"ERR {i}/{len(profiles)} @{profile['username']} - {response[:80]}")

        time.sleep(0.25)  # Stay under rate limit

    print(f"\n✅ Done! {success} imported, {errors} errors")


if __name__ == "__main__":
    main()
