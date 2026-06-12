import typescriptIcon from "./icons/typescript.svg";
import javascriptIcon from "./icons/javascript.svg";
import htmlIcon from "./icons/html.svg";
import pythonIcon from "./icons/python.svg";
import rustIcon from "./icons/rust.svg";
import reactIcon from "./icons/react.svg";
import nodejsIcon from "./icons/nodejs.svg";
import tauriIcon from "./icons/tauri.svg";
import davinciIcon from "./icons/davinciresolve.svg";
import gitIcon from "./icons/git.svg";
import dockerIcon from "./icons/docker.svg";
import networkingIcon from "./icons/networking.svg";
import selfhostingIcon from "./icons/selfhosting.svg";
import photographyIcon from "./icons/photography.svg";
import desktopappsIcon from "./icons/desktopapps.svg";
import gsapIcon from "./icons/gsap.svg";
import lightroomclassicIcon from "./icons/lightroomclassic.svg";
import motionIcon from "./icons/motion.svg";
import emailIcon from "./icons/email.svg";
import githubIcon from "./icons/github.svg";
import instagramIcon from "./icons/instagram.svg";
import linkedinIcon from "./icons/linkedin.svg";

export const PROJECTS = [
  {
    id: "catalyst",
    name: "Catalyst",
    type: "Desktop App",
    desc: "A Tauri-powered desktop video downloader wrapping yt-dlp. Fast, native, and cross-platform — built with Rust under the hood.",
    stack: [
      { label: "TypeScript", pct: 65, color: "#3178C6" },
      { label: "Rust", pct: 32.6, color: "#CE412B" },
      { label: "CSS", pct: 1.2, color: "#563D7C" },
    ],
    accent: "#1a1a2e",
    url: "https://catalyst.tachyon-studios.com",
  },
  {
    id: "monsterprod",
    name: "monsterprod.fr",
    type: "Website",
    desc: "Full site build for monsterprod.fr — clean layout, hand-crafted CSS, no frameworks.",
    stack: [
      { label: "CSS", pct: 56, color: "#563D7C" },
      { label: "HTML", pct: 33.6, color: "#E34C26" },
      { label: "JavaScript", pct: 10.4, color: "#F1E05A" },
    ],
    accent: "#1a2e1a",
    url: "https://monsterprod.fr",
  },
  {
    id: "spotify",
    name: "Spotify Fullscreen",
    type: "Chrome Extension",
    desc: "A Chrome extension that surfaces a beautiful fullscreen interface while music is playing — like a screensaver for your music.",
    stack: [
      { label: "JavaScript", pct: 79.3, color: "#F1E05A" },
      { label: "CSS", pct: 11.2, color: "#563D7C" },
      { label: "HTML", pct: 9.5, color: "#E34C26" },
    ],
    accent: "#0e2733",
    url: "https://github.com/MonsterProd85/spotify-fullscreen-mode",
  },
];

export const SKILL_TOOLTIPS = {
  "TypeScript":      "Typed superset of JavaScript — catches bugs before your code runs.",
  "JavaScript":      "The language of the web, running natively in every browser.",
  "HTML & CSS":      "The building blocks of every webpage: structure and style.",
  "Python":          "Versatile scripting language great for automation and backends.",
  "Rust":            "Systems language focused on memory safety and raw performance.",
  "React":           "Component-based UI library by Meta that powers modern web UIs.",
  "Node.js":         "JavaScript runtime for running JS on the server side.",
  "Tauri":           "Build tiny, fast desktop apps using web tech with a Rust backend.",
  "DaVinci Resolve": "Professional video editing and color grading suite by Blackmagic.",
  "Git":             "Industry-standard version control — tracks every change over time.",
  "Docker":          "Package apps into containers so they run identically anywhere.",
  "Networking":      "How devices communicate — IP, DNS, routing, firewalls, and more.",
  "Self-hosting":    "Running your own servers and services instead of relying on big cloud.",
  "Photography":     "Capturing moments — I love experiment with lots of different artistic styles.",
  "Desktop apps":    "Applications that run on your computer, not in a browser.",
  "GSAP":            "JavaScript animation library for smooth, high-performance motion on the web.",
  "Lightroom Classic": "Adobe's professional photo editing and cataloguing software for organizing and editing shoots.",
  "Motion":   "Production-ready lightweight animation library for React, built on top of the Web Animations API.",
};

export const SKILL_ICONS = {
  "TypeScript":      typescriptIcon,
  "JavaScript":      javascriptIcon,
  "HTML & CSS":      htmlIcon,
  "Python":          pythonIcon,
  "Rust":            rustIcon,
  "React":           reactIcon,
  "Node.js":         nodejsIcon,
  "Tauri":           tauriIcon,
  "DaVinci Resolve": davinciIcon,
  "Git":             gitIcon,
  "Docker":          dockerIcon,
  "Networking":      networkingIcon,
  "Self-hosting":    selfhostingIcon,
  "Photography":     photographyIcon,
  "Desktop apps":    desktopappsIcon,
  "GSAP":            gsapIcon,
  "Lightroom Classic": lightroomclassicIcon,
  "Motion":   motionIcon,
};

export const SKILLS = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "HTML & CSS", "Python", "Rust"] },
  { group: "Frameworks", items: ["React", "Node.js", "Tauri", "GSAP", "Motion"] },
  { group: "Tools", items: ["DaVinci Resolve", "Git", "Docker", "Lightroom Classic"] },
  { group: "Interests", items: ["Networking", "Self-hosting", "Photography", "Desktop apps"] },
];

export const TIMELINE = [
  { year: "Now", title: "Catalyst — in development", org: "Desktop App", desc: "Building a Tauri-powered video downloader wrapping yt-dlp. Alpha versions available. Actively developing new features." },
  { year: "Nov 2025", title: "Spotify Fullscreen Mode", org: "Chrome Extension", desc: "Published a Chrome extension that surfaces a beautiful fullscreen music interface. First publicly shipped product." },
  { year: "Jun 2025", title: "monsterprod.fr", org: "Website", desc: "Built the full site for monsterprod.fr — hand-crafted HTML, CSS and JavaScript, no frameworks." },
  { year: "Mar 2025", title: "ShortLink", org: "Website", desc: "Built a simple URL shortening service with a clean, modern interface." },
  { year: "July 2023", title: "Two years in France", org: "French immersion", desc: "Left New Zealand in July 2023, returned September 2025. Became fully fluent in French while continuing to code and shoot photography." },
  { year: "2023", title: "First real projects", org: "JS + Python", desc: "Started building proper web apps — JavaScript frontends backed by Python servers. Things started clicking." },
  { year: "2020", title: "Started coding", org: "Python → HTML & CSS", desc: "Picked up Python at age 10, then quickly moved into HTML and CSS. Fell in love with building things on a screen." },
];

export const CONTACT_LINKS = [
  { label: "Email", href: "mailto:contact@rossi.nz", sub: "contact@rossi.nz", icon: emailIcon },
  { label: "GitHub", href: "https://github.com/Antoinenz", sub: "Antoinenz", icon: githubIcon },
  { label: "Instagram", href: "https://instagram.com/antoinenzfr/", sub: "antoinenzfr", icon: instagramIcon },
  { label: "LinkedIn", href: "https://linkedin.com/in/antoinenzfr", sub: "antoinenzfr", icon: linkedinIcon },
];
