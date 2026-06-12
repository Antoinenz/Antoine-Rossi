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
