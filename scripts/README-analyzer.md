# Instagram Analyzer — Local Script

Scrapes Instagram profiles using a dedicated Chrome profile, analyzes them with Claude Haiku, and updates Airtable automatically.

**This script is local only — never push to main.**

---

## How it works

The script uses its own Chrome profile stored at:
`C:\Users\crayx\beatbridge-analyzer-profile\`

This is completely separate from your main Chrome. Both can be open at the same time — no conflicts.

**First run:** The script opens Chrome and asks you to log into Instagram. Your session is saved to the profile directory and reused on every future run.

---

## Prerequisites

- Node.js 18+
- Google Chrome installed
- Playwright installed: `npm install playwright`
- Vercel CLI installed: `npm install -g vercel`

---

## Setup

1. Pull environment variables from Vercel:
   ```bash
   vercel env pull .env.local
   ```
   This gives the script access to `AIRTABLE_API_KEY` and `ANTHROPIC_API_KEY`.

2. Run the script for the first time:
   ```bash
   node scripts/instagram-analyzer.js
   ```
   A Chrome window opens. Log into Instagram, then press Enter in the terminal.
   Your session is saved — you won't need to log in again.

---

## Populate the Queue

Edit `scripts/analysis-queue.json` with the contacts you want to analyze.
Use the **Analysis Session** page at `/admin/analysis` to generate this file automatically.

Manual format:
```json
[
  {
    "username": "prodbymiku",
    "record_id": "recXXXXXXXXXXXXXX",
    "artist": "Wheezy",
    "current_type": "Autre",
    "current_template": "",
    "bio": ""
  }
]
```

**Fields:**
- `username` — Instagram handle (no @)
- `record_id` — Airtable record ID (starts with `rec`)
- `artist` — Artist name (used as context in the DM template)
- `current_type` — Current profile type in Airtable
- `current_template` — Current DM template (can be empty string)
- `bio` — Current bio/notes from Airtable (can be empty)

---

## Run

```bash
node scripts/instagram-analyzer.js
```

The script will:
1. Open Chrome with the analyzer profile (your main Chrome stays open)
2. Go to each Instagram profile in the queue
3. Scrape bio, followers, posts, highlights
4. Send data to Claude Haiku for analysis
5. Update Airtable: `template`, `Type de profil`, `Notes` (appended), `analyzed` checkbox
6. Save progress to `scripts/analysis-results.json`

---

## Safety Limits

- Random **3–8 second delay** between profiles
- **5-minute pause** every 15 profiles
- **Max 50 profiles per session**
- Stops automatically if Instagram rate-limiting is detected

---

## Resume After Interruption

If the script stops (rate limit, crash, manual Ctrl+C), just run it again:

```bash
node scripts/instagram-analyzer.js
```

It reads `scripts/analysis-results.json` and skips any username already processed. The queue picks up where it left off.

---

## Output Files

| File | Purpose |
|---|---|
| `scripts/analysis-queue.json` | Input — contacts to analyze |
| `scripts/analysis-results.json` | Output — results + resume state (auto-created) |

---

## Troubleshooting

**First-run login prompt doesn't appear** — The profile directory may already exist from a partial run. Delete `C:\Users\crayx\beatbridge-analyzer-profile\` and run again.

**"Rate limited / suspicious activity"** — Stop the script. Wait 30–60 minutes before resuming. Reduce session size by lowering `MAX_PER_SESSION` in the script.

**"Unknown field: analyzed"** — The `analyzed` checkbox field doesn't exist in your Airtable table yet. Create a checkbox field named `analyzed` in the table, or the script will update all other fields and skip that one gracefully.

**Profile is private** — The script detects private accounts and skips them, marking as `private: true` in results.

**Session expired** — If Instagram logs you out of the analyzer profile, delete `C:\Users\crayx\beatbridge-analyzer-profile\` and run again to re-login.
