"use client";

import { useEffect } from "react";

const DONE_MS = 1600;

// Adds a Copy button to every code block in the post. The buttons are created
// here, not in the markdown HTML, so the sanitiser never has to allow them.
// Titled blocks get the button in their filename bar; untitled blocks get it in
// the empty .copybar that lib/markdown.ts renders on the server, so adding the
// button never shifts the layout. Without the clipboard API nothing is added.
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

      const bar = figure.querySelector(":scope > .cap, :scope > .copybar");
      if (bar) {
        bar.appendChild(button);
        added.push(button);
      } else {
        // Fallback for code blocks the server step does not reach (nested in a
        // list or quote): build the bar here.
        const ownBar = document.createElement("div");
        ownBar.className = "copybar";
        ownBar.appendChild(button);
        figure.insertBefore(ownBar, figure.firstChild);
        added.push(ownBar);
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
