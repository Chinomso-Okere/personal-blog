"use client";

import { useEffect } from "react";

// A 3px bar along the bottom edge of the sticky header. 0% when the top of the
// article reaches the header, 100% when the end of the article is in view.
// Also publishes the header height as --header-h for scroll-margin-top.
export function ReadingProgress() {
  useEffect(() => {
    const root = document.documentElement;
    const masthead = document.querySelector<HTMLElement>(".masthead");
    const article = document.querySelector<HTMLElement>("[data-post-article]");
    if (!masthead || !article) return;

    const track = document.createElement("div");
    track.className = "progress";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("div");
    bar.className = "progress__bar";
    track.appendChild(bar);
    masthead.appendChild(track);

    let headerH = masthead.offsetHeight;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const start = rect.top + window.scrollY - headerH;
      const end = rect.bottom + window.scrollY - window.innerHeight;
      if (end <= start) {
        track.hidden = true;
        return;
      }
      track.hidden = false;
      const p = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      bar.style.transform = `scaleX(${p})`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const resizeObserver = new ResizeObserver(() => {
      headerH = masthead.offsetHeight;
      root.style.setProperty("--header-h", `${headerH}px`);
      schedule();
    });
    resizeObserver.observe(masthead);
    resizeObserver.observe(article);

    root.style.setProperty("--header-h", `${headerH}px`);
    update();

    // The browser jumps to a #heading before this runs, using the CSS fallback
    // header height; re-align once with the measured height.
    if (window.location.hash) {
      const target = document.getElementById(
        decodeURIComponent(window.location.hash.slice(1))
      );
      if (target && article.contains(target)) {
        target.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      track.remove();
      root.style.removeProperty("--header-h");
    };
  }, []);

  return null;
}
