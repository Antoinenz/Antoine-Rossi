import React, { useState, useEffect, useRef } from "react";
import { PROJECTS, SKILL_TOOLTIPS, SKILL_ICONS, SKILLS, TIMELINE, CONTACT_LINKS } from "./data.js";
import { projectCache, projectError, projectFetch } from "./projects-feed.js";

/* ─── Reveal system ─── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, type = "reveal-up", delay = 0, style = {}, tag = "div" }) {
  const ref = useReveal(0.12);
  const Tag = tag;
  return (
    <Tag ref={ref} className={type} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

// Hero word-by-word reveal
function HeroWords({ text, serif = false, style = {} }) {
  const ref = useReveal(0.1);
  const words = text.split(" ");
  return (
    <span ref={ref} className="hero-words" style={{ display: "inline", ...style }}>
      {words.map((word, i) => (
        <span key={i} className="hero-word" style={{ transitionDelay: `${i * 60}ms`, fontFamily: serif ? "var(--font-serif)" : undefined, fontStyle: serif ? "italic" : undefined }}>
          {word}{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ─── Nav ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [activeSection, setActiveSection] = useState("");

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
    document.body.style.overflow = (menuOpen || menuClosing) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, menuClosing]);

  const closeMenu = () => {
    setMenuClosing(true);
    setTimeout(() => { setMenuOpen(false); setMenuClosing(false); }, 260);
  };

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
        <a href="#" style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", textDecoration: "none", letterSpacing: "-0.01em" }}>
          <img src="/icon.svg" alt="Antoine Rossi" style={{ height: 30, marginLeft: 4, verticalAlign: "middle" }} />
        </a>
        {/* Desktop links */}
        <div className="nav-links-desktop">
          {links.map(s => (
            <a key={s} href={`#${s.toLowerCase()}`}
              className={`nav-link${activeSection === s.toLowerCase() ? " active" : ""}`}>
              {s}
            </a>
          ))}
          <a href="https://github.com/Antoinenz" target="_blank" rel="noopener noreferrer"
            className="btn-primary"
            style={{ marginLeft: 8, padding: "6px 16px", fontSize: 14 }}>
            GitHub
          </a>
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
        <div className={`mobile-menu-overlay${menuClosing ? " closing" : ""}`} style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "var(--bg)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          paddingTop: 60, gap: 0,
        }}>
          {links.map(s => (
            <a key={s} className="mobile-menu-link"
              href={`#${s.toLowerCase()}`}
              onClick={closeMenu}
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
  return (
    <section id="about" style={{ padding: "190px 32px 100px", maxWidth: 780, margin: "0 auto" }}>
      {/* Name — word by word */}
      <h1 style={{ fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--text)" }}>
        <HeroWords text="Antoine Rossi" />
      </h1>

      {/* Subtitle */}
      <Reveal type="reveal-up" delay={200}>
        <h2 style={{ fontSize: "clamp(20px, 4.5vw, 36px)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.02em", color: "var(--text-muted)", marginBottom: 32 }}>
          <HeroWords text="Full-Stack Developer" serif={true} />
          {" "}&amp; curious teenager
        </h2>
      </Reveal>

      {/* Bio */}
      <Reveal type="reveal-up" delay={280}>
        <p style={{ fontSize: "clamp(14px, 4vw, 18px)", color: "var(--text-muted)", maxWidth: 540, lineHeight: 1.65, marginBottom: 40, fontWeight: 350 }}>
          I like to learn new things. I'm still a teenager, so I'm always changing — building desktop apps, web tools, and everything in between. Fluent in both English and French.
        </p>
      </Reveal>

      {/* CTA buttons */}
      <Reveal type="reveal-spring" delay={360}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "View Projects", href: "#projects", primary: true },
            { label: "LinkedIn", href: "https://linkedin.com/in/antoinenzfr", primary: false },
            { label: "Instagram", href: "https://instagram.com/antoinenzfr/", primary: false },
          ].map(btn => (
            <a key={btn.label} href={btn.href}
              target={btn.href.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className={btn.primary ? "btn-primary" : "btn-secondary"}
              style={{ padding: "clamp(8px, 2vw, 10px) clamp(14px, 4vw, 22px)", fontSize: "clamp(12.5px, 3.2vw, 14.5px)" }}>
              {btn.label}
            </a>
          ))}
        </div>
      </Reveal>

      {/* Stats row */}
      <Reveal type="reveal-fade" delay={460}>
        <div style={{ marginTop: "clamp(28px, 5vw, 48px)", display: "flex", gap: "clamp(16px, 4vw, 32px)", flexWrap: "wrap" }}>
          {[
            { label: "Auckland, NZ", sub: "Current base" },
            { label: "France", sub: "2 years · Fluent" },
            { label: "Photography", sub: "Hobby" },
          ].map((item, i) => (
            <Reveal key={item.label} type="reveal-up" delay={460 + i * 80}>
              <div style={{ fontSize: "clamp(12px, 3.5vw, 15px)", fontWeight: 500, color: "var(--text)" }}>{item.label}</div>
              <div style={{ fontSize: "clamp(10.5px, 3vw, 13px)", color: "var(--text-muted)" }}>{item.sub}</div>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Snap project item ─── */
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

/* ─── All Projects Panel ─── */
function AllProjectsPanel({ onClose }) {
  const [projects, setProjects] = useState(projectCache);
  const [loading, setLoading] = useState(!projectCache && !projectError);
  const [fetchErr, setFetchErr] = useState(projectError);
  const [closing, setClosing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeDate, setActiveDate] = useState(projectCache ? projectCache[0].date : "");
  const [dateFading, setDateFading] = useState(false);
  const scrollRef = useRef(null);
  const dateTimerRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const handleClose = () => { setClosing(true); setTimeout(onClose, 310); };

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

  return (
    <div style={{
      position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
      zIndex: 150, background: "var(--bg)",
      display: "flex", flexDirection: "column",
      animation: `${closing ? "panel-out" : "panel-in"} 0.32s var(--ease-out) both`,
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
    </div>
  );
}

/* ─── Projects ─── */
function ProjectCard({ project, idx }) {
  return (
    <Reveal type="reveal-scale" delay={idx * 120}>
      <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-link">
        <div className="project-card">
          {/* Banner */}
          <div style={{
            height: "clamp(130px, 22vw, 180px)", background: `linear-gradient(135deg, ${project.accent} 0%, ${project.accent}cc 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {/* Decorative circles */}
            <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", top: -60, right: -40 }}></div>
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -30, left: 40 }}></div>
            {/* Tag */}
            <div style={{ position: "absolute", top: 16, left: 16, padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,0.12)", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500, backdropFilter: "blur(8px)" }}>
              {project.type}
            </div>
            {/* Arrow */}
            <div className="card-arrow" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 11L11 3M11 3H5M11 3V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Name */}
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(20px, 5vw, 28px)", color: "white", fontWeight: 400, letterSpacing: "-0.01em" }}>
              {project.name}
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px 28px" }}>
            <p style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 20 }}>
              {project.desc}
            </p>
            {/* Stack bar */}
            <div style={{ display: "flex", height: 4, borderRadius: 99, overflow: "hidden", gap: 2, marginBottom: 16 }}>
              {project.stack.map(s => (
                <div key={s.label} style={{ flex: s.pct, background: s.color, opacity: 0.85 }}></div>
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
  const [showAll, setShowAll] = useState(false);

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
          <button onClick={() => setShowAll(true)} className="btn-secondary"
            style={{ padding: "11px 24px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            See all projects
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </Reveal>
      {showAll && <AllProjectsPanel onClose={() => setShowAll(false)} />}
    </section>
  );
}

/* ─── Skill chip with tooltip ─── */
function SkillChip({ item, gi, ii }) {
  const tooltip = SKILL_TOOLTIPS[item];

  return (
    <span
      className="skill-chip reveal-chip"
      tabIndex={tooltip ? 0 : undefined}
      style={{ transitionDelay: `${gi * 100 + ii * 55}ms` }}
    >
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {SKILLS.map((group, gi) => (
          <Reveal key={group.group} type="reveal-spring" delay={gi * 100}>
            <div style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid var(--border)", background: "white" }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
                {group.group}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {group.items.map((item, ii) => (
                  <SkillChip key={item} item={item} gi={gi} ii={ii} />
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
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div className="tl-line" style={{ position: "absolute", left: 84, top: 0, bottom: 0, width: 1, background: "var(--border)" }}></div>
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

      {/* Footer */}
      <Reveal type="reveal-fade" delay={200}>
        <div style={{ marginTop: 80, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>© 2026 Antoine Rossi</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Auckland, New Zealand</span>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── App ─── */
export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Nav />
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Hero />
        <Projects />
        <Skills />
        <Timeline />
        <Contact />
      </main>
    </div>
  );
}
