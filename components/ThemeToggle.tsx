"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === "data-theme") {
        callback();
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    observer.disconnect();
  };
}

function getSnapshot(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme") as
    | "light"
    | "dark"
    | null;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const mounted = useIsMounted();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Enable the theme cross-fade only after the first client paint.
  useEffect(() => {
    const root = document.documentElement;
    const frame = requestAnimationFrame(() => root.classList.add("theme-ready"));
    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("theme-ready");
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("blogTheme", nextTheme);
    } catch {
      // Ignore storage errors in private/incognito mode
    }
  };

  const isDark = mounted && theme === "dark";

  // The accessible name stays constant; aria-checked carries the state.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      className="toggle"
      onClick={toggleTheme}
    >
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__knob" />
      </span>
      <span className="toggle__label" aria-hidden="true">
        {mounted ? (
          isDark ? (
            "Dark"
          ) : (
            "Light"
          )
        ) : (
          <span className="opacity-0 select-none">Light</span>
        )}
      </span>
    </button>
  );
}
