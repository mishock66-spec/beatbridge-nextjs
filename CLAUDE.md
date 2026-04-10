# Claude Code Instructions — BeatBridge

## CONTEXT FILES
Always read these files at the start of each session:
- ARTIST_ONBOARDING.md — artist onboarding pipeline

## ARTIST ONBOARDING
When adding a new artist to BeatBridge, ALWAYS read ARTIST_ONBOARDING.md first and follow every step exactly.
Never skip steps or improvise the onboarding pipeline.

## 🚨 CRITICAL RULES — NEVER BREAK THESE

### DOCUMENTATION FILES
- Documentation files (.md) always go in the ROOT of the project (same level as package.json). NEVER in app/, components/, or any subdirectory. This includes ARTIST_ONBOARDING.md, CLAUDE.md, README.md, and any future documentation files.

### STATUS PERSISTENCE
- Contact statuses are ALWAYS stored in Supabase dm_status table
- NEVER use localStorage, sessionStorage, or React state alone for statuses
- The upsert MUST use these exact fields: user_id, contact_id, status
- onConflict must always be 'user_id,contact_id'
- contact_id = Airtable record ID (the "id" field of the record)
- user_id = Clerk user ID
- On page load: fetch ALL statuses for current user in ONE bulk query
- On status change: upsert to Supabase IMMEDIATELY, before any other logic
- Any feature added to handleStatusChange must come AFTER the upsert

### DM COUNTER
- The daily DM counter increments ONLY when status changes TO "DM sent"
- Counter reads from dm_activity table (action="sent", created_at >= today local time)
- dm_activity insert uses: user_id, action="sent", created_at=now()
- Counter NEVER increments on "Send DM →" button click
- StickyDMBar is a pure display component — it receives dmSentCount as a prop
- The parent component (ArtistNetworkClient) owns the counter state
- Daily reset uses browser local time (new Date()) not UTC

### SUPABASE QUERIES
- ALWAYS use await with destructuring: const { data, error } = await supabase...
- NEVER use .then()/.catch() chaining on Supabase calls
- ALWAYS check for errors: if (error) console.error(error)
- Table names: dm_status, dm_activity, user_profiles, point_transactions

### DATA SOURCES
- Contact data (names, handles, followers, types): Airtable ONLY
- User data (statuses, points, profile): Supabase ONLY
- NEVER query Supabase for contact data
- NEVER query Airtable for user data

## RÈGLES ABSOLUES
- ALWAYS push directly to main branch
- NEVER create feature branches
- NEVER create pull requests
- Always run: git add -A && git commit -m "..." && git push origin main
- Artist connection counts on roster cards must always reflect the TOTAL number of Airtable records filtered by Suivi par = artist name. Never hardcode connection counts. Use fetchAirtableCount() from lib/airtable.ts in an async server component with revalidate = 0.
- Dashboard artist sections are generated dynamically from Airtable "Suivi par" field values via fetchAllAirtableGrouped() in lib/airtable.ts. Never hardcode artist names in the dashboard. Any new artist added to Airtable automatically appears on the dashboard. Add slug + photo metadata to ARTIST_METADATA in app/dashboard/page.tsx when a new artist is onboarded.
- Each artist card on /artists shows ONLY Instagram and Twitter/X links — never YouTube, Spotify, or other platforms. When adding a new artist to the ARTISTS array in app/artists/page.tsx, include a `socials` object with `instagram` and `twitter` keys. Always verify the exact profile URLs before adding them.
- Artist network pages (/artist/[slug]) must show Instagram and Twitter/X links in the header (via the SocialLinks component from components/SocialLinks.tsx). When adding a new artist to ARTIST_META in app/artist/[slug]/page.tsx, always include a `socials` object with verified Instagram and Twitter/X URLs.
- If an artist has a public email, add it as an email icon next to their social links on their network page. Add an `email` field to their ARTIST_META entry and pass it as the `email` prop to SocialLinks. The icon uses `mailto:` and matches the gray/orange-on-hover style of the other social icons.

## PROJECT INFO
- Live site: https://beatbridge-nextjs.vercel.app
- Airtable base: appW42oNhB9Hl14bq
- Local folder: C:\Users\crayx\beatbridge-nextjs

## ARTIST ROSTER
- Curren$y: slug=currensy, Airtable filter=["Curren$y","CurrenSy"], Instagram=spitta_andretti, Twitter=CurrenSy_Spitta
- Harry Fraud: slug=harry-fraud, Airtable filter="Harry Fraud", Instagram=harryfraud, Twitter=HarryFraud, Email=HarryFraudBeats@gmail.com
- Wheezy: slug=wheezy, Airtable filter="Wheezy", Instagram=wheezy, Twitter=wheezy0uttahere, photo=/images/wheezy.jpg
- Juke Wong: slug=juke-wong, Airtable filter="Juke Wong", Instagram=jukewong, Twitter=jukewong, photo=/images/juke-wong.jpg
- Southside: slug=southside, Airtable filter="Southside", Instagram=808mafiaboss, Twitter=808mafiaboss, photo=/images/southside.jpg
- Metro Boomin: slug=metro-boomin, Airtable filter="Metro Boomin", Instagram=metroboomin, Twitter=MetroBoomin, photo=/images/metro-boomin.jpg

## ABSOLUTE RULES — Adding a new artist
1. ALWAYS save artist photo to /public/artists/[slug].jpg — no placeholder allowed. NEVER use unavatar.io — it returns generic 1.5KB placeholders at build time. To find the real photo URL: search the web for "[artist name] producer photo site:studiotalksevents.com OR site:framerusercontent.com" to get a direct image URL, then download with `curl -L "[url]" -o public/artists/[slug].jpg`. Verify the file is >10KB before committing. Reference path in code: `/images/[slug].jpg` (in public/images/ — NOT public/artists/ which conflicts with the /artists Next.js route). All photo references across artists/page, page.tsx, dashboard/page, and dedicated artist pages must point to this path.
2. ALWAYS create dedicated page at app/artist/[slug]/page.tsx (not just [slug] catch-all) AND follower-range sub-pages at app/artist/[slug]/[range]/page.tsx with the same RANGE_CONFIG + DEFAULT_TEMPLATE pattern as Wheezy/Juke Wong.
3. ALWAYS classify ALL contacts by analyzing their bio (Notes field) BEFORE launch. Classification options: Beatmaker/Producteur, Ingé son, Manager, Artiste/Rappeur, Autre. Never leave Type de profil as "Autre" without bio analysis. Write a script in scripts/process-[slug].mjs and run it.
4. ALWAYS generate template DM + follow_up for every contact with an empty template field. Format: "Yo [name], [bio reference] — [beatmaker pitch], think it could fit your lane?" follow_up is always: "Appreciate the reply — here it is: [LINK]"
5. Instagram + Twitter/X only — never YouTube, Spotify or other platforms on artist cards or pages. NEVER add a social link that has not been explicitly verified and provided. If an artist has no Twitter, show no Twitter icon — do not invent one.
6. Add artist to: app/artists/page.tsx ARTISTS array, app/page.tsx PREVIEW_ARTISTS, app/dashboard/page.tsx ARTIST_METADATA, lib/airtable.ts ARTIST_ORDER.

## ABSOLUTE RULE — External Navigation (Device-Aware)
- Send DM and Instagram links use device-aware navigation: window.location.href on mobile (avoids popup blockers), window.open(_blank) on desktop (opens new tab). Always use this pattern for external links.
- Use the helper: `const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);` then `isMobile ? window.location.href = url : window.open(url, '_blank', 'noopener,noreferrer')`.
- Reason: window.open() is blocked by ad blockers on mobile (e.g. Free Adblock Browser), but on desktop it provides the better UX of opening a new tab.

## MOBILE FIRST
- Every UI change must be tested mentally for mobile screens (< 640px). Always use responsive Tailwind classes (sm:, md:, lg:).
- Never add elements to the navbar without checking mobile overflow. Navbar must always fit on 375px screens.
- "Get Early Access" button in Navbar is hidden on mobile (hidden sm:flex) — never make it visible on mobile.
- Artists and Community nav links are hidden on mobile (hidden sm:block) — navigation is simplified on small screens.
- Contact cards on the dashboard (DashboardClient) must use flex-col on mobile, flex-row on sm+. Status dropdown and Send DM button must be in the same actions row, never overflowing the card.
- ConnectionCard action buttons (Copy DM, Send DM) must be full-width on mobile (w-full, flex-col on mobile, flex-row on sm+). Buttons must never overlap other elements.
- All pages must have minimum px-4 padding on mobile.

## ABSOLUTE RULE — No Orphan Pages
- Every new page created must be accessible from the site — either via the navbar, footer, or a clearly visible link. Never create orphan pages that can only be accessed by typing the URL directly.

## CONTACT CARD RULES
- Instagram @usernames on contact cards MUST always be clickable links to the contact's Instagram profile wall (profileUrl), opening in a new tab. Never link to ig.me for the username — that is reserved for the Send DM button only.
- Always use the device-aware navigation pattern (see ABSOLUTE RULE above) for Instagram links — window.location.href on mobile, window.open(_blank) on desktop.

## DESIGN SYSTEM — Apple-style Premium Aesthetic
- Background: #080808 (not #0a0a0a)
- Font: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif
- Body text: #a0a0a0 (not pure gray-400)
- Small labels: uppercase + tracking-[0.1em]
- Heading font-weight: font-light (300) for hero/sections, NOT font-black
- Heading letter-spacing: tracking-[0.02em]
- Cards: bg-white/[0.025] backdrop-blur-md border border-white/[0.08] rounded-2xl — NOT bg-[#111111]
- Card hover: hover:border-white/[0.15] hover:-translate-y-0.5 transition-all duration-200
- Buttons: rounded-lg (NOT rounded-full), bg-gradient-to-br from-[#f97316] to-[#f85c00]
- Button hover: hover:opacity-90 hover:scale-[1.02] transition-all duration-200
- Filter pill active: shadow-[0_0_12px_rgba(249,115,22,0.3)]
- Navbar: scroll-aware — transparent at top, backdrop-blur-[20px] bg-[rgba(8,8,8,0.85)] on scroll (scrollY > 10), h-14
- Animations: CSS @keyframes fadeInUp via hero-animate + hero-delay-N classes; scroll-triggered via .scroll-animate → .is-visible (IntersectionObserver in ScrollAnimations.tsx)
- Card stagger: animationDelay: `${Math.min(index * 50, 400)}ms` on connection card wrappers
- All animations respect prefers-reduced-motion via globals.css media query
- Sticky filter bar: top-14 (not top-16) to match the h-14 navbar
- Touch targets: min-h-[44px] on all interactive form elements
- Gradient text: text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]

## Self-Improvement Loop

After ANY correction or fix requested by the user:
1. Identify the root cause of the mistake
2. Add a specific rule to CLAUDE.md that prevents this exact mistake from happening again
3. End every correction session with: "CLAUDE.md updated — rule added to prevent this mistake in the future."

This file gets smarter with every session.

## DATA STORAGE — Supabase
- User DM status is stored in Supabase `dm_status` table, never localStorage.
- Table columns: user_id (Clerk user.id), artist_slug, username (no @ prefix), status, updated_at.
- On status change: upsert with onConflict: "user_id,artist_slug,username".
- On page load: fetch from Supabase filtered by user_id. Fallback to "To contact" if not signed in or no record.
- RLS is DISABLED on dm_status — Clerk and Supabase use different auth systems so auth.uid() always returns null. Never re-enable RLS on this table without setting up Clerk JWT integration first.
- revalidate = 0 always. No middleware.ts. All text in English.
- Contact cards have two badges: reply probability (based on followers + email) and contact priority (based on profile type). Logic in lib/scoreContact.ts. Always include the ScoringDisclaimer component on every artist page explaining these are estimates only.
- NEVER use auth() from @clerk/nextjs/server in API routes — it requires clerkMiddleware() which is not used. Pass userId from the client via useUser() in the request body instead.

## 2-STEP DM STRATEGY — CORE FEATURE
- CRITICAL: DM templates must NEVER contain links or URLs in the first message (template field). Links only go in the follow_up field.
- The template field = ice-breaker (no link, ends with a question).
- The follow_up field = short reply message with [LINK] placeholder (sent only after contact replies).
- The 2-step DM strategy is a core product feature. Never regress to single-message templates with links.
- AirtableRecord type includes followUp field (mapped from "follow_up" Airtable column).
- app/api/generate-dm returns { ice_breaker } only — never { dm } or { follow_up }.
- Step 2 follow-up DM only appears on a ConnectionCard when contact status is set to "Replied".
- AI generation only generates Step 1 (ice-breaker). Step 2 is always the fixed template from Airtable follow_up field.

## CLERK + SUPABASE LOADING ORDER — useEffect Guard Rule
- In any hook that fetches from Supabase using userId, NEVER call setLoaded(true) when userId is undefined. That fires prematurely while Clerk is still initialising.
- Correct pattern: `if (!supabase) { setLoaded(true); return; }` then `if (!userId) return;` (separate guards).
- Reason: Clerk loads asynchronously. If you set loaded=true before userId resolves, modal/conditional logic downstream fires against stale null state and can never be undone by the real fetch completing.

## CONTACT STATUS — Supabase Only, Bulk Fetch, contact_id Key
- Contact statuses are ALWAYS stored in Supabase dm_status table. Never use localStorage for status.
- `contact_id` = `${artistSlug}_${username}` (no @ prefix, lowercase). This is the canonical unique key for a contact.
- On status change: upsert to dm_status with `onConflict: "user_id,contact_id"`. Always set both `contact_id` and legacy `artist_slug`/`username` fields.
- Bulk fetch on page load: ArtistNetworkClient fetches all dm_status rows for the user+artist in one query and passes `initialStatus`/`initialIceBreaker` down as props to each ConnectionCard. Never do per-card individual Supabase fetches for status.
- ConnectionCard initialises status from `initialStatus` prop (default "To contact"). No per-card useEffect fetch.
- DM counter: inserting/deleting dm_activity rows uses `contact_id` (not contact_username+artist_slug).

## ABSOLUTE RULE — No Event Handlers in Server Components
- Never add React event handlers (onError, onClick, onChange, etc.) inline inside server components (async page functions without "use client").
- If a component needs an event handler, it MUST be extracted into a separate file with "use client" at the top.
- Reason: event handlers in server components cause "Application error: a server-side exception" and take down the entire site.
- Pattern: create components/MyClientComponent.tsx with "use client", import and use it in the server component.

## CREDITS SYSTEM — Disabled
- Credits system is disabled. Points are for gamification and leaderboard ranking only.
- Credits are purchased via Stripe only — not earned through points.
- Never add credits logic to /api/points/award or any points-related code.
- Do not display credits balance anywhere in the UI.

## SELECTED STATE — Use Inline Styles for Critical Visual Indicators
- When a selected state must be clearly visible (e.g. account age options, onboarding choices), use inline styles with explicit values, NOT Tailwind opacity modifiers.
- Correct: `style={{ border: "2px solid #f97316", background: "rgba(249, 115, 22, 0.1)" }}`
- Wrong: `className="border-orange-500/60 bg-orange-500/20"` — too subtle, visually indistinguishable at a glance.

## PREMIUM GATING BY ARTIST FOLLOWER COUNT
- For each artist, contacts ABOVE the artist's own follower count are Premium-only.
- Free/Pro users only see contacts up to the artist's follower count.
- Example: Juke Wong (~9.2K followers) → 500-5K and 5K-10K are free; 10K+ ranges are Premium-locked.
- Always add a "Contact the artist directly" section (orange accent card) if the artist has under 50K followers.
  - Link to https://ig.me/m/[igHandle] for the direct DM button.
- Premium-locked range pages use PremiumGateClient (components/PremiumGateClient.tsx):
  - Renders blurred preview cards + lock overlay for Pro/trial users.
  - Renders full ArtistNetworkClient + CSV download button for Premium users.
- CSV export route pattern: /api/export/[artist-slug] — GET with ?userId=... query param.
  - Check user_profiles.plan === "premium" before serving the CSV.
  - Return 403 if not premium.
- Mark premium ranges in RANGE_CONFIG with `premium: true` and in RANGES array too.
- Range nav pills: use purple color scheme for premium-locked ranges, orange for free ranges.
