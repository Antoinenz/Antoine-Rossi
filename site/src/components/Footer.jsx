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
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 40, padding: "48px 32px 40px", maxWidth: 1100, margin: "40px auto 0" }}>
      <Reveal type="reveal-fade">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <img src="/icon.svg" alt="Antoine Rossi" style={{ height: 30, marginBottom: 14 }} />
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Full-stack developer in Auckland, New Zealand — building desktop apps, web tools, and everything in between.
            </p>
          </div>

          {/* My sites */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              My other sites
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px 32px", maxWidth: 380 }}>
              {MY_SITES.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="footer-link"
                  style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.note}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px 18px" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>© 2026 Antoine Rossi</span>
          <a href="/privacy" className="footer-link" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
            Privacy Policy
          </a>
        </div>
      </Reveal>
    </footer>
  );
}
