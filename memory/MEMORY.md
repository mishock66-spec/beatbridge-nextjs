# BeatBridge Project Memory

## Artist Photos Rule
**Always download artist photos locally** — never use external URLs (Wikipedia, unavatar, etc.)
- Save to `public/images/<artistname>.png` (or .jpg matching actual content)
- Reference as `/images/<artistname>.png` in code
- Reason: hotlinking protection on Wikipedia/other hosts blocks external URLs
- Current photos: `public/images/currensy.png` (downloaded from Wikimedia REST API thumbnail)

## Key Files
- `app/artist/[slug]/page.tsx` — artist detail page, ARTIST_META defines photo/igHandle/bio
- `app/artists/page.tsx` — artists listing, ARTISTS array
- `app/page.tsx` — homepage, PREVIEW_ARTISTS array
- `lib/airtable.ts` — Airtable fetch with ISR (`next: { revalidate: 3600 }` already set)
- `components/ConnectionCard.tsx` — connection cards with DM templates
- `components/ArtistNetworkClient.tsx` — filter/search/grid client component
- `components/Navbar.tsx` / `components/WaitlistForm.tsx`

## Color Scheme
- Primary accent: **orange** (`orange-500` / `#f97316`, hover `orange-400`)
- No amber/yellow anywhere in the codebase
- Dark backgrounds: `#111111`, `#0a0a0a`, `#1f1f1f` borders

## ISR Caching
- Airtable fetch already has `next: { revalidate: 3600 }` — caches for 1 hour

## Git Notes
- Remote is sometimes ahead; use `git pull --rebase` before pushing
- Resolve conflicts by taking remote's structural/styling changes + keeping feature changes
