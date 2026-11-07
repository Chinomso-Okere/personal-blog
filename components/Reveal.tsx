"use client";

import { useEffect } from "react";

// One-time "fade up on entry" for every [data-reveal] element on the page
// (case-study sections now; portfolio cards in Phase 3).
//
// Only elements entirely below the fold when the page mounts are hidden
// (.is-pending), so nothing the reader can already see ever flickers, and
// without JavaScript nothing is hidden at all. Each element plays .is-in once
// on entering the viewport and is then no longer observed. Opacity and
// transform only, so the reveal never causes layout shift. Under reduced
// motion this does nothing and content stays in its final state.
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const pending = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    ).filter((el) => el.getBoundingClientRect().top >= window.innerHeight);
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.remove("is-pending");
          el.classList.add("is-in");
          observer.unobserve(el);
        }
      },
      // Start just before the element is 8% into the viewport.
      { rootMargin: "0px 0px -8% 0px" }
    );

    for (const el of pending) {
      el.classList.add("is-pending");
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      // A client navigation away leaves nothing half-hidden behind.
      for (const el of pending) el.classList.remove("is-pending");
    };
  }, []);

  return null;
}
