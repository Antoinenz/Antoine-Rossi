import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PROJECTS, SKILL_TOOLTIPS, SKILL_ICONS, SKILLS, TIMELINE, CONTACT_LINKS } from "./data.js";
import { projectCache, projectError, projectFetch } from "./projects-feed.js";
import { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP, reducedMotion, SMOOTH_BASE } from "./animation/gsap-setup.js";
import Reveal from "./components/Reveal.jsx";
import Footer from "./components/Footer.jsx";

/* Shared smooth in-page scroll. Uses the smoother's own scrollTo, tightening
   its smoothing for the duration so the click lands directly instead of
   crawling through a long ease-out tail. Empty id = scroll to top. Returns the
   restore delayedCall (or null) so callers can cancel/chain on settle. */
function smoothScrollToId(id, onSettle) {
  const target = id ? document.getElementById(id) : null;
  if (reducedMotion()) {
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
    onSettle?.();
    return null;
  }
  const smoother = ScrollSmoother.get();
  if (smoother) {
    smoother.smooth(0.5);
    smoother.scrollTo(target || 0, true, target ? "top 60px" : "top top");
    return gsap.delayedCall(1.2, () => { smoother.smooth(SMOOTH_BASE); onSettle?.(); });
  }
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
  return gsap.delayedCall(1, () => { onSettle?.(); });
}

/* ─── Magnetic wrapper (fine pointers only) ─── */
// Listens on the whole window so the pull engages while the cursor is still
// approaching — within `radius` px of the element's edge — not only once it's
// already on top of it.
function Magnetic({ children, strength = 0.35, radius = 90, max = Infinity }) {
  const ref = useRef(null);
  useGSAP(() => {
    const el = ref.current;
    const mm = gsap.matchMedia();
    mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const clamp = v => Math.max(-max, Math.min(max, v));
      let engaged = false;
      const move = e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        // Activation zone: the element's own half-size plus the radius.
        // Keep radius <= half the gap to a neighbour so their zones don't
        // overlap and tug both at once; `max` caps how far it can travel.
        const zoneX = r.width / 2 + radius;
        const zoneY = r.height / 2 + radius;
        if (Math.abs(dx) <= zoneX && Math.abs(dy) <= zoneY) {
          // Bounce in on first entry (back-ease overshoot), then follow the
          // cursor smoothly while it stays inside the radius.
          gsap.to(el, {
            x: clamp(dx * strength),
            y: clamp(dy * strength),
            duration: engaged ? 0.4 : 0.6,
            ease: engaged ? "power3.out" : "back.out(3)",
            overwrite: true,
          });
          engaged = true;
        } else if (engaged) {
          engaged = false;
          // Springy snap back to rest when the cursor leaves the radius.
          gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: true });
        }
      };
      window.addEventListener("pointermove", move);
      return () => window.removeEventListener("pointermove", move);
    });
  }, []);
  return <span ref={ref} style={{ display: "inline-block" }}>{children}</span>;
}

/* ─── Scroll progress bar ─── */
function ScrollProgress() {
  const ref = useRef(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.to(ref.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
  }, []);
  return <div ref={ref} className="scroll-progress" />;
}

/* ─── Nav ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const overlayRef = useRef(null);
  const closingRef = useRef(false);
  const pillRef = useRef(null);
  const linkRefs = useRef({});
  // While a nav-click scroll is in flight, ignore scrollspy so the pill goes
  // straight to the clicked section instead of stepping through the ones it
  // passes over on the way.
  const suppressSpyRef = useRef(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Scrollspy: highlight the nav link of the section in the middle of the viewport
  useEffect(() => {
    const ids = ["about", "projects", "skills", "contact"];
    const obs = new IntersectionObserver(
      entries => {
        if (suppressSpyRef.current) return;
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Mobile menu entrance
  useGSAP(() => {
    if (!menuOpen || !overlayRef.current) return;
    closingRef.current = false;
    if (reducedMotion()) return;
    const links = overlayRef.current.querySelectorAll(".mobile-menu-link, .mobile-menu-cta");
    gsap.timeline()
      .from(overlayRef.current, { autoAlpha: 0, duration: 0.2, ease: "power1.out" })
      .from(links, { autoAlpha: 0, y: 26, duration: 0.55, stagger: 0.07, ease: "back.out(1.7)" }, "-=0.05");
  }, [menuOpen]);

  const closeMenu = () => {
    if (closingRef.current) return;
    const overlay = overlayRef.current;
    if (!overlay || reducedMotion()) { setMenuOpen(false); return; }
    closingRef.current = true;
    const links = overlay.querySelectorAll(".mobile-menu-link, .mobile-menu-cta");
    gsap.timeline({ onComplete: () => setMenuOpen(false) })
      .to(links, { autoAlpha: 0, y: -14, duration: 0.22, stagger: { each: 0.05, from: "end" }, ease: "power2.in" })
      .to(overlay, { autoAlpha: 0, duration: 0.25, ease: "power1.in" }, "-=0.1");
  };

  // Smooth-scroll nav clicks via the shared helper. Drive the pill straight to
  // the clicked section and mute scrollspy for the duration so the sections we
  // pass over don't tug it along the way ("" = top = about).
  const smoothRestoreRef = useRef(null);
  const handleNavClick = (e, id) => {
    e.preventDefault();
    suppressSpyRef.current = true;
    setActiveSection(id || "about");
    smoothRestoreRef.current?.kill();
    smoothRestoreRef.current = smoothScrollToId(id, () => { suppressSpyRef.current = false; });
  };

  // Sliding active-section pill — animates between links both as you scroll
  // (scrollspy updates activeSection) and when you click one.
  useGSAP(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const active = activeSection ? linkRefs.current[activeSection] : null;
    if (!active) { gsap.to(pill, { autoAlpha: 0, duration: 0.2 }); return; }
    const box = { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight };
    const hidden = gsap.getProperty(pill, "opacity") === 0;
    if (hidden || reducedMotion()) {
      gsap.set(pill, box);
      gsap.to(pill, { autoAlpha: 1, duration: reducedMotion() ? 0 : 0.25 });
    } else {
      gsap.to(pill, { ...box, autoAlpha: 1, duration: 0.55, ease: "back.out(2.2)", overwrite: true });
    }
  }, [activeSection]);

  const links = ["About", "Projects", "Skills", "Contact"];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px, 4vw, 32px)",
        height: 60,
        background: scrolled || menuOpen ? "rgba(250,250,248,0.95)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        borderBottom: scrolled || menuOpen ? "1px solid var(--border)" : "1px solid transparent",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
      }}>
        <a href="#" onClick={e => handleNavClick(e, "")} style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", textDecoration: "none", letterSpacing: "-0.01em" }}>
          <img src="/icon.svg" alt="Antoine Rossi" style={{ height: 30, marginLeft: 4, verticalAlign: "middle" }} />
        </a>
        {/* Desktop links */}
        <div className="nav-links-desktop">
          <span className="nav-pill" ref={pillRef} aria-hidden="true" />
          {links.map(s => (
            <a key={s} href={`#${s.toLowerCase()}`}
              ref={el => { linkRefs.current[s.toLowerCase()] = el; }}
              onClick={e => handleNavClick(e, s.toLowerCase())}
              className={`nav-link${activeSection === s.toLowerCase() ? " active" : ""}`}>
              {s}
            </a>
          ))}
          <Magnetic strength={0.35} radius={10} max={10}>
            <a href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer"
              className="btn-primary"
              style={{ marginLeft: 8, padding: "6px 16px", fontSize: 14, display: "inline-block" }}>
              GitHub
            </a>
          </Magnetic>
        </div>
        {/* Hamburger (mobile only) */}
        <button className="nav-hamburger" onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)} aria-label="Toggle navigation">
          {menuOpen ? (
            <svg key="close" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg key="open" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 7h16M3 11h16M3 15h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div ref={overlayRef} className="mobile-menu-overlay" style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "var(--bg)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          paddingTop: 60, gap: 0,
        }}>
          {links.map(s => (
            <a key={s} className="mobile-menu-link"
              href={`#${s.toLowerCase()}`}
              onClick={e => { handleNavClick(e, s.toLowerCase()); closeMenu(); }}
              style={{
                padding: "16px 40px", fontSize: 26, fontWeight: 600,
                letterSpacing: "-0.025em", color: "var(--text)", textDecoration: "none",
                width: "100%", textAlign: "center",
              }}>
              {s}
            </a>
          ))}
          <a className="mobile-menu-cta btn-primary"
            href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer"
            onClick={closeMenu}
            style={{ marginTop: 32, padding: "13px 32px", fontSize: 15 }}>
            GitHub ↗
          </a>
        </div>
      )}
    </>
  );
}

/* ─── Hero ─── */
function Hero() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const h1Ref = useRef(null);
  const subRef = useRef(null);

  useGSAP(() => {
    if (reducedMotion()) return;

    // Ambient blobs: slow drift (x/y) + mouse parallax (xPercent/yPercent),
    // separate transform channels so they compound instead of fighting
    gsap.to(".hero-blob-1", { x: 45, y: 30, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".hero-blob-2", { x: -35, y: -45, duration: 18, repeat: -1, yoyo: true, ease: "sine.inOut" });

    const mm = gsap.matchMedia();
    mm.add("(pointer: fine)", () => {
      const b1x = gsap.quickTo(".hero-blob-1", "xPercent", { duration: 1.4, ease: "power2" });
      const b1y = gsap.quickTo(".hero-blob-1", "yPercent", { duration: 1.4, ease: "power2" });
      const b2x = gsap.quickTo(".hero-blob-2", "xPercent", { duration: 1.8, ease: "power2" });
      const b2y = gsap.quickTo(".hero-blob-2", "yPercent", { duration: 1.8, ease: "power2" });
      const move = e => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        b1x(nx * 5); b1y(ny * 5);
        b2x(nx * -7); b2y(ny * -7);
      };
      window.addEventListener("pointermove", move);
      return () => window.removeEventListener("pointermove", move);
    });

    // Intro: hide everything, then orchestrate once fonts are ready so
    // SplitText measures real glyphs, not fallback-font ones
    gsap.set([h1Ref.current, subRef.current], { autoAlpha: 0 });
    gsap.set(".hero-cascade", { autoAlpha: 0, y: 18 });

    document.fonts.ready.then(() => {
      if (!h1Ref.current) return;
      gsap.set([h1Ref.current, subRef.current], { autoAlpha: 1 });
      const splitName = SplitText.create(h1Ref.current, { type: "chars", mask: "chars" });
      const splitSub = SplitText.create(subRef.current, { type: "words", mask: "words" });
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(splitName.chars, { yPercent: 120, duration: 0.7, stagger: 0.035, ease: "back.out(1.7)" })
        .from(splitSub.words, { yPercent: 110, duration: 0.65, stagger: 0.04 }, "-=0.6")
        .to(".hero-cascade", { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, "-=0.4");
    });

    // Scroll-away: hero drifts up slower than the page and fades
    gsap.to(contentRef.current, {
      yPercent: -10, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "80% top", scrub: true },
    });
  }, []);

  return (
    <section id="about" ref={sectionRef} style={{ position: "relative", padding: "190px 32px 100px", maxWidth: 780, margin: "0 auto" }}>
      {/* Ambient background */}
      <div className="hero-blob hero-blob-1" style={{ width: 420, height: 420, top: 30, right: -130, background: "radial-gradient(circle, oklch(94% 0.06 252 / 0.9) 0%, transparent 70%)" }} />
      <div className="hero-blob hero-blob-2" style={{ width: 340, height: 340, bottom: -50, left: -150, background: "radial-gradient(circle, oklch(94% 0.05 210 / 0.75) 0%, transparent 70%)" }} />

      <div ref={contentRef} style={{ position: "relative", zIndex: 1 }}>
        <h1 ref={h1Ref} style={{ fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--text)" }}>
          Antoine Rossi
        </h1>

        <h2 ref={subRef} style={{ fontSize: "clamp(20px, 4.5vw, 36px)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.02em", color: "var(--text-muted)", marginBottom: 32 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>Full-Stack Developer</span>
          {" "}&amp; curious teenager
        </h2>

        <p className="hero-cascade" style={{ fontSize: "clamp(14px, 4vw, 18px)", color: "var(--text-muted)", maxWidth: 540, lineHeight: 1.65, marginBottom: 40, fontWeight: 350 }}>
          I like to learn new things. I'm still a teenager, so I'm always changing — building desktop apps, web tools, and everything in between. Fluent in both English and French.
        </p>

        <div className="hero-cascade" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "View Projects", href: "#projects", primary: true },
            { label: "LinkedIn", href: "https://linkedin.com/in/antoinenzfr", primary: false },
            { label: "Instagram", href: "https://instagram.com/antoinenzfr/", primary: false },
          ].map(btn => (
            <Magnetic key={btn.label} strength={0.2} radius={5} max={10}>
              <a href={btn.href}
                target={btn.href.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={btn.href.startsWith("#") ? e => { e.preventDefault(); smoothScrollToId(btn.href.slice(1)); } : undefined}
                className={btn.primary ? "btn-primary" : "btn-secondary"}
                style={{ padding: "clamp(8px, 2vw, 10px) clamp(14px, 4vw, 22px)", fontSize: "clamp(12.5px, 3.2vw, 14.5px)", display: "inline-block" }}>
                {btn.label}
              </a>
            </Magnetic>
          ))}
        </div>

        <div className="hero-cascade" style={{ marginTop: "clamp(28px, 5vw, 48px)", display: "flex", gap: "clamp(16px, 4vw, 32px)", flexWrap: "wrap" }}>
          {[
            { label: "Auckland, NZ", sub: "Current base" },
            { label: "France", sub: "2 years · Fluent" },
            { label: "Photography", sub: "Hobby" },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: "clamp(12px, 3.5vw, 15px)", fontWeight: 500, color: "var(--text)" }}>{item.label}</div>
              <div style={{ fontSize: "clamp(10.5px, 3vw, 13px)", color: "var(--text-muted)" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Snap project item (inside the all-projects panel) ─── */
const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());
// Capitalize the first letter of each sentence (sheet data has uneven casing)
const sentenceCase = s => s ? s.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, pre, c) => pre + c.toUpperCase()) : "";

function ProjSnapItem({ project, index, active, scrollRef, onActive }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const onActiveRef = useRef(onActive);
  useEffect(() => { onActiveRef.current = onActive; });

  useEffect(() => {
    const el = ref.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const visObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); visObs.disconnect(); } },
      { root: container, threshold: 0.05 }
    );
    const activeObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) onActiveRef.current(index); },
      { root: container, rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    visObs.observe(el); activeObs.observe(el);
    return () => { visObs.disconnect(); activeObs.disconnect(); };
  }, [scrollRef]);

  return (
    <div
      ref={ref}
      className={`snap-item${visible ? " in" : ""}`}
      style={{
        scrollSnapAlign: "center",
        minHeight: "clamp(100px, 18vh, 170px)",
        display: "flex", alignItems: "center",
        padding: "16px 48px 16px 20px",
      }}
    >
      {/* Dot on the line (line is at left:4, dot center needs to be at 4px from scroll area) */}
      <div style={{
        width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
        background: active ? "var(--blue)" : "white",
        border: `2px solid ${active ? "var(--blue)" : "var(--border)"}`,
        boxShadow: `0 0 0 4px var(--bg)${active ? ", 0 0 0 7px var(--blue-faint)" : ""}`,
        marginLeft: -0.5, marginRight: 28, position: "relative", zIndex: 2,
        transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
      }} />
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 7 }}>
          <h3 style={{
            fontSize: "clamp(16px, 2.4vw, 20px)", fontWeight: 600,
            letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2,
            color: active ? "var(--text)" : "var(--text-muted)",
            opacity: active ? 1 : 0.7,
            transition: "color 0.3s, opacity 0.3s",
          }}>
            {titleCase(project.name)}
          </h3>
          {project.type && (
            <span style={{
              fontSize: 10.5, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
              background: "var(--bg2)", color: "var(--text-muted)",
              border: "1px solid var(--border)", flexShrink: 0, marginTop: 3,
              opacity: active ? 0.9 : 0.5, transition: "opacity 0.3s",
            }}>
              {project.type}
            </span>
          )}
        </div>
        {project.desc && (
          <p style={{
            fontSize: "clamp(12.5px, 1.7vw, 14px)",
            color: "var(--text-muted)", lineHeight: 1.65, margin: 0,
            marginBottom: active && project.url ? 11 : 0,
            opacity: active ? 0.78 : 0.5, transition: "opacity 0.3s",
          }}>
            {sentenceCase(project.desc)}
          </p>
        )}
        {project.url && (
          <div style={{ overflow: "hidden", height: active ? 20 : 0, transition: "height 0.28s var(--ease-out)" }}>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="visit-link" style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 12.5, fontWeight: 500, color: "var(--blue)", textDecoration: "none",
            }}>
              Visit
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── All Projects Panel (portaled to body — must stay outside the
   ScrollSmoother-transformed content for position:fixed to work) ─── */
function AllProjectsPanel({ onClose }) {
  const [projects, setProjects] = useState(projectCache);
  const [loading, setLoading] = useState(!projectCache && !projectError);
  const [fetchErr, setFetchErr] = useState(projectError);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeDate, setActiveDate] = useState(projectCache ? projectCache[0].date : "");
  const [dateFading, setDateFading] = useState(false);
  const scrollRef = useRef(null);
  const dateTimerRef = useRef(null);
  const panelRef = useRef(null);
  const closingRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.paused(true);
    return () => {
      document.body.style.overflow = "";
      if (smoother) smoother.paused(false);
    };
  }, []);

  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.from(panelRef.current, { yPercent: 4, autoAlpha: 0, duration: 0.45, ease: "expo.out" });
  }, []);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion() || !panelRef.current) { onClose(); return; }
    gsap.to(panelRef.current, { yPercent: 3, autoAlpha: 0, duration: 0.3, ease: "power2.in", onComplete: onClose });
  };

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (projectCache) { setProjects(projectCache); setLoading(false); return; }
    if (projectError) { setFetchErr(true); setLoading(false); return; }
    projectFetch.then(() => {
      if (projectCache) { setProjects(projectCache); setActiveDate(projectCache[0].date); }
      else setFetchErr(true);
      setLoading(false);
    }).catch(() => { setFetchErr(true); setLoading(false); });
  }, []);

  const fmt = s => {
    if (!s) return ["", ""];
    const [d, m, y] = s.split("/");
    const date = new Date(+y, +m - 1, +d);
    return [
      date.toLocaleDateString("en-NZ", { month: "short" }).toUpperCase(),
      date.getFullYear().toString(),
    ];
  };

  const handleActiveItem = index => {
    if (!projects) return;
    const newDate = projects[index]?.date ?? "";
    setActiveIndex(index);
    clearTimeout(dateTimerRef.current);
    setDateFading(true);
    dateTimerRef.current = setTimeout(() => { setActiveDate(newDate); setDateFading(false); }, 160);
  };

  const [month, year] = fmt(activeDate);

  return createPortal(
    <div ref={panelRef} style={{
      position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
      zIndex: 150, background: "var(--bg)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        height: 52, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px, 4vw, 32px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {loading ? "Loading…" : projects ? `${projects.length} Projects` : "All work"}
        </span>
        <button onClick={handleClose} className="btn-secondary" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", fontSize: 13, color: "var(--text-muted)",
        }}>
          Close
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left date column — desktop only, hidden via CSS on mobile */}
        <div className="panel-date-left" style={{
          width: "clamp(72px, 14vw, 144px)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          padding: "0 20px 0 12px", userSelect: "none",
        }}>
          <div style={{
            textAlign: "right",
            opacity: dateFading ? 0 : 1,
            transform: dateFading ? "translateY(-6px)" : "translateY(0)",
            transition: "opacity 0.16s ease, transform 0.16s ease",
          }}>
            <div style={{ fontSize: "clamp(9px, 1.3vw, 11px)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", lineHeight: 1.2 }}>{month}</div>
            <div style={{ fontSize: "clamp(18px, 2.8vw, 26px)", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1.1, marginTop: 1 }}>{year}</div>
          </div>
        </div>

        {/* Date overlay — mobile only, shown via CSS */}
        <div className="panel-date-overlay" style={{
          position: "absolute", top: 18, right: 16,
          zIndex: 5, pointerEvents: "none", userSelect: "none", textAlign: "right",
        }}>
          <div style={{
            opacity: dateFading ? 0 : 1,
            transform: dateFading ? "translateY(-6px)" : "translateY(0)",
            transition: "opacity 0.16s ease, transform 0.16s ease",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", lineHeight: 1.2, textTransform: "uppercase" }}>{month}</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1.1, marginTop: 2 }}>{year}</div>
          </div>
        </div>

        {/* Scrollable snap area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "scroll",
            scrollSnapType: "y proximity",
            WebkitOverflowScrolling: "touch",
            position: "relative",
            padding: "0 clamp(24px, 4vw, 64px)",
          }}
        >
          {loading && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Loading…
            </div>
          )}
          {fetchErr && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Couldn't load the project list.{" "}<a href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>See my GitHub instead</a>
            </div>
          )}
          {projects && (
            <div style={{ paddingTop: "calc(50vh - 140px)", paddingBottom: "calc(50vh - 140px)", position: "relative", maxWidth: 640, margin: "0 auto" }}>
              {/* Line inside content container so it spans full scroll height, left:24 aligns with dot centers */}
              <div style={{
                position: "absolute", left: 24, top: 0, bottom: 0,
                width: 1, background: "var(--border)", pointerEvents: "none", zIndex: 0,
              }} />
              {projects.map((p, i) => (
                <ProjSnapItem key={i} project={p} index={i} active={i === activeIndex} scrollRef={scrollRef} onActive={handleActiveItem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Projects ─── */
// Each card gets a different banner-circle arrangement so the set feels varied
const CIRCLE_LAYOUTS = [
  [{ width: 200, height: 200, top: -60, right: -40, background: "rgba(255,255,255,0.04)" },
   { width: 120, height: 120, bottom: -30, left: 40, background: "rgba(255,255,255,0.06)" }],
  [{ width: 170, height: 170, top: -50, left: -30, background: "rgba(255,255,255,0.05)" },
   { width: 150, height: 150, bottom: -55, right: 24, background: "rgba(255,255,255,0.045)" }],
  [{ width: 230, height: 230, bottom: -90, right: -50, background: "rgba(255,255,255,0.04)" },
   { width: 100, height: 100, top: -24, left: 28, background: "rgba(255,255,255,0.07)" }],
  [{ width: 150, height: 150, top: 24, right: -60, background: "rgba(255,255,255,0.06)" },
   { width: 190, height: 190, bottom: -80, left: -50, background: "rgba(255,255,255,0.04)" }],
];

function ProjectCard({ project, idx }) {
  const cardRef = useRef(null);
  const bannerRef = useRef(null);

  useGSAP(() => {
    if (reducedMotion()) return;
    const card = cardRef.current;

    // Stack bars grow from zero when the card scrolls in
    gsap.from(card.querySelectorAll(".stack-bar"), {
      scaleX: 0, transformOrigin: "0 50%", duration: 0.9, ease: "power3.inOut", stagger: 0.12,
      scrollTrigger: { trigger: card, start: "top 80%", once: true },
    });

    // Banner decor circles drift as the card moves through the viewport
    gsap.fromTo(bannerRef.current.querySelectorAll(".banner-circle"),
      { y: -22 },
      { y: 22, ease: "none",
        scrollTrigger: { trigger: bannerRef.current, start: "top bottom", end: "bottom top", scrub: 1 } });

    // Cursor tilt + layered parallax — GSAP owns the card's transform, inner
    // layers drift at different rates so the contents feel like stacked planes.
    const mm = gsap.matchMedia();
    mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2" });

      // Build x/y setters per depth layer (front layers travel further → "closer")
      const setters = [];
      [[".pc-front", 18, 12], [".pc-mid", 11, 8], [".pc-near", 6, 4]].forEach(([sel, mx, my]) => {
        card.querySelectorAll(sel).forEach(el => {
          setters.push({
            x: gsap.quickTo(el, "x", { duration: 0.6, ease: "power2" }),
            y: gsap.quickTo(el, "y", { duration: 0.6, ease: "power2" }),
            mx, my,
          });
        });
      });
      const glare = bannerRef.current.querySelector(".card-glare");

      const enter = () => {
        gsap.to(card, { scale: 1.02, duration: 0.4, ease: "power2.out" });
        if (glare) gsap.to(glare, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });
      };
      const move = e => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        ry(nx * 13);
        rx(-ny * 11);
        setters.forEach(s => { s.x(nx * s.mx); s.y(ny * s.my); });
        if (glare) {
          glare.style.setProperty("--gx", ((nx + 0.5) * 100).toFixed(1) + "%");
          glare.style.setProperty("--gy", ((ny + 0.5) * 100).toFixed(1) + "%");
        }
      };
      const leave = () => {
        rx(0); ry(0);
        setters.forEach(s => { s.x(0); s.y(0); });
        gsap.to(card, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" });
        if (glare) gsap.to(glare, { autoAlpha: 0, duration: 0.4, ease: "power2.out" });
      };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerleave", leave);
      return () => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
      };
    });
  }, []);

  return (
    <Reveal type="reveal-scale" delay={idx * 120}>
      <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-link">
        <div ref={cardRef} className="project-card">
          {/* Banner */}
          <div ref={bannerRef} style={{
            height: "clamp(130px, 22vw, 180px)", background: `linear-gradient(135deg, ${project.accent} 0%, ${project.accent}cc 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {/* Cursor-follow light glare */}
            <div className="card-glare"></div>
            {/* Decorative circles — arrangement varies per card */}
            {CIRCLE_LAYOUTS[idx % CIRCLE_LAYOUTS.length].map((c, ci) => (
              <div key={ci} className="banner-circle" style={{ position: "absolute", borderRadius: "50%", ...c }}></div>
            ))}
            {/* Tag */}
            <div className="pc-mid" style={{ position: "absolute", top: 16, left: 16, padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,0.12)", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500, backdropFilter: "blur(8px)" }}>
              {project.type}
            </div>
            {/* Arrow */}
            <div className="card-arrow pc-mid" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 11L11 3M11 3H5M11 3V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Name */}
            <span className="pc-front" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(20px, 5vw, 28px)", color: "white", fontWeight: 400, letterSpacing: "-0.01em", position: "relative" }}>
              {project.name}
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px 28px" }}>
            <p className="pc-near" style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 20 }}>
              {project.desc}
            </p>
            {/* Stack bar */}
            <div style={{ display: "flex", height: 4, borderRadius: 99, overflow: "hidden", gap: 2, marginBottom: 16 }}>
              {project.stack.map(s => (
                <div key={s.label} className="stack-bar" style={{ flex: s.pct, background: s.color, opacity: 0.85 }}></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {project.stack.map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--text-muted)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}></div>
                  {s.label} <span style={{ opacity: 0.6 }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </a>
    </Reveal>
  );
}

function Projects() {
  return (
    <section id="projects" style={{ padding: "80px 32px", maxWidth: 780, margin: "0 auto" }}>
      <Reveal type="reveal-up">
        <div className="section-header-mb" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Selected work</div>
          <h2 style={{ fontSize: "clamp(20px, 4.5vw, 40px)", fontWeight: 600, letterSpacing: "-0.025em" }}>
            Projects
          </h2>
        </div>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PROJECTS.map((p, i) => <ProjectCard key={p.id} project={p} idx={i} />)}
      </div>
      <Reveal type="reveal-fade" delay={360}>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <Magnetic strength={0.25}>
            <a href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer" className="btn-secondary"
              style={{ padding: "11px 24px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              See more on GitHub
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Skill chip with tooltip ─── */
function SkillChip({ item }) {
  const tooltip = SKILL_TOOLTIPS[item];

  return (
    <span className="skill-chip" tabIndex={tooltip ? 0 : undefined}>
      {SKILL_ICONS[item] && (
        <img src={SKILL_ICONS[item]} alt="" height="18" style={{ width: 18, height: 18, flexShrink: 0 }} />
      )}
      {item}
      {tooltip && (
        <span className="chip-tooltip" role="tooltip">{tooltip}</span>
      )}
    </span>
  );
}

/* ─── Skills ─── */
function Skills() {
  const gridRef = useRef(null);

  useGSAP(() => {
    if (reducedMotion()) return;
    // Chips pop in per card; clearProps lets the CSS hover spring take over after
    gsap.utils.toArray(gridRef.current.querySelectorAll(".skills-card")).forEach(card => {
      gsap.from(card.querySelectorAll(".skill-chip"), {
        y: 10, scale: 0.85, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.045,
        clearProps: "transform",
        scrollTrigger: { trigger: card, start: "top 85%", once: true },
      });
    });
  }, []);

  return (
    <section id="skills" style={{ padding: "80px 32px", maxWidth: 780, margin: "0 auto" }}>
      <Reveal type="reveal-up">
        <div className="section-header-mb" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>What I work with</div>
          <h2 style={{ fontSize: "clamp(20px, 4.5vw, 40px)", fontWeight: 600, letterSpacing: "-0.025em" }}>
            Skills
          </h2>
        </div>
      </Reveal>
      <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {SKILLS.map((group, gi) => (
          <Reveal key={group.group} type="reveal-spring" delay={gi * 100}>
            <div className="skills-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid var(--border)", background: "white" }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
                {group.group}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {group.items.map(item => (
                  <SkillChip key={item} item={item} />
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Currently learning callout */}
      <Reveal type="reveal-fade" delay={300}>
        <div style={{ marginTop: 24, padding: "20px 28px", borderRadius: "var(--radius)", background: "var(--blue-light)", border: "1px solid var(--blue-faint)", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", flexShrink: 0, marginTop: 6 }}></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)", marginBottom: 4 }}>Currently learning</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>React, Node.js, and TypeScript — building toward full-stack fluency while maintaining a desktop-first approach with Tauri.</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Timeline / Experience ─── */
function Timeline() {
  const wrapRef = useRef(null);
  const lineRef = useRef(null);
  const [showAll, setShowAll] = useState(false);

  useGSAP(() => {
    if (reducedMotion()) return;
    // The line draws itself as you scroll through the section
    gsap.from(lineRef.current, {
      scaleY: 0, transformOrigin: "top center", ease: "none",
      scrollTrigger: { trigger: wrapRef.current, start: "top 75%", end: "bottom 70%", scrub: 0.5 },
    });
  }, []);

  return (
    <section id="experience" style={{ padding: "80px 32px", maxWidth: 780, margin: "0 auto" }}>
      <Reveal type="reveal-up">
        <div className="section-header-mb" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Journey</div>
          <h2 style={{ fontSize: "clamp(20px, 4.5vw, 40px)", fontWeight: 600, letterSpacing: "-0.025em" }}>
            Timeline
          </h2>
        </div>
      </Reveal>
      <div ref={wrapRef} style={{ position: "relative" }}>
        {/* Vertical line */}
        <div ref={lineRef} className="tl-line" style={{ position: "absolute", left: 84, top: 0, bottom: 0, width: 1, background: "var(--border)" }}></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {TIMELINE.map((item, i) => (
            <Reveal key={i} type="reveal-left" delay={i * 90}>
              <div style={{ display: "flex", gap: 0, paddingBottom: 40 }}>
                {/* Year column */}
                <div className="tl-year" style={{ width: 80, flexShrink: 0, paddingRight: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)", paddingTop: 3, textAlign: "right", lineHeight: 1.4 }}>{item.year}</div>
                </div>
                {/* Dot */}
                <div className="tl-dot-wrap" style={{ position: "relative", flexShrink: 0, marginRight: 24 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "var(--blue)" : "var(--border)", border: `2px solid ${i === 0 ? "var(--blue)" : "var(--border)"}`, marginTop: 4, boxShadow: i === 0 ? "0 0 0 4px var(--blue-faint)" : "none" }}></div>
                </div>
                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>{item.org}</div>
                  <div style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: "clamp(13px, 3vw, 14.5px)", color: "var(--text-muted)", lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Reveal type="reveal-fade" delay={120}>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <Magnetic strength={0.25}>
            <button onClick={() => setShowAll(true)} className="btn-secondary"
              style={{ padding: "11px 24px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
              View full timeline
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </Magnetic>
        </div>
      </Reveal>
      {showAll && <AllProjectsPanel onClose={() => setShowAll(false)} />}
    </section>
  );
}

/* ─── Contact ─── */
function Contact() {
  return (
    <section id="contact" style={{ padding: "80px 32px 60px", maxWidth: 780, margin: "0 auto" }}>
      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 80 }}></div>

      <Reveal type="reveal-up">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Get in touch</div>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 56px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
            Let's talk
          </h2>
          <p style={{ fontSize: "clamp(14px, 3.5vw, 17px)", color: "var(--text-muted)", maxWidth: 460, lineHeight: 1.65 }}>
            I'm always up for a chat about code, design, self-hosting, or photography — reach out anytime.
          </p>
        </div>
      </Reveal>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {CONTACT_LINKS.map((l, i) => (
          <Reveal key={l.label} type="reveal-spring" delay={i * 80}>
            <a href={l.href} className="contact-card"
              target={l.href.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer">
              <img src={l.icon} alt="" height="24" style={{ display: "block", marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 3 }}>{l.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{l.sub}</div>
            </a>
          </Reveal>
        ))}
      </div>

    </section>
  );
}

/* ─── App ─── */
export default function App() {
  // Whole-page inertial scrolling — desktop fine-pointer only, never under
  // reduced motion. Mobile keeps fully native scroll.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#smooth-content",
        smooth: SMOOTH_BASE,
      });
      // The smoother provides the easing; CSS smooth scrolling on top would double-ease
      document.documentElement.style.scrollBehavior = "auto";
      return () => {
        smoother.kill();
        document.documentElement.style.scrollBehavior = "";
      };
    });
  }, []);

  return (
    <>
      <Nav />
      <ScrollProgress />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main style={{ maxWidth: 1100, margin: "0 auto", background: "var(--bg)" }}>
            <Hero />
            <Projects />
            <Skills />
            <Timeline />
            <Contact />
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
