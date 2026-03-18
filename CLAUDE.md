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

## ABSOLUTE RULE — External Navigation
- Never use window.open() or <a target='_blank'> anywhere in the codebase. Always use window.location.href for ALL external navigation. This applies to every component, every page, every button, no exceptions.
- Reason: window.open() and target="_blank" are blocked by aggressive ad blockers on mobile (e.g. Free Adblock Browser). window.location.href always works.

## MOBILE FIRST
- Every UI change must be tested mentally for mobile screens (< 640px). Always use responsive Tailwind classes (sm:, md:, lg:).
- Never add elements to the navbar without checking mobile overflow. Navbar must always fit on 375px screens.
- "Get Early Access" button in Navbar is hidden on mobile (hidden sm:flex) — never make it visible on mobile.
- Artists and Community nav links are hidden on mobile (hidden sm:block) — navigation is simplified on small screens.
- Contact cards on the dashboard (DashboardClient) must use flex-col on mobile, flex-row on sm+. Status dropdown and Send DM button must be in the same actions row, never overflowing the card.
- ConnectionCard action buttons (Copy DM, Send DM) must be full-width on mobile (w-full, flex-col on mobile, flex-row on sm+). Buttons must never overlap other elements.
- All pages must have minimum px-4 padding on mobile.

## CONTACT CARD RULES
- Instagram @usernames on contact cards MUST always be clickable links to the contact's Instagram profile wall (profileUrl), opening in a new tab. Never link to ig.me for the username — that is reserved for the Send DM button only.
- Never use <a target='_blank'> or window.open() for any Instagram links — always use window.location.href to avoid popup blockers on all mobile browsers.

## Self-Improvement Loop

After ANY correction or fix requested by the user:
1. Identify the root cause of the mistake
2. Add a specific rule to CLAUDE.md that prevents this exact mistake from happening again
3. End every correction session with: "CLAUDE.md updated — rule added to prevent this mistake in the future."

This file gets smarter with every session.
