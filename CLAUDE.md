# Claude Code Instructions — BeatBridge

## RÈGLES ABSOLUES
- ALWAYS push directly to main branch
- NEVER create feature branches
- NEVER create pull requests
- Always run: git add -A && git commit -m "..." && git push origin main

## PROJECT INFO
- Live site: https://beatbridge-nextjs.vercel.app
- Airtable base: appW42oNhB9Hl14bq
- Local folder: C:\Users\crayx\beatbridge-nextjs

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

## Self-Improvement Loop

After ANY correction or fix requested by the user:
1. Identify the root cause of the mistake
2. Add a specific rule to CLAUDE.md that prevents this exact mistake from happening again
3. End every correction session with: "CLAUDE.md updated — rule added to prevent this mistake in the future."

This file gets smarter with every session.
