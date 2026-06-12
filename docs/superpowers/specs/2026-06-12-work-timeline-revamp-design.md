# /work — Timeline Revamp Design

**Date:** 2026-06-12
**Status:** Awaiting user review
**Replaces:** the full-screen timeline overlay (`AllProjectsPanel` + `ProjSnapItem` in `site/src/App.jsx`)
**Validated by:** five interactive demo iterations, final feel preserved at
`docs/superpowers/demos/2026-06-12-work-horizontal-ride-final.html`
(earlier concepts at `docs/superpowers/demos/2026-06-12-work-motion-concepts.html`)

## Goal

Replace the buggy, whitespace-heavy full-screen timeline overlay with a dedicated
`/work` page: an awwwards-style, GSAP-ScrollTrigger-driven "horizontal ride" through
every project, scannable via a chapter rail and filters, but still telling the story
newest → oldest, counting down to project nº01.

## Decisions already made (with Antoine, via live demos)

- **Own page at `/work`** — not an overlay, not part of the home page.
- **Horizontal ride** layout (Concept B) with depth blur borrowed from Concept C.
- **Rolling text** — titles roll out of masks character by character; the giant year
  is a per-digit odometer (only the digit that changes rolls).
- **Edge entrances** — first card starts in the right third of the screen partly
  off-screen; last card exits fully off the left before the pin releases.
- **Honest ruler** — date ticks are generated from real project dates and placed to
  compensate for the 1.4× parallax so the correct tick sits under a card when centred.
- **Chapter rail** — fixed year list on the left during the ride: year + count,
  active highlight, click jumps through the pinned scroll.
- **Live filters** — All / per-type / Open source; changing filter animates entries
  out, rebuilds the ride (renumber, recount rail, regenerate ticks, re-anchor
  odometer, recalculate length), animates survivors in.
- **Countdown numbers** — newest project wears the highest number; the ride ends at
  nº01, the first project. Filters renumber within the filtered set.
- **ScrollSmoother** at the site's value (1.1), same feel as the home page.
- **Open-source flag:** inferred — a project whose `url` points at `github.com` is
  open source. If the sheet later gains an `oss` column (column F, values `1`/`yes`),
  it overrides the inference. No sheet changes required to ship.

## Architecture

### Routing & build

- New Vite entry: `site/work.html` + `site/src/work.jsx` (second React root) +
  `site/src/Work.jsx` (page component). Build emits `work.html` + hashed assets into
  the repo root alongside `index.html`.
- `vite.config.js` gains `build.rollupOptions.input` listing both `site/index.html`
  and `site/work.html`. **Caution:** this file currently has uncommitted user edits
  (Cloudflare plugin); make the minimal addition and do not stage unrelated changes
  without asking.
- Cloudflare serves `/work` from `work.html` via default `auto-trailing-slash`
  html_handling — same mechanism already proven by `/privacy`.
- `work.html` gets its own `<title>` ("Work — Antoine Rossi") and meta description.

### Shared code

- Data: reuse `site/src/projects-feed.js` unchanged (TSV fetch, fields
  `name/desc/date(dd/mm/yyyy)/url/type`, sorted newest-first).
- Styling: reuse `site/src/styles.css` tokens (`--bounce`, colours, DM Sans).
  Page-specific styles go in a new `site/src/work.css` imported only by the
  work entry; home-page CSS stays untouched.
- GSAP: gsap + ScrollTrigger + ScrollSmoother (already dependencies).

### Page structure (desktop)

1. **Top bar** — site logo linking back to `/`, small "← Home" affordance. Minimal;
   not the full home nav.
2. **Hero** — kicker "THE WORK", headline with the char-roll entrance, one-line
   sub, count-up stats (`N PROJECTS` = row count, `Y YEARS` = newest year −
   oldest year + 1), scroll cue. Copy is placeholder-quality; Antoine reviews
   final wording during implementation.
3. **The ride** — pinned 100vh section exactly as the final demo:
   - track of cards (ghost countdown number, date, char-roll title, description,
     type tag, OSS pill when applicable, "Visit ↗" linking `url`);
   - depth blur/scale/fade by distance from screen centre (max blur 7px, opacity
     floor 0.6, scale floor 0.94);
   - honest ruler at 1.4× parallax with per-project ticks;
   - per-digit year odometer bottom-right (outlined stroke text);
   - two background circles drifting at parallax rates (matches site's banner
     circle motif);
   - filter chips top-centre inside the pinned section;
   - chapter rail fixed left, visible only while the pin is active.
   - Scroll length: `max(1600, rideDistance × 1.1)` px. With ~32 cards this is a
     long pin — that is intentional; the rail is the skip mechanism. Card gap may
     be tuned down (10vw → ~7vw) if the full ride feels too long with real data.
4. **Outro** — short section after the ride: "back home" link and a contact CTA
   (mirrors home-page contact button style).
5. **Footer** — reuse the home page `Footer` component.

### Filters

- Chips: `All`, one per distinct `type` value present in the feed (display-cased),
  plus `Open source`. If the sheet has more than ~6 distinct types, collapse the
  rarest into no chip (they remain under All) — keep the bar to one row.
- Single-select. While the rebuild animation runs, chips are inert (guard flag).
- Rebuild sequence (from demo): stagger-out current entries (0.28s), rebuild
  (display toggle, renumber countdown, regenerate rail/ticks/odometer anchor,
  kill + recreate the pinned timeline, jump to ride start), stagger-in (0.55s).
- Empty filter result cannot happen (chips are derived from present data).

### Chapter rail

- Years derived from visible (filtered) cards, newest first; each shows project
  count. Click → `smoother.scrollTo(pinStart + frac × pinLength)`.
- Active year from scroll progress (threshold frac − 0.02).
- Hidden (opacity 0, no pointer events) whenever the pin is inactive.

## Fallbacks

### Mobile / touch (gated with `gsap.matchMedia`, breakpoint: no fine pointer or < 768px)

No pinned horizontal ride. Instead: vertical list grouped by year — sticky small
year heading, compact cards (number, date, name, desc, visit), titles still do a
char-roll reveal on scroll-into-view (IntersectionObserver/ScrollTrigger batch,
non-scrubbed). Filters and countdown numbering work identically (no pin to rebuild;
just re-render the list with the same in/out stagger). No rail (year headings are
the structure), no odometer, no ruler.

### Reduced motion (`prefers-reduced-motion`)

Static vertical grouped list: no pins, no masks, no blur, no count-ups; filters
swap content instantly. Everything readable with zero animation.

## Loading & errors

- `Work.jsx` renders hero immediately; ride area shows a minimal loading state
  (muted "Loading projects…" with a subtle pulse) until `projectFetch` resolves.
- Stats count up only once data arrives (values depend on it).
- On fetch failure (`projectError`): friendly message + button linking to
  `https://github.com/Antoinenz` — same fallback contract the overlay had.
- Date parsing/formatting: `dd/mm/yyyy` → tick/date labels `MMM YYYY` (uppercase),
  year = chapter key. Rows with unparseable dates group under a final "Earlier"
  chapter rather than crashing.

## Site integration changes (home page)

- `Timeline` component: remove `showAll` state and `AllProjectsPanel` usage; the
  "View full timeline" button becomes a plain link to `/work`, relabelled
  **"Explore all projects"** (content is projects-only, so "timeline" was
  misleading).
- Delete `AllProjectsPanel` and `ProjSnapItem` from `App.jsx` (~270 lines) and any
  CSS only they used. `projects-feed.js` stays (now consumed by `/work`; the home
  page Projects section keeps its own hardcoded cards).

## Performance notes

- Depth blur loop runs in the pin's `onUpdate`; with 32 cards, skip updates for
  cards further than ~1.5 viewport-widths from centre (clamp already saturates
  them; avoids needless style writes).
- `will-change: transform, filter` only on cards; remove blur entirely on mobile
  fallback (no depth loop there).
- All animation is transform/filter/opacity — no layout thrash. Char splitting
  happens once per render of the card list.

## Testing

- Headless CDP scripts (pattern already established in
  `%TEMP%\site-review\verify-*.js`): pin creation, edge-entrance geometry
  (first card starts ≥ 66vw; last card's right edge < 0 at pin end), tick/card
  centre alignment within ±2px at focus, odometer single-digit roll, filter
  rebuild (counts, renumbering, rail, no JS exceptions), rail click landing,
  smoother active, `/work` resolves on the local preview and on Cloudflare.
- Manual: real-data ride length feel, mobile layout on a phone, reduced-motion via
  OS setting, fetch-failure path (block the sheet URL).

## Out of scope

- Sheet schema changes (OSS column is optional, supported if added later).
- Any redesign of the home page Projects/Timeline sections beyond the button swap
  and dead-code removal.
- Migrating other content (skills, jobs) onto /work — projects only.
