# Instagram Analyzer — Local Script

Scrapes Instagram profiles using your existing Chrome session, analyzes them with Claude Haiku, and updates Airtable automatically.

**This script is local only — never push to main.**

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

2. Make sure you are logged into Instagram in your regular Chrome profile (Default). The script uses your existing session — no credentials required.

3. **Close Chrome completely before running the script.** Chrome locks its profile directory; if Chrome is open, Playwright cannot launch with that profile and the script will fail.

---

## Populate the Queue

Edit `scripts/analysis-queue.json` with the contacts you want to analyze:

```json
[
  {
    "username": "prodbymiku",
    "record_id": "recXXXXXXXXXXXXXX",
    "artist": "Wheezy",
    "current_type": "Autre",
    "current_template": ""
  },
  {
    "username": "beatsbyjayy",
    "record_id": "recYYYYYYYYYYYYYY",
    "artist": "Harry Fraud",
    "current_type": "Beatmaker/Producteur",
    "current_template": "Yo Jay..."
  }
]
```

**Fields:**
- `username` — Instagram handle (no @)
- `record_id` — Airtable record ID (starts with `rec`)
- `artist` — Artist name (used as context in the DM template)
- `current_type` — Current profile type in Airtable (e.g. `"Autre"`)
- `current_template` — Current DM template (can be empty string)

To get record IDs from Airtable, open the Admin → Contacts table and copy from the URL or use the API.

---

## Run

```bash
node scripts/instagram-analyzer.js
```

The script will:
1. Open Chrome with your real profile
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

**"Chrome profile is locked"** — Close all Chrome windows and try again.

**"Rate limited / suspicious activity"** — Stop the script. Wait 30–60 minutes before resuming. Reduce session size by lowering `MAX_PER_SESSION` in the script.

**"Unknown field: analyzed"** — The `analyzed` checkbox field doesn't exist in your Airtable table yet. Create a checkbox field named `analyzed` in the table, or the script will update all other fields and skip that one gracefully.

**Profile is private** — The script detects private accounts and skips them, marking as `private: true` in results.
