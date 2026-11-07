"use client";

import { startTransition, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import type { ProjectSummary } from "@/lib/projects";
import { PROJECT_TYPES, TYPE_LABELS, type ProjectType } from "@/lib/project-types";
import { ProjectCard } from "@/components/ProjectCard";

type Filter = ProjectType | "all";

// Type filter for /portfolio, rendered only above FILTER_THRESHOLD entries
// (lib/projects.ts showFilters). The active marker slides with transform only,
// and the list change runs in a transition so <ViewTransition> animates cards
// to their new places instead of jumping (off under reduced motion via the
// global view-transition rule).
export function PortfolioFilters({ projects }: { projects: ProjectSummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const buttons = useRef(new Map<Filter, HTMLButtonElement>());
  const marker = useRef<HTMLSpanElement>(null);

  const types = PROJECT_TYPES.filter((type) => projects.some((p) => p.type === type));
  const options: Filter[] = ["all", ...types];
  const shown = filter === "all" ? projects : projects.filter((p) => p.type === filter);

  useLayoutEffect(() => {
    const button = buttons.current.get(filter);
    if (!button || !marker.current) return;
    // A 1px-wide bar scaled to the button's width: transform only, no layout.
    marker.current.style.transform = `translateX(${button.offsetLeft}px) scaleX(${button.offsetWidth})`;
  }, [filter]);

  return (
    <>
      <div className="pf-filters" role="group" aria-label="Filter by type">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            ref={(el) => {
              if (el) buttons.current.set(option, el);
              else buttons.current.delete(option);
            }}
            className="pf-filters__btn"
            aria-pressed={filter === option}
            onClick={() => startTransition(() => setFilter(option))}
          >
            {option === "all" ? "All" : TYPE_LABELS[option]}
          </button>
        ))}
        <span ref={marker} className="pf-filters__marker" aria-hidden="true" />
      </div>
      <ul className="pf-cards">
        {shown.map((project) => (
          <ViewTransition key={project.slug}>
            <li data-reveal="">
              <ProjectCard project={project} />
            </li>
          </ViewTransition>
        ))}
      </ul>
    </>
  );
}
