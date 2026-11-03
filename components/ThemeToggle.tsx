"use client";

import { useSyncExternalStore } from "react";

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

  const actionDescription = mounted
    ? theme === "dark"
      ? "Switch to light theme"
      : "Switch to dark theme"
    : "Switch theme";

  return (
    <button
      type="button"
      className="toggle"
      onClick={toggleTheme}
      aria-label={actionDescription}
    >
      {mounted ? (
        theme === "dark" ? (
          "Light"
        ) : (
          "Dark"
        )
      ) : (
        <span className="opacity-0 select-none" aria-hidden="true">
          Dark
        </span>
      )}
    </button>
  );
}
