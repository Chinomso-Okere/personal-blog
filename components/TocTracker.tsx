"use client";

import { useEffect } from "react";

// A heading becomes the current section once its top crosses this line.
const ACTIVE_LINE = 0.28;

// Marks the TOC link for the section being read (.on + aria-current), and
// closes the mobile "On this page" disclosure after a link is chosen.
export function TocTracker() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("[data-toc] a[href^='#']")
    );
    const ids = Array.from(new Set(links.map((a) => a.hash.slice(1))));
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    let active = "";
    let frame = 0;
    const setActive = (id: string) => {
      if (id === active) return;
      active = id;
      for (const a of links) {
        const on = a.hash.slice(1) === id;
        a.classList.toggle("on", on);
        if (on) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      }
    };

    // Position-based, so the answer is the same scrolling down or up: the
    // current section is the last heading whose top is above the line. At the
    // very bottom of the page the last heading wins even if it never reaches it.
    const recompute = () => {
      frame = 0;
      const line = window.innerHeight * ACTIVE_LINE;
      let current = headings[0].id;
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= line) current = h.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) current = headings[headings.length - 1].id;
      setActive(current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(recompute);
    };

    // The observer's zone is the top 28% of the viewport, so it fires the
    // moment a heading crosses the line in either direction. The rAF-throttled
    // scroll listener covers fast jumps that skip straight over the zone.
    const observer = new IntersectionObserver(schedule, {
      rootMargin: `0px 0px -${(1 - ACTIVE_LINE) * 100}% 0px`,
    });
    headings.forEach((h) => observer.observe(h));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    recompute();

    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      const details = link?.closest("details");
      if (details) details.open = false;
    };
    const containers = document.querySelectorAll<HTMLElement>("[data-toc]");
    containers.forEach((c) => c.addEventListener("click", onClick));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      containers.forEach((c) => c.removeEventListener("click", onClick));
    };
  }, []);

  return null;
}
