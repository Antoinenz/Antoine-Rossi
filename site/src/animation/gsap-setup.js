import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, useGSAP);

// Relaxed smoothing for free wheel/touch scrolling. Programmatic nav-click
// scrolls temporarily tighten this so they land directly instead of crawling.
export const SMOOTH_BASE = 1.1;

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP };
