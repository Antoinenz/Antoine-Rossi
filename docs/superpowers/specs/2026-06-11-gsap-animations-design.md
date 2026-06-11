# GSAP animation overhaul — design

**Date:** 2026-06-11 · **Approved by:** Antoine

## Goal

Upgrade the portfolio's animations from the CSS IntersectionObserver reveal system to a GSAP-driven motion system. Personality: bold hero moment, subtle everywhere else ("Linear-style" restraint outside the hero).

## Decisions (made with Antoine)

- Scope: hero entrance, scroll experience, hover micro-interactions, panel & menu transitions
- Library: GSAP + ScrollTrigger (+ SplitText, ScrollSmoother — free since GSAP 3.13)
- Full GSAP takeover: the CSS reveal system is replaced, one motion engine
- ScrollSmoother on desktop only (`min-width: 768px`, fine pointer, no reduced-motion); native scroll on mobile
- If it doesn't work out, revert via git

## Architecture

- Deps: `gsap`, `@gsap/react` (`useGSAP` hook)
- `site/src/animation/gsap-setup.js`: plugin registration, `reducedMotion()` helper, re-exports
- ScrollSmoother needs `#smooth-wrapper > #smooth-content` around the page; `position: fixed` elements break inside the transformed content, so the nav lives outside it and the all-projects panel is portaled to `document.body`
- The `Reveal` component keeps its API (`type`, `delay`) but is reimplemented as `gsap.from` + ScrollTrigger (`once: true`, shared easing language: expo-out entrances, back-out springs)
- When the smoother is active, `scroll-behavior: smooth` is disabled (anchor jumps are instant natively; the smoother eases the content to them)

## Per-area treatment

**Hero (bold):** SplitText character reveal of the name rising from a clip mask with spring overshoot; serif subtitle word-by-word; bio/CTAs/stats cascade in one orchestrated timeline (gated on `document.fonts.ready`). Two faint blurred blue blobs drift slowly and parallax with the mouse (fine pointer only). On scroll-away the hero content parallaxes up and fades (scrubbed).

**Scroll (subtle):** All reveals via ScrollTrigger. Timeline line draws itself with scrub, project-card stack bars grow from zero, banner decor circles parallax inside cards, 2px scroll-progress bar under the nav.

**Hover (subtle, fine pointer only):** Magnetic primary buttons (quickTo pull, elastic return). Project cards tilt max ~2.5° toward the cursor with elastic reset (CSS keeps shadow/bg; GSAP owns transform). Skill chips get a springy CSS scale on hover (GSAP entrance uses `clearProps: transform` so the two don't fight).

**Panel & menu:** Panel opens/closes with a GSAP timeline (rise + fade, reverse on close); ScrollSmoother paused while open. Mobile menu links stagger in with overshoot and out in reverse via GSAP (replacing CSS keyframes). Panel-internal snap-item reveals keep their existing scoped IntersectionObserver (independent scroll container).

## Accessibility & robustness

- `prefers-reduced-motion`: no smoother, no scrub, no magnetic/tilt; content set to final state. CSS kill-all block remains as backstop.
- Transforms/opacity only; SplitText waits for fonts so it never splits on fallback metrics
- Initial hidden states applied by JS (useGSAP runs pre-paint), so content is never stuck invisible if JS fails
- Bundle: +~45 KB gzip, total ≈ 115 KB

## Verification

Headless Chrome: screenshots at multiple scroll depths (desktop + mobile), panel open/close, mobile menu, zero console errors, reduced-motion pass. Chrome MCP for live visual review and a recorded GIF.
