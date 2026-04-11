# BeatBridge — Artist Onboarding Pipeline

This document covers the complete pipeline for adding a new artist to BeatBridge.
All rules here are canonical — any conflict with inline code comments, this file wins.

---

## ARTIST ONBOARDING PIPELINE

### Step 1 — Apify CSV Export
- Export Instagram followers via Apify
- CSV columns used: `userName`, `fullName`, `profileUrl`, `followersCount`, `biography`, `category`

### Step 2 — CSV Reformatting

Map CSV columns to Airtable fields:

| CSV column | Airtable field | Notes |
|---|---|---|
| `userName` | Pseudo Instagram | |
| `fullName` | Nom complet | |
| `profileUrl` | Lien profil | |
| `followersCount` | Nombre de followers | |
| `biography` | Notes | Prefix with `"Bio: "` |
| `category` | Type de profil | See category mapping below |
| *(fixed)* | Statut de contact | Always `"À contacter"` |
| *(fixed)* | Suivi par | Artist name (fixed for all rows) |
| *(empty)* | template | Leave empty |
| *(empty)* | follow_up | Leave empty |

**Category mapping:**

| Apify `category` value | Airtable `Type de profil` |
|---|---|
| "Music producer" / "Musician/Band" | Beatmaker/Producteur |
| "Artist" / "Rapper" | Artiste/Rappeur |
| "Sound engineer" | Ingé son |
| "Record label" | Label |
| "DJ" | DJ |
| "Manager" | Manager |
| "Studio" | Studio |
| Everything else | Autre |

> Choice ID for Autre: `selmOadl7YJihw4H9`

### Step 3 — Airtable Import
- Import into base `appW42oNhB9Hl14bq`, table `tbl0nVXbK5BQnU5FM`
- Map columns by name (they match exactly after reformatting)
- Leave `template`, `follow_up`, `analyzed` fields empty
- `Statut de contact` = `"À contacter"` on all rows

### Step 4 — Reclassify "Autre" contacts
- Run AI reclassification on all contacts where Type = `"Autre"`
- Use `biography` / Notes field to determine real profile type
- Update `Type de profil` in Airtable
- Available via `/admin` → Contacts → AI Assistant
- Or via `/admin` → Templates → Regenerate

### Step 5 — Generate DM templates
- Use admin "Regenerate Templates" feature for the artist
- Or use the Add Artist+ pipeline which does it automatically
- Use EXACT same logic as `app/api/admin/regenerate-templates/route.ts`
- `[BEATMAKER_NAME]` stays as a **literal placeholder** — never replaced in code, ever
- Always use the contact's bio if available (strip `"Bio: "` prefix first)
- Never the same template twice
- Always polite and respectful
- **Never include a link in the Step 1 template**
- Step 2 (`follow_up`) only appears when contact status = `"Replied"`
- `follow_up` is always: `"Appreciate the reply — here it is: [LINK]"`

## DM TEMPLATE FORMAT BY PROFILE TYPE

**Beatmaker/Producteur:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. Always looking to connect with producers who stay in the studio, think we could build something?"

**Ingé son:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. The right mix makes all the difference, would love your ears on something I've been working on, think it could be worth your time?"

**Manager:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. Got something that could make sense for your artists, think it's worth a listen?"

**Label/Studio:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. Got some records that could make sense for your roster, think it's worth a listen?"

**Artiste/Rappeur:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. Got a record I think fits your lane, think it could work?"

**DJ:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. Got something that could hit different in a set, think it could fit your rotation?"

**Photographe/Vidéaste:**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. [bioRef]. You capture the vibe, I make the sound, could be interesting to connect, think it could work?"

**Autre (no bio / no clear music connection):**
> "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. I noticed [Artist] follows you — I've been working on some records that I think could fit their sound. Would you be open to passing along a quick listen? I'd really appreciate it."

**bioRef rules:**
- Extract something SPECIFIC from Notes/bio if available
- Strip `"Bio: "` prefix before using
- If no bio: `"caught your page through [Artist]'s network"`
- `[BEATMAKER_NAME]` stays as literal placeholder — NEVER replaced
- Never include a link in Step 1 template

### Step 6 — Artist page setup
- Add artist to artists config with: `name`, `slug`, `instagram`, `twitter`, `airtableFilter` (`"Suivi par"` value)
- Create `/artist/[slug]` page with follower-range sub-pages:
  - `0-500`, `500-5K`, `5K-10K`, `10K-20K`, `20K-30K`, `30K-40K`, `40K-50K`
  - Max 50 contacts per page with pagination
- Create Top Contacts page (max 50 curated contacts)
- Add artist photo to `/public/images/[slug].jpg`
  - **NEVER `/public/artists/`** — conflicts with Next.js `/artists` routing
  - Find artist photos on `studiotalksevents.com` first
  - File must be >10KB (never a placeholder or generic avatar)

### Step 7 — Follower caps (CRITICAL)
- All artists: max **50K** followers shown on site
- **Juke Wong EXCEPTION**: max **10K** (he has ~9,200 followers himself)
- Top Contacts: same caps apply

### Step 8 — Update site
- Add artist card to `/artists` page
- Update dashboard (picks up automatically via Airtable `Suivi par` filter)
- Trigger "NEW NETWORK UNLOCKED" banner via `/admin` → Banner
- Add artist to `/admin` Artists list
- Update `CLAUDE.md` with new artist slug, Airtable filter, social links

---

## CURRENT ARTISTS

| Artist | Slug | Airtable filter | Instagram | Twitter |
|---|---|---|---|---|
| Wheezy | `wheezy` | `"Wheezy"` | @wheezy | @wheezy0uttahere |
| Curren$y | `currensy` | `"Curren$y"` or `"CurrenSy"` | @spitta_andretti | @CurrenSy_Spitta |
| Harry Fraud | `harry-fraud` | `"Harry Fraud"` | @harryfraud | @HarryFraud |
| Juke Wong | `juke-wong` | `"Juke Wong"` | @jukewong | — |
| Southside | `southside` | `"Southside"` | @808mafiaboss | @808mafiaboss |
| Metro Boomin | `metro-boomin` | `"Metro Boomin"` | @metroboomin | @MetroBoomin |

---

## AIRTABLE FIELD IDs (confirmed)

| Field ID | Field name |
|---|---|
| `fldNrahDUrSgVljvc` | Pseudo Instagram |
| `fldJEVNir9beLv8Ph` | Nom complet |
| `fldKKIDVHyYSg2lNh` | Lien profil |
| `fldvT6sZIjc1ypnMw` | Nombre de followers |
| `fld8dCqjrnqCsRSog` | Type de profil |
| `fldgITyqXWRJMA5tV` | Statut de contact |
| `fld7C9ekFhBlwcy2L` | Suivi par |
| `fldpLozVCrvYj62i0` | Notes (bio) |
| `fldy8ho1lxBh8iB3n` | template |
| `fldvT8Qq6LDFzcRgJ` | follow_up |
| `fldLRttkukXJiVs0u` | analyzed (checkbox) |

---

## SEND DM FORMAT
- Always use: `https://ig.me/m/USERNAME` (official Meta format)
- Opens DM conversation directly
- Use `window.location.href` for navigation on mobile (never `window.open` or `target="_blank"` on mobile)
- Desktop: `window.open(url, '_blank', 'noopener,noreferrer')`

---

## CRITICAL RULES (never override)

- **NEVER** put artist photos in `/public/artists/` — Next.js routing conflict with the `/artists` page
- **ALWAYS** `revalidate = 0` on all admin and artist pages
- **NEVER** touch `middleware.ts`
- Push directly to `main`, never create feature branches
- All visible content in English without exception
- Mobile-first responsive design always
- `[BEATMAKER_NAME]` is always a literal placeholder — never replaced in code
- Top Contacts follower cap: 50K max (10K for Juke Wong)
- Artist connection counts dynamically fetched from Airtable (never hardcoded)
- `StatusDropdown`: always use React Portal (position fixed + `getBoundingClientRect`)
- Send DM: `window.location.href` on mobile, `window.open` on desktop
- Instagram usernames on contact cards: clickable links to profile wall (not `ig.me`)
- Every new page must be accessible from navbar or footer (no orphan pages)
- Never add event handlers inline inside server components — extract to `"use client"` components

---

## SELF-IMPROVEMENT LOOP

After every correction or fix, add the lesson learned to `CLAUDE.md` as a specific rule
that prevents the same mistake from happening again.
End every correction session with: `"CLAUDE.md updated — rule added to prevent this mistake in the future."`
