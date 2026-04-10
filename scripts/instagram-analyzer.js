#!/usr/bin/env node
/**
 * BeatBridge Instagram Profile Analyzer
 *
 * Reads a queue of Airtable contacts, visits each Instagram profile,
 * extracts profile data, analyzes with Claude Haiku, and updates Airtable.
 *
 * Usage: node scripts/instagram-analyzer.js
 * Requirements: playwright installed, .env.local present
 *
 * Uses a dedicated Chrome profile — your main Chrome can stay open.
 * First run: prompts you to log into Instagram, then saves the session.
 */

"use strict";

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");
const readline = require("readline");

// ── Config ────────────────────────────────────────────────────────────────────

const QUEUE_FILE    = path.join(__dirname, "analysis-queue.json");
const RESULTS_FILE  = path.join(__dirname, "analysis-results.json");
const ENV_FILE      = path.join(__dirname, "..", ".env.local");

// Dedicated analyzer profile — separate from your main Chrome, no conflict
const ANALYZER_PROFILE_DIR = "C:\\Users\\crayx\\beatbridge-analyzer-profile";

const MAX_PER_SESSION   = 50;
const PAUSE_EVERY       = 15;       // profiles before long pause
const PAUSE_MS          = 5 * 60 * 1000; // 5 minutes
const MIN_DELAY_MS      = 3000;
const MAX_DELAY_MS      = 8000;

const AIRTABLE_BASE  = "appW42oNhB9Hl14bq";
const AIRTABLE_TABLE = "tbl0nVXbK5BQnU5FM";

// ── Env loader ────────────────────────────────────────────────────────────────

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error("❌  .env.local not found.");
    console.error("    Run: npx vercel env pull .env.local");
    process.exit(1);
  }
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
  return env;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function randomDelay(min = MIN_DELAY_MS, max = MAX_DELAY_MS) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(r => setTimeout(r, ms));
}

function loadResults() {
  if (fs.existsSync(RESULTS_FILE)) {
    try { return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8")); } catch { /* */ }
  }
  return {};
}

function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf-8");
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": buf.length } },
      (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

function httpsPatch(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const req = https.request(
      { hostname, path, method: "PATCH", headers: { ...headers, "Content-Length": buf.length } },
      (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

// ── Instagram scraper ─────────────────────────────────────────────────────────

async function scrapeProfile(page, username) {
  const url = `https://www.instagram.com/${username}/`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Let dynamic content settle
    await page.waitForTimeout(2500);

    const current = page.url();
    if (
      current.includes("/accounts/login") ||
      current.includes("/challenge") ||
      current.includes("/suspended")
    ) {
      throw new Error("RATE_LIMIT");
    }

    // Check "page not available"
    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    if (
      bodyText.includes("Sorry, this page isn") ||
      bodyText.includes("This account is private")
    ) {
      return { skipped: true, reason: bodyText.includes("private") ? "Private account" : "Page not found" };
    }

    // Extract everything in one evaluate pass
    const data = await page.evaluate(() => {
      // ── Bio ──────────────────────────────────────────────────────────────
      let bio = "";
      // Most reliable: the <meta name="description"> carries bio + follower counts
      const metaDesc = document.querySelector('meta[name="description"]')?.content || "";

      // Try DOM extraction first
      const bioSelectors = [
        "header section > div > span",
        "header section > div:last-child span",
        "header section span[class]",
        "header span:not([class=''])",
      ];
      for (const sel of bioSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          const t = el.innerText?.trim() || "";
          if (
            t.length > 8 &&
            !t.match(/^\d/) &&
            !t.includes(" followers") &&
            !t.includes(" following") &&
            !t.includes(" posts")
          ) {
            bio = t;
            break;
          }
        }
        if (bio) break;
      }

      // ── Stats ─────────────────────────────────────────────────────────────
      let followers = "", following = "", posts = "";

      // Stats live in <ul> inside the header
      const statItems = [...document.querySelectorAll("header ul li, header section ul li, header section li")];
      for (const li of statItems) {
        const raw = li.innerText.replace(/\s+/g, " ").trim();
        if (/follow/.test(raw) && !/ following/.test(raw)) {
          const m = raw.match(/([\d,. ]+[KkMm]?)\s*follower/i);
          if (m) followers = m[1].trim();
        } else if (/following/.test(raw)) {
          const m = raw.match(/([\d,. ]+[KkMm]?)\s*following/i);
          if (m) following = m[1].trim();
        } else if (/post/.test(raw)) {
          const m = raw.match(/([\d,. ]+[KkMm]?)\s*post/i);
          if (m) posts = m[1].trim();
        }
      }

      // Fallback: parse meta description  "X Followers, Y Following, Z Posts"
      if (!followers && metaDesc) {
        const fm = metaDesc.match(/([\d,.]+[KkMm]?)\s*Follower/i);
        const fgm = metaDesc.match(/([\d,.]+[KkMm]?)\s*Following/i);
        const pm = metaDesc.match(/([\d,.]+[KkMm]?)\s*Post/i);
        if (fm) followers = fm[1];
        if (fgm) following = fgm[1];
        if (pm) posts = pm[1];
      }

      // ── Full name ─────────────────────────────────────────────────────────
      const nameEl =
        document.querySelector("header h1") ||
        document.querySelector("header h2") ||
        document.querySelector("header section > div:first-child span");
      const fullName = nameEl?.innerText?.trim() || "";

      // ── Category ─────────────────────────────────────────────────────────
      let category = "";
      // Category is typically a small label under the username, not a link
      const potentialCats = [...document.querySelectorAll("header section > div span[class]")];
      for (const el of potentialCats) {
        const t = el.innerText?.trim() || "";
        // Category labels are typically short (< 40 chars) and don't look like bios
        if (t.length > 2 && t.length < 40 && t !== fullName && !t.includes("\n")) {
          category = t;
          break;
        }
      }

      // ── External URL ─────────────────────────────────────────────────────
      let externalUrl = "";
      const extLinks = [...document.querySelectorAll(
        'header a[rel~="nofollow"], header a[href^="http"]:not([href*="instagram.com"])'
      )];
      if (extLinks.length > 0) externalUrl = extLinks[0].href;

      // ── Highlights ───────────────────────────────────────────────────────
      // Highlight titles are in spans inside buttons arranged in a scrollable row
      const highlightSpans = [
        ...document.querySelectorAll('ul[style*="overflow"] span, [role="button"] span')
      ];
      const highlights = [...new Set(
        highlightSpans
          .map(el => el.innerText?.trim())
          .filter(t => t && t.length > 0 && t.length < 30 && t !== "New")
      )].slice(0, 8);

      // ── Post alt texts (captions encoded in alt attributes) ──────────────
      const postImgs = [...document.querySelectorAll('article img[alt], main img[alt]')].slice(0, 12);
      const postCaptions = postImgs
        .map(img => img.alt?.trim())
        .filter(t => t && t.length > 5);

      return {
        bio,
        metaDesc,
        followers,
        following,
        posts,
        fullName,
        category,
        externalUrl,
        highlights,
        postCaptions,
      };
    });

    return data;

  } catch (err) {
    if (err.message === "RATE_LIMIT") throw err;
    return { error: err.message };
  }
}

// ── Claude Haiku analysis ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are analyzing Instagram profiles for BeatBridge, a hip-hop networking platform for beatmakers.

Profile type options:
Beatmaker/Producteur, Artiste/Rappeur, Manager, Ingé son, Label, DJ, Studio, Autre

DM template rules:
- 1–2 sentences maximum
- Opens with: "Hey [name],"
- References something SPECIFIC from their profile (bio detail, content type, genre, highlights)
- Ends with exactly one of: "think we could build something?", "would love to connect.", or "open to hear your thoughts."
- NEVER includes a link or URL
- NEVER mentions the beatmaker's name directly — use the literal placeholder: [BEATMAKER_NAME]

Return ONLY valid JSON, nothing else:
{
  "profile_type": "...",
  "template": "Hey [name], I'm [BEATMAKER_NAME], a beatmaker — ...",
  "analysis_note": "One-line reason for the classification",
  "confidence": "high|medium|low"
}`;

async function analyzeWithClaude(env, contact, profileData) {
  const profileCtx = [
    `Username: @${contact.username}`,
    `Current type in database: ${contact.current_type}`,
    `Artist network: ${contact.artist}`,
    `Full name: ${profileData.fullName || "unknown"}`,
    `Bio: ${profileData.bio || "(empty)"}`,
    `Category shown: ${profileData.category || "none"}`,
    `Followers: ${profileData.followers || "unknown"}`,
    `Following: ${profileData.following || "unknown"}`,
    `Posts: ${profileData.posts || "unknown"}`,
    `External URL: ${profileData.externalUrl || "none"}`,
    `Story highlights: ${profileData.highlights?.join(", ") || "none"}`,
    `Recent post captions (up to 6):`,
    ...(profileData.postCaptions?.slice(0, 6).map((c, i) => `  ${i + 1}. ${c.slice(0, 120)}`) || ["  (none visible)"]),
    `---`,
    `Current DM template: ${contact.current_template || "(none)"}`,
  ].join("\n");

  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: profileCtx }],
  });

  const { status, body: raw } = await httpsPost(
    "api.anthropic.com",
    "/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body
  );

  if (status !== 200) throw new Error(`Claude API error ${status}: ${raw.slice(0, 200)}`);

  const resp = JSON.parse(raw);
  if (resp.error) throw new Error(`Claude: ${resp.error.message}`);

  const text = resp.content?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in Claude response: ${text.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]);
}

// ── Airtable update ───────────────────────────────────────────────────────────

async function updateAirtable(env, recordId, analysis, existingBio) {
  const newBio = existingBio
    ? `${existingBio}\n— Analysis: ${analysis.analysis_note}`
    : `— Analysis: ${analysis.analysis_note}`;

  const fields = {
    "template":       analysis.template,
    "Type de profil": analysis.profile_type,
    "Notes":          newBio,
  };

  // Try to set "analyzed" checkbox field if it exists in the base
  // (Create it manually in Airtable as a Checkbox field named "analyzed" if needed)
  fields["analyzed"] = true;

  const body = JSON.stringify({
    records: [{ id: recordId, fields }],
  });

  const { status, body: raw } = await httpsPatch(
    "api.airtable.com",
    `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`,
    {
      "Authorization": `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body
  );

  if (status !== 200) {
    // If error is about unknown field "analyzed", retry without it
    if (raw.includes("analyzed") && raw.includes("Unknown field")) {
      delete fields["analyzed"];
      const body2 = JSON.stringify({ records: [{ id: recordId, fields }] });
      const retry = await httpsPatch(
        "api.airtable.com",
        `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`,
        {
          "Authorization": `Bearer ${env.AIRTABLE_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body2
      );
      if (retry.status !== 200) throw new Error(`Airtable error ${retry.status}: ${retry.body.slice(0, 200)}`);
      return;
    }
    throw new Error(`Airtable error ${status}: ${raw.slice(0, 200)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎵  BeatBridge Instagram Analyzer");
  console.log("══════════════════════════════════\n");

  const env = loadEnv();
  if (!env.ANTHROPIC_API_KEY) { console.error("❌  ANTHROPIC_API_KEY missing from .env.local"); process.exit(1); }
  if (!env.AIRTABLE_API_KEY)  { console.error("❌  AIRTABLE_API_KEY missing from .env.local");  process.exit(1); }

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`❌  Queue file not found: ${QUEUE_FILE}`);
    console.error(`    Populate it with contacts. See scripts/README-analyzer.md`);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8"));
  if (!Array.isArray(queue) || queue.length === 0) {
    console.log("✅  Queue is empty — nothing to analyze.");
    return;
  }

  const results  = loadResults();
  const pending  = queue.filter(c => !results[c.record_id]?.done);
  const batch    = pending.slice(0, MAX_PER_SESSION);

  if (batch.length === 0) {
    console.log("✅  All contacts in the queue have already been analyzed.");
    console.log(`    Results saved in: ${RESULTS_FILE}`);
    return;
  }

  console.log(`📋  Queue total:    ${queue.length}`);
  console.log(`⏳  Pending:        ${pending.length}`);
  console.log(`🚀  This session:   ${batch.length} (max ${MAX_PER_SESSION})`);
  // ── First-run detection ──────────────────────────────────────────────────
  const isFirstRun = !fs.existsSync(ANALYZER_PROFILE_DIR);
  if (isFirstRun) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🆕  First time setup");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("    A new Chrome window is opening.");
    console.log("    Log into Instagram in that window.");
    console.log("    Your session will be saved for all future runs.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.log("✅  Using saved analyzer profile — your main Chrome can stay open.\n");
  }

  // ── Launch Chrome with dedicated analyzer profile ─────────────────────────
  let browser;
  try {
    browser = await chromium.launchPersistentContext(ANALYZER_PROFILE_DIR, {
      channel:  "chrome",
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
      ],
      viewport:  { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
  } catch (err) {
    console.error("\n❌  Failed to launch Chrome:", err.message);
    process.exit(1);
  }

  const page = await browser.newPage();

  // ── First-run: navigate to Instagram and wait for user to log in ─────────
  if (isFirstRun) {
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded" });
    await waitForEnter("\n✅  Logged into Instagram? Press Enter to start analyzing...");
    console.log("\n🚀  Starting analysis...\n");
  }

  // Suppress webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (let i = 0; i < batch.length; i++) {
    const contact = batch[i];

    console.log(`\n[${i + 1}/${batch.length}] @${contact.username}  (${contact.artist} · ${contact.current_type})`);

    // Long pause every PAUSE_EVERY profiles
    if (i > 0 && i % PAUSE_EVERY === 0) {
      const mins = PAUSE_MS / 60000;
      console.log(`\n⏸   ${i} profiles done — cooling down for ${mins} minutes...`);
      for (let s = mins * 60; s > 0; s -= 15) {
        process.stdout.write(`    ${s}s remaining...  \r`);
        await new Promise(r => setTimeout(r, 15000));
      }
      console.log("\n▶   Resuming...\n");
    }

    try {
      // 1. Scrape
      process.stdout.write("  📸  Scraping Instagram profile...");
      const profileData = await scrapeProfile(page, contact.username);

      if (profileData.skipped) {
        console.log(`\n  ⏭   Skipped: ${profileData.reason}`);
        results[contact.record_id] = { username: contact.username, skipped: true, reason: profileData.reason };
        saveResults(results);
        skipped++;
        await randomDelay(2000, 4000);
        continue;
      }

      if (profileData.error) {
        console.log(`\n  ⚠️   Scrape error: ${profileData.error}`);
        results[contact.record_id] = { username: contact.username, error: profileData.error, done: false };
        saveResults(results);
        errors++;
        await randomDelay();
        continue;
      }

      console.log(" ✓");
      console.log(`       Bio: ${(profileData.bio || "(none)").slice(0, 80)}`);
      console.log(`       Followers: ${profileData.followers || "?"}, Posts: ${profileData.posts || "?"}`);

      // 2. Claude analysis
      process.stdout.write("  🤖  Analyzing with Claude Haiku...");
      const analysis = await analyzeWithClaude(env, contact, profileData);
      console.log(` ✓  [${analysis.confidence}]`);
      console.log(`       Type: ${contact.current_type} → ${analysis.profile_type}`);
      console.log(`       Template: ${analysis.template.slice(0, 90)}...`);
      console.log(`       Note: ${analysis.analysis_note}`);

      // 3. Airtable update
      process.stdout.write("  💾  Updating Airtable...");
      await updateAirtable(env, contact.record_id, analysis, profileData.bio);
      console.log(" ✓");

      // Save progress
      results[contact.record_id] = {
        username:      contact.username,
        artist:        contact.artist,
        old_type:      contact.current_type,
        new_type:      analysis.profile_type,
        template:      analysis.template,
        analysis_note: analysis.analysis_note,
        confidence:    analysis.confidence,
        scraped_bio:   profileData.bio,
        followers:     profileData.followers,
        done:          true,
        timestamp:     new Date().toISOString(),
      };
      saveResults(results);
      processed++;

    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        console.log("\n\n🛑  Instagram rate limit or login challenge detected.");
        console.log("    Progress saved — run again later to continue.");
        break;
      }
      console.log(`\n  ❌  ${err.message}`);
      results[contact.record_id] = { username: contact.username, error: err.message, done: false };
      saveResults(results);
      errors++;
    }

    // Random delay between profiles
    if (i < batch.length - 1) {
      const ms = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)) + MIN_DELAY_MS;
      process.stdout.write(`  ⏳  Waiting ${(ms / 1000).toFixed(1)}s...\r`);
      await new Promise(r => setTimeout(r, ms));
      process.stdout.write("                          \r");
    }
  }

  await browser.close();

  const remaining = pending.length - processed - skipped;
  console.log("\n══════════════════════════════════");
  console.log("✅  Session complete");
  console.log(`   Processed:  ${processed}`);
  console.log(`   Skipped:    ${skipped}`);
  console.log(`   Errors:     ${errors}`);
  console.log(`   Results:    ${RESULTS_FILE}`);
  if (remaining > 0) {
    console.log(`\n   Still pending: ${remaining}`);
    console.log("   Run again to continue from where you left off.");
  } else if (pending.length > 0) {
    console.log("\n   All contacts processed! 🎉");
  }
}

main().catch(err => {
  console.error("\n💥  Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
