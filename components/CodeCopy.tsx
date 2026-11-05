"use client";

import { useEffect } from "react";

const DONE_MS = 1600;

// Adds a Copy button to every code block in the post. The buttons are created
// here, not in the markdown HTML, so the sanitiser never has to allow them.
// Titled blocks get the button in their filename bar; untitled blocks get a
// slim bar of their own above the code (built here, so the server HTML for an
// untitled fence never has a .cap). Without the clipboard API nothing is added.
export function CodeCopy() {
  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-post-article]");
    if (!article || !navigator.clipboard?.writeText) return;

    const added: HTMLElement[] = [];
    const timers = new Map<HTMLButtonElement, number>();

    article.querySelectorAll<HTMLElement>("figure.code").forEach((figure) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");

      const cap = figure.querySelector(":scope > .cap");
      if (cap) {
        cap.appendChild(button);
        added.push(button);
      } else {
        const bar = document.createElement("div");
        bar.className = "copybar";
        bar.appendChild(button);
        figure.insertBefore(bar, figure.firstChild);
        added.push(bar);
      }
    });

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button.copy"
      );
      const code = button?.closest("figure.code")?.querySelector("pre");
      if (!button || !code) return;

      navigator.clipboard.writeText(code.textContent ?? "").then(
        () => {
          button.dataset.done = "yes";
          button.textContent = "Copied";
          button.setAttribute("aria-label", "Copied");
          window.clearTimeout(timers.get(button));
          timers.set(
            button,
            window.setTimeout(() => {
              delete button.dataset.done;
              button.textContent = "Copy";
              button.setAttribute("aria-label", "Copy code");
            }, DONE_MS)
          );
        },
        () => {
          // Clipboard refused (permissions, insecure context): stay silent.
        }
      );
    };
    article.addEventListener("click", onClick);

    return () => {
      article.removeEventListener("click", onClick);
      timers.forEach((t) => window.clearTimeout(t));
      added.forEach((el) => el.remove());
    };
  }, []);

  return null;
}
