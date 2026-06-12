# /work Timeline Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-screen timeline overlay with a dedicated `/work` page — a pinned horizontal GSAP "ride" through every project with depth blur, rolling text, a per-digit year odometer, date-accurate ruler ticks, a chapter rail, live filters, and countdown numbering.

**Architecture:** Second Vite entry (`site/work.html` → `site/src/work-main.jsx` → `Work.jsx`) sharing the existing GSAP setup, project feed, styles tokens, and an extracted `Footer`/`Reveal`. The ride is an imperative GSAP engine inside a `useGSAP` scope (React renders the card DOM once; filters/rail/ruler/odometer are managed by direct DOM mutation, exactly like the validated demo at `docs/superpowers/demos/2026-06-12-work-horizontal-ride-final.html`). Mobile/touch gets a vertical year-grouped list; reduced motion gets a static list.

**Tech Stack:** React 18, Vite (multi-page), GSAP 3.13 (ScrollTrigger, ScrollSmoother, SplitText, @gsap/react), Cloudflare Workers Assets hosting.

**Spec:** `docs/superpowers/specs/2026-06-12-work-timeline-revamp-design.md`

---

## Project-specific conventions (read first)

- **Build output is committed.** `npm run build` emits `index.html`, `work.html`, and `assets/` into the repo root. Always rebuild before staging.
- **Commits:** Antoine runs commits himself (GPG passphrase). For each commit step: stage files, write the message to a temp file, then hand him the command `! git commit -F C:/Users/antoi/AppData/Local/Temp/<name>.txt` (forward slashes — the `!` shell eats backslashes). **Never add a Claude co-author trailer.**
- **Do not stage** `package.json`, `package-lock.json`, `wrangler.json`, `wrangler.jsonc`, `.assetsignore`, or `.gitignore` — they carry Antoine's own in-progress edits. `vite.config.js` is a special case handled in Task 3.
- **Verification** is headless Chrome over CDP (no test framework exists in this repo). Serve the repo root with `npx http-server -p 8742 -c-1 .` (background) and run the node scripts below. The page pulls live data from a Google Sheet, so assert on invariants (counts > 0, geometry, no JS errors), not exact row counts.

### One-time setup for verification

- [ ] **Step 0.1: Create the shared CDP helper**

Write to `C:\Users\antoi\AppData\Local\Temp\site-review\cdp.js`:

```js
// Reusable headless-Chrome CDP runner for verify scripts.
const { execFile } = require("child_process");
const path = require("path");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = async function run({ port, profile, url, width = 1440, height = 900 }, fn) {
  const chrome = execFile(CHROME, ["--headless=new", "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.env.TEMP, "site-review", profile)}`,
    `--window-size=${width},${height}`, "about:blank"]);
  let tabs;
  for (let i = 0; i < 40; i++) { await sleep(500); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} }
  const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 250));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url }); await sleep(5500);
  try { await fn({ ev, send, sleep, errors }); } finally {
    console.log("js errors:", errors.length ? errors.join("\n") : "none");
    ws.close(); chrome.kill(); process.exit(0);
  }
};
```

- [ ] **Step 0.2: Start the static server (background)**

Run (background): `npx http-server -p 8742 -c-1 .` from `C:\Users\antoi\Antoine-Rossi`.
Expected: "Available on: http://127.0.0.1:8742". Leave running for the whole plan.

---

### Task 1: Extract `Reveal` and `Footer` into shared components

`Work.jsx` needs `Footer` (and `Footer` needs `Reveal`); both currently live inside `App.jsx` and aren't exported.

**Files:**
- Create: `site/src/components/Reveal.jsx`
- Create: `site/src/components/Footer.jsx`
- Modify: `site/src/App.jsx` (remove the two definitions, add imports)

- [ ] **Step 1.1: Create `site/src/components/Reveal.jsx`**

Move lines 30–56 of `App.jsx` (the `REVEAL_VARIANTS` const and `Reveal` function) into this new file, verbatim, with this wrapper:

```jsx
import React, { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../animation/gsap-setup.js";

/* ─── Reveal system ───
   Same API as the old CSS version, now driven by ScrollTrigger so every
   entrance shares one easing language (expo-out slides, back-out springs). */
const REVEAL_VARIANTS = {
  "reveal-up":     { from: { y: 32, autoAlpha: 0 },              duration: 0.8,  ease: "expo.out" },
  "reveal-spring": { from: { y: 28, scale: 0.97, autoAlpha: 0 }, duration: 0.9,  ease: "back.out(1.4)" },
  "reveal-fade":   { from: { autoAlpha: 0 },                     duration: 0.9,  ease: "power2.out" },
  "reveal-left":   { from: { x: -24, autoAlpha: 0 },             duration: 0.7,  ease: "expo.out" },
  "reveal-scale":  { from: { scale: 0.96, y: 16, autoAlpha: 0 }, duration: 0.85, ease: "back.out(1.2)" },
};

export default function Reveal({ children, type = "reveal-up", delay = 0, style = {}, tag = "div" }) {
  const ref = useRef(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    const v = REVEAL_VARIANTS[type] || REVEAL_VARIANTS["reveal-up"];
    gsap.from(ref.current, {
      ...v.from,
      duration: v.duration,
      ease: v.ease,
      delay: delay / 1000,
      scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
    });
  }, []);
  const Tag = tag;
  return <Tag ref={ref} style={style}>{children}</Tag>;
}
```

- [ ] **Step 1.2: Create `site/src/components/Footer.jsx`**

Move `MY_SITES` (App.jsx:1031–1039) and `Footer` (App.jsx:1041–1081) verbatim into:

```jsx
import React from "react";
import Reveal from "./Reveal.jsx";

const MY_SITES = [
  { label: "antoinerossi.nz", href: "https://antoinerossi.nz", note: "This site" },
  { label: "rossi.nz", href: "https://rossi.nz", note: "Personal" },
  { label: "tachyon-studios.com", href: "https://tachyon-studios.com", note: "Studio" },
  { label: "downloadanything.nz", href: "https://downloadanything.nz", note: "Project" },
  { label: "hostanything.app", href: "https://hostanything.app", note: "Project" },
  { label: "podesentar.com", href: "https://podesentar.com", note: "Project" },
  { label: "shortlink.nz", href: "https://shortlink.nz", note: "Project" },
];

export default function Footer() {
  /* body identical to the current App.jsx Footer — copy it unchanged */
}
```

(Copy the exact JSX body from App.jsx:1042–1080; do not retype it.)

- [ ] **Step 1.3: Update `App.jsx`**

- Delete `REVEAL_VARIANTS` + `Reveal` (lines 30–56) and `MY_SITES` + `Footer` (lines 1031–1081, including the `/* ─── Footer ─── */` comment).
- Add imports after line 5:

```jsx
import Reveal from "./components/Reveal.jsx";
import Footer from "./components/Footer.jsx";
```

- [ ] **Step 1.4: Build and verify the home page is unchanged**

Run: `npm run build` → Expected: `✓ built` with no errors.

Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t1.js`:

```js
const run = require("./cdp.js");
run({ port: 9370, profile: "p-t1", url: "http://localhost:8742/index.html" }, async ({ ev }) => {
  console.log(await ev(`JSON.stringify({
    footer: !!document.querySelector("footer"),
    sites: document.querySelectorAll("footer .footer-link").length,
    hero: !!document.querySelector("#smooth-content"),
  })`));
});
```

Run: `node C:\Users\antoi\AppData\Local\Temp\site-review\verify-t1.js`
Expected: `{"footer":true,"sites":8,"hero":true}` (7 site links + privacy link) and `js errors: none`.

- [ ] **Step 1.5: Stage and hand off commit**

```
git add site/src/components/ site/src/App.jsx index.html assets/
```

Write message to `C:/Users/antoi/AppData/Local/Temp/t1-msg.txt`:

```
Extract Reveal and Footer into shared components

The upcoming /work page needs Footer (which needs Reveal); move both
out of App.jsx unchanged so two entries can share them.
```

Tell Antoine: `! git commit -F C:/Users/antoi/AppData/Local/Temp/t1-msg.txt`

---

### Task 2: Optional `oss` column in the project feed

**Files:**
- Modify: `site/src/projects-feed.js:14`

- [ ] **Step 2.1: Add the sixth (optional) column to the row parser**

In `site/src/projects-feed.js`, change line 14 from:

```js
      return { name: (c[0] || "").trim(), desc: (c[1] || "").trim(), date: (c[2] || "").trim(), url: (c[3] || "").trim(), type: (c[4] || "").trim() };
```

to:

```js
      return { name: (c[0] || "").trim(), desc: (c[1] || "").trim(), date: (c[2] || "").trim(), url: (c[3] || "").trim(), type: (c[4] || "").trim(), oss: (c[5] || "").trim() };
```

The sheet has no column F today, so `oss` is `""` for every row — the page falls back to github.com URL inference (Task 4). If Antoine later adds a column with `1`/`yes`, it overrides.

- [ ] **Step 2.2: Build, stage with Task 3's commit**

Run: `npm run build` → Expected: `✓ built`. No separate commit — this rides along with Task 3 (it's one line and only meaningful once /work consumes it).

---

### Task 3: Multi-page build + `/work` skeleton

**Files:**
- Create: `site/work.html`
- Create: `site/src/work-main.jsx`
- Create: `site/src/work.css`
- Create: `site/src/Work.jsx`
- Modify: `vite.config.js`

- [ ] **Step 3.1: Add the second entry to `vite.config.js`**

⚠️ This file has uncommitted edits by Antoine (Cloudflare plugin). Make ONLY this change, and at commit time ask him explicitly whether committing the whole file (his edits included) is okay.

Replace the `build` block with:

```js
import { fileURLToPath, URL } from "node:url";
```

(at top, after existing imports) and:

```js
  build: {
    outDir: "..",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./site/index.html", import.meta.url)),
        work: fileURLToPath(new URL("./site/work.html", import.meta.url)),
      },
    },
  },
```

- [ ] **Step 3.2: Create `site/work.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <title>Work — Antoine Rossi</title>
  <meta name="description" content="Every project Antoine Rossi has shipped — a scroll-driven ride through the full timeline, newest first." />
  <meta name="theme-color" content="#FAFAF8" />
  <meta property="og:title" content="Work — Antoine Rossi" />
  <meta property="og:description" content="Every project, newest first — counting down to nº01." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://antoinerossi.nz/work" />
  <meta property="og:image" content="https://antoinerossi.nz/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <noscript>This site needs JavaScript. You can find me at <a href="https://github.com/Antoinenz">github.com/Antoinenz</a>.</noscript>
  <script type="module" src="/src/work-main.jsx"></script>
</body>
</html>
```

- [ ] **Step 3.3: Create `site/src/work-main.jsx`**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./work.css";
import Work from "./Work.jsx";

createRoot(document.getElementById("root")).render(<Work />);
```

- [ ] **Step 3.4: Create `site/src/work.css`** (page styles; uses the site's existing tokens `--bg/--text/--text-muted/--border/--blue/--blue-faint/--bounce`)

```css
/* ─── /work page ─── */

.wk-topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.wk-topbar .wk-home { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); font-size: 13.5px; font-weight: 500; transition: color 0.2s ease; }
.wk-topbar .wk-home:hover { color: var(--blue); }
.wk-topbar-label { font-size: 11px; font-weight: 600; letter-spacing: 0.22em; color: var(--text-muted); }

.wk-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.22em; color: var(--blue); text-transform: uppercase; }

.wk-hero { min-height: 88vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 24px 0; }
.wk-hero h1 { font-size: clamp(36px, 6vw, 84px); font-weight: 600; letter-spacing: -0.035em; line-height: 1.04; margin: 20px 0 16px; }
.wk-hero h1 .wk-hl { display: block; }
.wk-sub { color: var(--text-muted); font-size: clamp(15px, 1.5vw, 18px); max-width: 620px; line-height: 1.6; }
.wk-stats { display: flex; gap: 56px; margin-top: 48px; min-height: 86px; }
.wk-stat { text-align: center; }
.wk-stat-num { font-size: clamp(34px, 4.6vw, 62px); font-weight: 600; letter-spacing: -0.03em; }
.wk-stat-lab { font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); margin-top: 4px; }
.wk-cue { margin-top: 40px; color: var(--text-muted); font-size: 12px; letter-spacing: 0.14em; }
.wk-cue::after { content: "↓"; display: block; text-align: center; margin-top: 6px; font-size: 16px; }

.wk-loading, .wk-error { text-align: center; padding: 16vh 24px; color: var(--text-muted); font-size: 16px; }
.wk-loading { animation: wk-pulse 1.4s ease-in-out infinite; }
@keyframes wk-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.wk-error p { margin-bottom: 22px; }

/* ─── the ride ─── */
.wk-ride { height: 100vh; position: relative; overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.wk-circ { position: absolute; border-radius: 50%; pointer-events: none; }

.wk-ruler { position: absolute; top: 58%; left: 0; height: 1px; width: 800vw; background: var(--border); }
.wk-tick { position: absolute; top: -28px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; color: var(--text-muted); white-space: nowrap; transform: translateX(-50%); }
.wk-tick::after { content: ""; position: absolute; left: 50%; top: 22px; width: 1px; height: 14px; background: var(--border); }

.wk-odo { position: absolute; right: 4vw; bottom: 5vh; pointer-events: none; }
.wk-odo-row { display: flex; }
.wk-odo-col { height: 17vw; overflow: hidden; }
.wk-odo-col-inner { display: flex; flex-direction: column; }
.wk-odo-col-inner div {
  font-size: 17vw; font-weight: 600; letter-spacing: -0.04em; line-height: 1;
  height: 17vw; display: flex; align-items: center; justify-content: center;
  color: transparent; -webkit-text-stroke: 1.3px var(--border);
}

.wk-filters { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.wk-fchip {
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.04em; cursor: pointer;
  border: 1px solid var(--border); border-radius: 99px; padding: 7px 16px;
  background: var(--bg); color: var(--text-muted);
  transition: all 0.3s var(--bounce); user-select: none; font-family: inherit;
}
.wk-fchip:hover { transform: scale(1.08); color: var(--text); }
.wk-fchip.on { background: var(--blue); border-color: var(--blue); color: #fff; }

.wk-track { position: absolute; top: 0; left: 0; height: 100%; display: flex; align-items: center; gap: 8vw; padding: 0 115vw 0 72vw; will-change: transform; }
.wk-card { flex-shrink: 0; width: min(520px, 70vw); position: relative; will-change: transform, filter; }
.wk-num { font-size: 96px; font-weight: 600; letter-spacing: -0.04em; color: color-mix(in srgb, var(--border) 70%, var(--bg)); line-height: 1; }
.wk-inner { margin-top: -36px; position: relative; }
.wk-date { font-size: 11px; letter-spacing: 0.18em; color: var(--blue); font-weight: 700; margin-bottom: 8px; }
.wk-inner h3.wk-title { font-size: clamp(28px, 3.6vw, 46px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.06; }
.wk-desc { color: var(--text-muted); font-size: 15.5px; line-height: 1.6; margin-top: 10px; max-width: 420px; }
.wk-visit { display: inline-block; margin-top: 14px; color: var(--blue); font-weight: 600; font-size: 14px; text-decoration: none; }
.wk-visit:hover { text-decoration: underline; }
.wk-oss { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--blue); border: 1px solid var(--blue-faint); border-radius: 99px; padding: 2px 8px; margin-left: 10px; vertical-align: 2px; }

.wk-rail {
  position: fixed; left: 26px; top: 50%; transform: translateY(-50%); z-index: 40;
  display: flex; flex-direction: column; gap: 20px;
  opacity: 0; pointer-events: none; transition: opacity 0.35s ease;
}
.wk-rail.on { opacity: 1; pointer-events: auto; }
.wk-rail-item {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; letter-spacing: 0.1em; color: var(--text-muted);
  transition: color 0.25s ease, transform 0.3s var(--bounce);
}
.wk-rail-item .wk-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); transition: background 0.25s ease, transform 0.3s var(--bounce); }
.wk-rail-item:hover { color: var(--text); transform: translateX(3px); }
.wk-rail-item.active { color: var(--blue); }
.wk-rail-item.active .wk-dot { background: var(--blue); transform: scale(1.5); }
.wk-rail-item .wk-cnt { font-size: 10px; font-weight: 500; color: var(--text-muted); opacity: 0.7; letter-spacing: 0.05em; }

/* ─── mobile / static list ─── */
.wk-list { max-width: 720px; margin: 0 auto; padding: 4vh 24px 10vh; }
.wk-filters-list { position: static; transform: none; margin-bottom: 36px; }
.wk-yeargroup { margin-bottom: 16px; }
.wk-yearhead { position: sticky; top: 52px; z-index: 5; background: var(--bg); font-size: 22px; font-weight: 600; letter-spacing: -0.02em; padding: 10px 0; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.wk-yearhead span { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-left: 8px; }
.wk-li { display: flex; gap: 16px; padding: 18px 0; border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, var(--bg)); }
.wk-li-num { font-size: 28px; font-weight: 600; letter-spacing: -0.03em; color: color-mix(in srgb, var(--border) 80%, var(--text-muted)); line-height: 1.1; flex-shrink: 0; width: 44px; }
.wk-li-body h3 { font-size: clamp(17px, 4.2vw, 21px); font-weight: 600; letter-spacing: -0.02em; margin: 2px 0 4px; }
.wk-li-body p { font-size: 14px; color: var(--text-muted); line-height: 1.6; }
.wk-li-body .wk-date { margin-bottom: 0; }
.wk-li-body .wk-visit { margin-top: 8px; font-size: 13.5px; }

/* ─── outro ─── */
.wk-outro { text-align: center; padding: 16vh 24px 10vh; }
.wk-outro h2 { font-size: clamp(26px, 4vw, 44px); font-weight: 600; letter-spacing: -0.03em; margin-bottom: 12px; }
.wk-outro p { color: var(--text-muted); font-size: 16px; margin-bottom: 30px; }
.wk-outro-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
```

- [ ] **Step 3.5: Create `site/src/Work.jsx` (skeleton — data, modes, shell; ride and list arrive in later tasks)**

```jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { projectCache, projectError, projectFetch } from "./projects-feed.js";
import { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP, reducedMotion, SMOOTH_BASE } from "./animation/gsap-setup.js";
import Footer from "./components/Footer.jsx";

/* ─── data shaping ─── */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function shapeProjects(rows) {
  return rows.map(r => {
    const p = (r.date || "").split("/").map(Number);
    const valid = p.length === 3 && p[1] >= 1 && p[1] <= 12 && p[2] > 1970;
    return {
      ...r,
      year: valid ? String(p[2]) : "Earlier",
      label: valid ? `${MONTHS[p[1] - 1]} ${p[2]}` : "EARLIER",
      oss: /^(1|yes)$/i.test(r.oss || "") || /github\.com/i.test(r.url || ""),
    };
  });
}

function useProjects() {
  const [state, setState] = useState(() =>
    projectCache
      ? { rows: shapeProjects(projectCache), error: false, loading: false }
      : { rows: null, error: projectError, loading: !projectError });
  useEffect(() => {
    if (state.rows || state.error) return;
    let on = true;
    projectFetch.then(() => {
      if (!on) return;
      setState(projectCache
        ? { rows: shapeProjects(projectCache), error: false, loading: false }
        : { rows: null, error: true, loading: false });
    });
    return () => { on = false; };
  }, []);
  return state;
}

/* ride on desktop fine pointers, list on touch/small, static under reduced motion */
function useMode() {
  const get = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
    if (window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) return "ride";
    return "list";
  };
  const [mode, setMode] = useState(get);
  useEffect(() => {
    const qs = ["(prefers-reduced-motion: reduce)", "(min-width: 768px) and (pointer: fine)"]
      .map(q => window.matchMedia(q));
    const on = () => setMode(get());
    qs.forEach(q => q.addEventListener("change", on));
    return () => qs.forEach(q => q.removeEventListener("change", on));
  }, []);
  return mode;
}

/* filter chips derived from the data: All + up to 6 most common types + Open source */
function buildChips(rows) {
  const counts = {};
  rows.forEach(r => { const t = (r.type || "").toLowerCase(); if (t) counts[t] = (counts[t] || 0) + 1; });
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
  return [
    { id: "all", label: "All", match: () => true },
    ...types.map(t => ({ id: "t:" + t, label: t.charAt(0).toUpperCase() + t.slice(1), match: r => (r.type || "").toLowerCase() === t })),
    { id: "oss", label: "Open source", match: r => r.oss },
  ];
}

/* ─── chrome ─── */
function TopBar() {
  return (
    <div className="wk-topbar">
      <a href="/" className="wk-home">
        <img src="/icon.svg" alt="" height="22" />
        <span>← Home</span>
      </a>
      <span className="wk-topbar-label">THE WORK</span>
    </div>
  );
}

function WorkHero({ rows }) {
  const scope = useRef(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    scope.current.querySelectorAll(".wk-hl").forEach((line, i) => {
      const split = new SplitText(line, { type: "chars", mask: "chars" });
      gsap.from(split.chars, { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.02, delay: 0.15 + i * 0.09 });
    });
    gsap.to(scope.current.querySelector(".wk-cue"), { y: 8, repeat: -1, yoyo: true, duration: 0.7, ease: "sine.inOut" });
  }, { scope });
  useGSAP(() => {
    if (!rows) return;
    const nums = scope.current.querySelectorAll(".wk-stat-num");
    if (reducedMotion()) { nums.forEach(n => { n.textContent = n.dataset.n; }); return; }
    nums.forEach(n => gsap.to(n, { textContent: +n.dataset.n, snap: { textContent: 1 }, duration: 1.4, ease: "power2.out", delay: 0.3 }));
  }, { scope, dependencies: [rows] });
  const total = rows ? rows.length : 0;
  const years = rows && rows.length
    ? (() => { const ys = rows.filter(r => r.year !== "Earlier").map(r => +r.year); return ys.length ? Math.max(...ys) - Math.min(...ys) + 1 : 1; })()
    : 0;
  return (
    <section className="wk-hero" ref={scope}>
      <div className="wk-kicker">The work</div>
      <h1><span className="wk-hl">Every project,</span><span className="wk-hl">newest first.</span></h1>
      <p className="wk-sub">Scroll through everything I've shipped — counting down to the first project I ever made.</p>
      <div className="wk-stats">
        {rows && <>
          <div className="wk-stat"><div className="wk-stat-num" data-n={total}>0</div><div className="wk-stat-lab">PROJECTS</div></div>
          <div className="wk-stat"><div className="wk-stat-num" data-n={years}>0</div><div className="wk-stat-lab">YEARS</div></div>
        </>}
      </div>
      <div className="wk-cue">SCROLL</div>
    </section>
  );
}

function Outro() {
  return (
    <section className="wk-outro">
      <h2>That's the lot — for now.</h2>
      <p>Something here catch your eye?</p>
      <div className="wk-outro-btns">
        <a href="/" className="btn-secondary">← Back home</a>
        <a href="/#contact" className="btn-primary">Get in touch</a>
      </div>
    </section>
  );
}

/* Ride and YearList are added in Tasks 4 and 8. Temporary placeholder: */
function Ride({ rows, railRef }) { return null; }
function YearList({ rows, animated }) { return null; }

export default function Work() {
  const mode = useMode();
  const { rows, error, loading } = useProjects();
  const railRef = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const smoother = ScrollSmoother.create({ wrapper: "#smooth-wrapper", content: "#smooth-content", smooth: SMOOTH_BASE });
      document.documentElement.style.scrollBehavior = "auto";
      return () => { smoother.kill(); document.documentElement.style.scrollBehavior = ""; };
    });
  }, []);

  return (
    <>
      <TopBar />
      <div className="wk-rail" ref={railRef}></div>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main style={{ background: "var(--bg)" }}>
            <WorkHero rows={rows} />
            {loading && <div className="wk-loading">Loading projects…</div>}
            {error && (
              <div className="wk-error">
                <p>Couldn't load the project list right now.</p>
                <a className="btn-secondary" href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer">See everything on GitHub ↗</a>
              </div>
            )}
            {rows && mode === "ride" && <Ride rows={rows} railRef={railRef} />}
            {rows && mode !== "ride" && <YearList rows={rows} animated={mode === "list"} />}
            <Outro />
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3.6: Build and verify `/work.html` loads**

Run: `npm run build` → Expected: `✓ built`, and `work.html` now exists at the repo root (`Test-Path work.html` → True).

Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t3.js`:

```js
const run = require("./cdp.js");
run({ port: 9371, profile: "p-t3", url: "http://localhost:8742/work.html" }, async ({ ev, sleep }) => {
  await sleep(2500); // let the sheet fetch land
  console.log(await ev(`JSON.stringify({
    title: document.title,
    topbar: !!document.querySelector(".wk-topbar"),
    heroChars: document.querySelectorAll(".wk-hero .wk-hl div").length > 0 || document.querySelectorAll(".wk-hero .wk-hl span").length > 0,
    stats: [...document.querySelectorAll(".wk-stat-num")].map(n => n.dataset.n),
    smoother: !!window.ScrollSmoother || true,
    footer: !!document.querySelector("footer"),
    loadingGone: !document.querySelector(".wk-loading"),
  })`));
});
```

Run: `node C:\Users\antoi\AppData\Local\Temp\site-review\verify-t3.js`
Expected: title `"Work — Antoine Rossi"`, topbar/footer true, two stats with data-n > 0, loadingGone true, `js errors: none`. Also verify the home page still builds and loads (`http://localhost:8742/index.html`, no errors).

- [ ] **Step 3.7: Stage and hand off commit**

```
git add site/work.html site/src/work-main.jsx site/src/work.css site/src/Work.jsx site/src/projects-feed.js index.html work.html assets/
```

**Ask Antoine first** whether to include `vite.config.js` (it carries his uncommitted Cloudflare edits). If yes: `git add vite.config.js`. The build is broken for `/work` without it, so it must land in this commit or his own.

Message → `C:/Users/antoi/AppData/Local/Temp/t3-msg.txt`:

```
Add /work page skeleton as a second Vite entry

New work.html entry rendering hero (char-roll headline, count-up
stats), loading/error states for the project feed, outro, and the
shared footer. Adds an optional oss column to the feed parser and
registers both HTML entries in the Vite build.
```

Tell Antoine: `! git commit -F C:/Users/antoi/AppData/Local/Temp/t3-msg.txt`

---

### Task 4: The ride — core engine (pin, scrub, edges, countdown, blur, rolling text)

**Files:**
- Modify: `site/src/Work.jsx` (replace the `Ride` placeholder)

- [ ] **Step 4.1: Replace the placeholder `Ride` with the core engine**

Delete the line `function Ride({ rows, railRef }) { return null; }` and insert:

```jsx
/* ─── the ride (desktop) ───
   React renders every card once; everything dynamic (pin, scrub, blur,
   renumbering, ruler, rail, odometer, filters) is GSAP-driven DOM work,
   ported from the validated demo in docs/superpowers/demos. */
const RIDE_DUR = 10;
const RULER_RATE = 1.4;

function Ride({ rows, railRef }) {
  const scope = useRef(null);
  const trackRef = useRef(null);
  const rulerRef = useRef(null);
  const odoRef = useRef(null);
  const engineRef = useRef(null);          // { applyFilter } once built
  const chips = useMemo(() => buildChips(rows), [rows]);
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const [activeChip, setActiveChip] = useState("all");

  useGSAP((context, contextSafe) => {
    const section = scope.current;
    const track = trackRef.current;
    const ruler = rulerRef.current;
    const rail = railRef.current;
    const odoWrap = section.querySelector(".wk-odo");
    const odoCols = [...odoRef.current.querySelectorAll(".wk-odo-col-inner")];
    const allCards = [...track.querySelectorAll(".wk-card")];
    const splits = [];
    let tl = null;
    let visible = allCards;
    let chapterFracs = [];
    let filtering = false;

    allCards.forEach(card => {
      const split = new SplitText(card.querySelector(".wk-title"), { type: "chars", mask: "chars" });
      splits.push(split);
      card._chars = split.chars;
      card._date = card.querySelector(".wk-date");
      card._num = card.querySelector(".wk-num");
      card._inner = card.querySelector(".wk-inner");
    });

    const dist = () => track.scrollWidth - window.innerWidth;
    const centerTime = card => {
      const off = card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
      return RIDE_DUR * Math.max(0, Math.min(1, off / dist()));
    };

    function depthUpdate() {
      const half = window.innerWidth / 2;
      const skip = window.innerWidth * 1.5;
      visible.forEach(card => {
        const r = card.getBoundingClientRect();
        const c = r.left + r.width / 2 - half;
        if (Math.abs(c) > skip) return;
        const d = Math.min(Math.abs(c) / (window.innerWidth * 0.62), 1);
        card.style.filter = `blur(${(d * 7).toFixed(2)}px)`;
        card.style.opacity = (1 - d * 0.4).toFixed(3);
        card.style.transform = `scale(${(1 - d * 0.06).toFixed(4)})`;
      });
    }

    const scrollToY = (y, smooth) => {
      const sm = ScrollSmoother.get();
      if (sm) { if (smooth) sm.scrollTo(y, true); else sm.scrollTop(y); }
      else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
    };

    function buildRide(jump) {
      if (tl) { tl.scrollTrigger.kill(true); tl.kill(); tl = null; }

      const chip = chipsRef.current.find(c => c.id === engineRef.current?.filterId) || chipsRef.current[0];
      visible = allCards.filter(card => chip.match(rows[+card.dataset.idx]));
      allCards.forEach(c => { c.style.display = visible.includes(c) ? "" : "none"; });
      /* countdown: newest first in DOM, oldest match is nº01 */
      visible.forEach((c, i) => { c._num.textContent = String(visible.length - i).padStart(2, "0"); });

      visible.forEach(c => {
        gsap.set(c._chars, { yPercent: 112 });
        gsap.set(c._date, { autoAlpha: 0, y: 12 });
      });

      /* [anchor:ruler] — honest tick generation (Task 5) */

      const chapterYears = [...new Set(visible.map(c => c.dataset.year))];
      const chapterFirsts = chapterYears.map(y => visible.find(c => c.dataset.year === y));
      /* [anchor:rail] — rail item generation (Task 6) */
      const railItems = rail ? [...rail.children] : [];

      /* [anchor:odo-init] — odometer anchor (Task 5) */
      chapterFracs = [];

      tl = gsap.timeline({
        scrollTrigger: {
          trigger: section, start: "top top",
          end: () => "+=" + Math.max(1600, Math.round(dist() * 1.1)),
          scrub: 0.7, pin: true, invalidateOnRefresh: true,
          onUpdate: self => {
            depthUpdate();
            let active = 0;
            chapterFracs.forEach((f, k) => { if (self.progress >= f - 0.02) active = k; });
            railItems.forEach((it, k) => it.classList.toggle("active", k === active));
          },
          onToggle: self => rail && rail.classList.toggle("on", self.isActive),
        },
      });
      tl.to(track, { x: () => -dist(), duration: RIDE_DUR, ease: "none" }, 0);
      tl.to(ruler, { x: () => -dist() * RULER_RATE, duration: RIDE_DUR, ease: "none" }, 0);
      tl.to(section.querySelector(".wk-circ-a"), { x: -280, y: 80, duration: RIDE_DUR, ease: "none" }, 0);
      tl.to(section.querySelector(".wk-circ-b"), { x: 200, y: -60, duration: RIDE_DUR, ease: "none" }, 0);

      visible.forEach(card => {
        const ct = centerTime(card);
        tl.to(card._date, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, Math.max(0.001, ct - 1.3));
        tl.to(card._chars, { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.03 }, Math.max(0.001, ct - 1.15));
      });

      chapterFracs = chapterFirsts.map(c => centerTime(c) / RIDE_DUR);

      /* [anchor:odo-rolls] — per-digit rolls at chapter boundaries (Task 5) */

      ScrollTrigger.refresh();
      depthUpdate();
      if (jump) scrollToY(tl.scrollTrigger.start + 2, false);
    }

    engineRef.current = { filterId: "all" };
    /* [anchor:apply-filter] — animated filter swaps (Task 7) */

    buildRide(false);

    return () => {
      if (tl) { tl.scrollTrigger?.kill(true); tl.kill(); }
      splits.forEach(s => s.revert());
      if (rail) { rail.innerHTML = ""; rail.classList.remove("on"); }
      ruler.innerHTML = "";
      engineRef.current = null;
    };
  }, { scope, dependencies: [rows] });

  return (
    <section className="wk-ride" ref={scope}>
      <div className="wk-circ wk-circ-a" style={{ width: 340, height: 340, background: "var(--blue-faint)", top: -80, right: -60 }}></div>
      <div className="wk-circ wk-circ-b" style={{ width: 220, height: 220, background: "color-mix(in srgb, var(--border) 45%, var(--bg))", bottom: "8vh", left: "8vw" }}></div>

      <div className="wk-filters">
        {chips.map(c => (
          <button key={c.id} className={"wk-fchip" + (activeChip === c.id ? " on" : "")}
            onClick={() => engineRef.current?.applyFilter?.(c.id, setActiveChip)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="wk-odo">
        <div className="wk-odo-row" ref={odoRef}>
          {[0, 1, 2, 3].map(i => (
            <div className="wk-odo-col" key={i}>
              <div className="wk-odo-col-inner">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <div key={d}>{d}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wk-ruler" ref={rulerRef}></div>

      <div className="wk-track" ref={trackRef}>
        {rows.map((r, i) => (
          <article className="wk-card" key={r.name + i} data-idx={i} data-year={r.year}>
            <div className="wk-num">{String(rows.length - i).padStart(2, "0")}</div>
            <div className="wk-inner">
              <div className="wk-date">{r.label}</div>
              <h3 className="wk-title">{r.name}</h3>
              <p className="wk-desc">{r.desc}{r.oss && <span className="wk-oss">OPEN SOURCE</span>}</p>
              {r.url && <a className="wk-visit" href={r.url} target="_blank" rel="noopener noreferrer">Visit ↗</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4.2: Build and verify core ride geometry**

Run: `npm run build` → Expected: `✓ built`.

Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t4.js`:

```js
const run = require("./cdp.js");
run({ port: 9372, profile: "p-t4", url: "http://localhost:8742/work.html" }, async ({ ev, sleep }) => {
  await sleep(3000);
  console.log("init:", await ev(`JSON.stringify({
    pins: ScrollTrigger.getAll().filter(s => s.pin).length,
    cards: document.querySelectorAll(".wk-card").length,
    nums: [...document.querySelectorAll(".wk-num")].slice(0, 3).map(n => n.textContent),
    lastNum: [...document.querySelectorAll(".wk-num")].pop().textContent,
  })`));
  const st = JSON.parse(await ev(`JSON.stringify({ s: ScrollTrigger.getAll().find(x=>x.pin).start, e: ScrollTrigger.getAll().find(x=>x.pin).end })`));
  await ev(`window.scrollTo(0, ${Math.round(st.s) + 2})`); await sleep(2200);
  console.log("pin start:", await ev(`JSON.stringify((() => {
    const r = document.querySelector(".wk-card").getBoundingClientRect();
    return { card0Left: Math.round(r.left), vw: innerWidth, inRightThird: r.left > innerWidth * 0.66 };
  })())`));
  await ev(`window.scrollTo(0, ${Math.round(st.e) - 2})`); await sleep(2600);
  console.log("pin end:", await ev(`JSON.stringify((() => {
    const cs = [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none");
    const r = cs[cs.length - 1].getBoundingClientRect();
    return { lastRight: Math.round(r.right), offLeft: r.right < 0 };
  })())`));
  await ev(`window.scrollTo(0, ${Math.round(st.s + (st.e - st.s) * 0.4)})`); await sleep(2200);
  console.log("mid:", await ev(`JSON.stringify((() => {
    const cs = [...document.querySelectorAll(".wk-card")];
    return { blurs: cs.slice(0, 4).map(c => c.style.filter), anySharp: cs.some(c => c.style.filter === "blur(0.00px)" || parseFloat(c.style.filter.slice(5)) < 2) };
  })())`));
});
```

Run it. Expected: `pins:1`, first card numbered `NN = total`, `lastNum:"01"`, `inRightThird:true`, `offLeft:true`, varied blur values with at least one card near-sharp, `js errors: none`.

- [ ] **Step 4.3: Stage and hand off commit** (`git add site/src/Work.jsx index.html work.html assets/`; message file `t4-msg.txt`: "Add the /work horizontal ride core — pinned scrub, edge entrances, countdown numbers, depth blur, rolling titles"; hand Antoine the `! git commit -F` command.)

---

### Task 5: Odometer + honest ruler

**Files:**
- Modify: `site/src/Work.jsx` (fill three anchors inside `buildRide`)

- [ ] **Step 5.1: Replace `/* [anchor:ruler] ... */` with tick generation**

```jsx
      /* honest ruler: one tick per visible card, placed so the tick is centred
         exactly when its card is centred, despite the parallax rate */
      ruler.innerHTML = "";
      const half = window.innerWidth / 2;
      visible.forEach(c => {
        const cardCentre = c.offsetLeft + c.offsetWidth / 2;
        const tick = document.createElement("span");
        tick.className = "wk-tick";
        tick.textContent = c._date.textContent;
        tick.style.left = (half + RULER_RATE * (cardCentre - half)) + "px";
        ruler.appendChild(tick);
      });
```

- [ ] **Step 5.2: Replace `/* [anchor:odo-init] ... */` with the odometer anchor**

```jsx
      /* anchor the odometer to the first visible chapter; hide it for the
         "Earlier" pseudo-year (not 4 digits) */
      const odoSet = year => {
        if (!/^\d{4}$/.test(year)) { gsap.set(odoWrap, { autoAlpha: 0 }); return; }
        gsap.set(odoWrap, { autoAlpha: 1 });
        year.split("").forEach((d, i) => gsap.set(odoCols[i], { yPercent: -10 * (+d) }));
      };
      odoSet(chapterYears[0]);
```

- [ ] **Step 5.3: Replace `/* [anchor:odo-rolls] ... */` with per-digit rolls**

```jsx
      /* per-digit odometer rolls at chapter boundaries — only changed digits move */
      chapterFirsts.forEach((c, k) => {
        if (k === 0) return;
        const prev = chapterYears[k - 1];
        const next = chapterYears[k];
        const at = centerTime(c) - 0.9;
        if (!/^\d{4}$/.test(next)) { tl.to(odoWrap, { autoAlpha: 0, duration: 0.4 }, at); return; }
        if (!/^\d{4}$/.test(prev)) tl.to(odoWrap, { autoAlpha: 1, duration: 0.4 }, at);
        next.split("").forEach((d, i) => {
          if (d !== prev[i]) tl.to(odoCols[i], { yPercent: -10 * (+d), duration: 0.8, ease: "power2.inOut" }, at);
        });
      });
```

- [ ] **Step 5.4: Build and verify**

Run: `npm run build`. Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t5.js`:

```js
const run = require("./cdp.js");
run({ port: 9373, profile: "p-t5", url: "http://localhost:8742/work.html" }, async ({ ev, sleep }) => {
  await sleep(3000);
  const st = JSON.parse(await ev(`JSON.stringify({ s: ScrollTrigger.getAll().find(x=>x.pin).start, e: ScrollTrigger.getAll().find(x=>x.pin).end })`));
  // tick alignment for cards 1 and 4
  for (const idx of [1, 4]) {
    const info = JSON.parse(await ev(`(() => {
      const cs = [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none");
      const card = cs[${idx}];
      const track = document.querySelector(".wk-track");
      const off = card.offsetLeft + card.offsetWidth / 2 - innerWidth / 2;
      const d = track.scrollWidth - innerWidth;
      return JSON.stringify({ frac: Math.max(0, Math.min(1, off / d)), date: card.querySelector(".wk-date").textContent });
    })()`));
    await ev(`window.scrollTo(0, ${Math.round(st.s + info.frac * (st.e - st.s))})`); await sleep(2400);
    console.log(`card[${idx}]:`, await ev(`JSON.stringify((() => {
      const cs = [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none");
      const cr = cs[${idx}].getBoundingClientRect();
      const tk = [...document.querySelectorAll(".wk-tick")].find(t => t.textContent === "${info.date}");
      const tr = tk.getBoundingClientRect();
      return { delta: Math.round((cr.left + cr.width/2) - (tr.left + tr.width/2)),
        odo: [...document.querySelectorAll(".wk-odo-col-inner")].map(i => Math.round(new DOMMatrix(getComputedStyle(i).transform).f)) };
    })())`));
  }
});
```

Expected: `delta` within ±3px at both samples; the four odometer column offsets identical at both samples EXCEPT columns whose digit actually differs between the two sampled years. `js errors: none`.

- [ ] **Step 5.5: Stage and hand off commit** (msg: "Add per-digit year odometer and date-accurate ruler ticks to /work ride").

---

### Task 6: Chapter rail

**Files:**
- Modify: `site/src/Work.jsx` (fill the rail anchor)

- [ ] **Step 6.1: Replace `/* [anchor:rail] ... */` with rail generation**

```jsx
      if (rail) {
        rail.innerHTML = "";
        chapterYears.forEach((y, k) => {
          const n = visible.filter(c => c.dataset.year === y).length;
          const it = document.createElement("div");
          it.className = "wk-rail-item";
          it.innerHTML = `<span class="wk-dot"></span>${y} <span class="wk-cnt">${n}</span>`;
          it.addEventListener("click", () => {
            const st = tl.scrollTrigger;
            scrollToY(st.start + chapterFracs[k] * (st.end - st.start) + 2, true);
          });
          rail.appendChild(it);
        });
      }
```

(The `const railItems = rail ? [...rail.children] : [];` line that follows the anchor already picks these up for the active-state toggling in `onUpdate`.)

- [ ] **Step 6.2: Build and verify**

Run: `npm run build`. Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t6.js`:

```js
const run = require("./cdp.js");
run({ port: 9374, profile: "p-t6", url: "http://localhost:8742/work.html" }, async ({ ev, sleep }) => {
  await sleep(3000);
  const st = JSON.parse(await ev(`JSON.stringify({ s: ScrollTrigger.getAll().find(x=>x.pin).start, e: ScrollTrigger.getAll().find(x=>x.pin).end })`));
  await ev(`window.scrollTo(0, ${Math.round(st.s + (st.e - st.s) * 0.3)})`); await sleep(2400);
  console.log("mid-ride:", await ev(`JSON.stringify({
    railOn: document.querySelector(".wk-rail").classList.contains("on"),
    items: [...document.querySelectorAll(".wk-rail-item")].map(i => i.textContent.trim()),
    active: [...document.querySelectorAll(".wk-rail-item")].findIndex(i => i.classList.contains("active")),
  })`));
  await ev(`[...document.querySelectorAll(".wk-rail-item")].pop().dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await sleep(3200);
  console.log("after click last year:", await ev(`JSON.stringify({
    active: [...document.querySelectorAll(".wk-rail-item")].findIndex(i => i.classList.contains("active")),
    lastIdx: document.querySelectorAll(".wk-rail-item").length - 1,
  })`));
});
```

Expected: `railOn:true`, one item per year with counts, `active` ≥ 0; after clicking the last year, `active === lastIdx`. `js errors: none`.

- [ ] **Step 6.3: Stage and hand off commit** (msg: "Add clickable chapter rail to /work ride").

---

### Task 7: Animated filters

**Files:**
- Modify: `site/src/Work.jsx` (fill the apply-filter anchor)

- [ ] **Step 7.1: Replace `/* [anchor:apply-filter] ... */` with the filter engine**

```jsx
    const applyFilter = contextSafe((id, setChip) => {
      if (filtering || id === engineRef.current.filterId) return;
      filtering = true;
      engineRef.current.filterId = id;
      setChip(id);
      const out = visible.flatMap(c => [c._num, c._inner]);
      gsap.to(out, {
        y: 26, autoAlpha: 0, duration: 0.28, stagger: 0.025, ease: "power2.in",
        onComplete: () => {
          buildRide(true);
          const inn = visible.flatMap(c => [c._num, c._inner]);
          gsap.fromTo(inn, { y: 38, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.06, ease: "power3.out",
            onComplete: () => { filtering = false; },
          });
        },
      });
    });
    engineRef.current.applyFilter = applyFilter;
```

(Insert immediately after the `engineRef.current = { filterId: "all" };` line.)

- [ ] **Step 7.2: Build and verify**

Run: `npm run build`. Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t7.js`:

```js
const run = require("./cdp.js");
run({ port: 9375, profile: "p-t7", url: "http://localhost:8742/work.html" }, async ({ ev, sleep }) => {
  await sleep(3000);
  const before = JSON.parse(await ev(`JSON.stringify({
    total: [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none").length,
    chips: [...document.querySelectorAll(".wk-fchip")].map(c => c.textContent) })`));
  console.log("before:", JSON.stringify(before));
  // click the second chip (first type filter)
  await ev(`[...document.querySelectorAll(".wk-fchip")][1].click()`);
  await sleep(2500);
  console.log("after type filter:", await ev(`JSON.stringify((() => {
    const vis = [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none");
    return { count: vis.length, nums: vis.map(c => c.querySelector(".wk-num").textContent),
      ticks: document.querySelectorAll(".wk-tick").length,
      rail: [...document.querySelectorAll(".wk-rail-item")].map(i => i.textContent.trim()),
      chipOn: [...document.querySelectorAll(".wk-fchip")].findIndex(c => c.classList.contains("on")) };
  })())`));
  await ev(`[...document.querySelectorAll(".wk-fchip")][0].click()`);
  await sleep(2500);
  console.log("back to All:", await ev(`JSON.stringify({
    count: [...document.querySelectorAll(".wk-card")].filter(c => c.style.display !== "none").length })`));
});
```

Expected: filtered `count` < `before.total` and > 0; `nums` count down to `"01"`; `ticks === count`; rail rebuilt; `chipOn:1`; "back to All" restores `before.total`. `js errors: none`.

- [ ] **Step 7.3: Stage and hand off commit** (msg: "Add animated live filters to /work ride").

---

### Task 8: Mobile list + static fallback

**Files:**
- Modify: `site/src/Work.jsx` (replace the `YearList` placeholder)

- [ ] **Step 8.1: Replace `function YearList({ rows, animated }) { return null; }` with:**

```jsx
/* ─── vertical fallback: touch / small screens (animated) and reduced motion (static) ─── */
function YearList({ rows, animated }) {
  const chips = useMemo(() => buildChips(rows), [rows]);
  const [filterId, setFilterId] = useState("all");
  const listRef = useRef(null);
  const match = (chips.find(c => c.id === filterId) || chips[0]).match;
  const visible = rows.filter(match);
  const years = [...new Set(visible.map(r => r.year))];

  useGSAP(() => {
    if (!animated) return;
    const items = listRef.current.querySelectorAll(".wk-li");
    gsap.set(items, { y: 24, autoAlpha: 0 });
    ScrollTrigger.batch(items, {
      start: "top 92%", once: true,
      onEnter: batch => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.07, ease: "power3.out" }),
    });
  }, { dependencies: [animated, filterId], revertOnUpdate: true });

  return (
    <section className="wk-list">
      <div className="wk-filters wk-filters-list">
        {chips.map(c => (
          <button key={c.id} className={"wk-fchip" + (filterId === c.id ? " on" : "")} onClick={() => setFilterId(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div ref={listRef}>
        {years.map(y => (
          <div key={y} className="wk-yeargroup">
            <div className="wk-yearhead">{y} <span>{visible.filter(r => r.year === y).length}</span></div>
            {visible.filter(r => r.year === y).map(r => (
              <div className="wk-li" key={r.name + r.date}>
                <span className="wk-li-num">{String(visible.length - visible.indexOf(r)).padStart(2, "0")}</span>
                <div className="wk-li-body">
                  <div className="wk-date">{r.label}</div>
                  <h3>{r.name}{r.oss && <span className="wk-oss">OPEN SOURCE</span>}</h3>
                  <p>{r.desc}</p>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="wk-visit">Visit ↗</a>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 8.2: Build and verify at mobile width**

Run: `npm run build`. Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t8.js`:

```js
const run = require("./cdp.js");
run({ port: 9376, profile: "p-t8", url: "http://localhost:8742/work.html", width: 600, height: 900 }, async ({ ev, sleep }) => {
  await sleep(3000);
  console.log(await ev(`JSON.stringify({
    list: !!document.querySelector(".wk-list"),
    ride: !!document.querySelector(".wk-ride"),
    yearHeads: [...document.querySelectorAll(".wk-yearhead")].map(h => h.textContent.trim()),
    items: document.querySelectorAll(".wk-li").length,
    chips: document.querySelectorAll(".wk-fchip").length,
  })`));
  await ev(`[...document.querySelectorAll(".wk-fchip")][1].click()`); await sleep(1200);
  console.log("filtered:", await ev(`JSON.stringify({ items: document.querySelectorAll(".wk-li").length })`));
});
```

Expected: `list:true, ride:false`, year headings with counts, items > 0, filter click reduces item count. `js errors: none`. (Reduced-motion static mode shares this exact DOM with `animated=false`; spot-check manually with the OS setting if desired.)

- [ ] **Step 8.3: Stage and hand off commit** (msg: "Add mobile and reduced-motion fallback list to /work").

---

### Task 9: Home-page integration — link to /work, delete the old overlay

**Files:**
- Modify: `site/src/App.jsx`

- [ ] **Step 9.1: Swap the Timeline button for a link**

In `Timeline()`: delete the line `const [showAll, setShowAll] = useState(false);` and the line `{showAll && <AllProjectsPanel onClose={() => setShowAll(false)} />}`. Replace the `<button onClick={() => setShowAll(true)} ...>` element with:

```jsx
            <a href="/work" className="btn-secondary"
              style={{ padding: "11px 24px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              Explore all projects
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
```

- [ ] **Step 9.2: Delete the overlay components**

Delete `function ProjSnapItem(...)` (App.jsx:407) through the end of `function AllProjectsPanel(...)` — i.e. everything from the `ProjSnapItem` definition up to (but not including) the `const CIRCLE_LAYOUTS = [` line, including any section comment headers between them.

- [ ] **Step 9.3: Remove now-dead imports**

First confirm they're unused: `grep -n "createPortal\|projectCache\|projectError\|projectFetch" site/src/App.jsx` → Expected: only the two import lines remain. Then delete `import { createPortal } from "react-dom";` and `import { projectCache, projectError, projectFetch } from "./projects-feed.js";`.

- [ ] **Step 9.4: Build and verify the home page**

Run: `npm run build` → Expected: `✓ built` (a leftover reference would fail the build).

Write `C:\Users\antoi\AppData\Local\Temp\site-review\verify-t9.js`:

```js
const run = require("./cdp.js");
run({ port: 9377, profile: "p-t9", url: "http://localhost:8742/index.html" }, async ({ ev, sleep }) => {
  await sleep(2000);
  console.log(await ev(`JSON.stringify({
    workLink: document.querySelector('#experience a[href="/work"]')?.textContent.trim(),
    footer: !!document.querySelector("footer"),
  })`));
});
```

Expected: `workLink:"Explore all projects"`, `footer:true`, `js errors: none`.

- [ ] **Step 9.5: Stage and hand off commit** (`git add site/src/App.jsx index.html work.html assets/`; msg: "Link home timeline to /work and remove the old full-screen overlay").

---

### Task 10: Final pass

- [ ] **Step 10.1: Full rebuild + run every verify script back-to-back** (`verify-t1` through `verify-t9`). Expected: all pass, zero JS errors anywhere.
- [ ] **Step 10.2: Confirm `/work` resolves without the extension** — after Antoine deploys, check `https://antoinerossi.nz/work` returns the page (Cloudflare `auto-trailing-slash` html_handling, same mechanism as `/privacy`). Locally `work.html` is the URL; that's expected.
- [ ] **Step 10.3: Manual checks for Antoine** — ride feel with all real projects (tune `gap` in `.wk-track` and the `dist() * 1.1` end multiplier if too long), phone layout, OS reduced-motion, hero copy wording.
- [ ] **Step 10.4: Hand off final commit + push** to Antoine.

---

## Self-review notes

- **Spec coverage:** routing/build (T3), data + OSS inference with column override (T2, `shapeProjects`), hero/stats/loading/error (T3), ride core with edges/countdown/blur/rolling text (T4), odometer + honest ruler incl. "Earlier" handling (T5), rail (T6), filters incl. chip derivation and guard (T7), mobile + reduced-motion fallbacks (T8), home integration + dead code removal (T9), perf skip-window in `depthUpdate` (T4), ScrollSmoother (T3 Work root). ✔
- **Known judgment calls:** card gap reduced to 8vw (spec allows 7–10vw tuning); chips capped at 6 types by frequency; `Ride` unmount cleanup reverts splits and clears rail/ruler.
- **Naming consistency:** `engineRef.filterId`/`applyFilter(id, setChip)` used in T4 (chip onClick), defined in T7; `chapterFracs`/`railItems` shared between T4's `onUpdate` and T6's generation; `odoSet`/`odoWrap`/`odoCols` defined T5, markup from T4. ✔
