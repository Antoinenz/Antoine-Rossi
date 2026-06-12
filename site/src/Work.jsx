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
    /* only offer the chip when it can't produce an empty ride */
    ...(rows.some(r => r.oss) ? [{ id: "oss", label: "Open source", match: r => r.oss }] : []),
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

      const chapterYears = [...new Set(visible.map(c => c.dataset.year))];
      const chapterFirsts = chapterYears.map(y => visible.find(c => c.dataset.year === y));
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
      const railItems = rail ? [...rail.children] : [];

      /* anchor the odometer to the first visible chapter; hide it for the
         "Earlier" pseudo-year (not 4 digits) */
      const odoSet = year => {
        if (!/^\d{4}$/.test(year)) { gsap.set(odoWrap, { autoAlpha: 0 }); return; }
        gsap.set(odoWrap, { autoAlpha: 1 });
        year.split("").forEach((d, i) => gsap.set(odoCols[i], { yPercent: -10 * (+d) }));
      };
      odoSet(chapterYears[0]);
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

      ScrollTrigger.refresh();
      depthUpdate();
      if (jump) scrollToY(tl.scrollTrigger.start + 2, false);
    }

    engineRef.current = { filterId: "all" };
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
