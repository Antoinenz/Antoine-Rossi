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
