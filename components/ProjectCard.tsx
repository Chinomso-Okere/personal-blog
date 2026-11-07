import Link from "next/link";
import { ViewTransition } from "react";
import type { ProjectSummary } from "@/lib/projects";
import {
  cardLayout,
  TYPE_LABELS,
  kickerStatus,
  projectCoverTransition,
  projectTitleTransition,
} from "@/lib/project-types";
import { formatProjectDate } from "@/lib/format";
import { Sep } from "@/components/Sep";

// One portfolio card; the whole card links to the case study. Pure (no file
// access) so the client-side filters can render it too. The title and cover
// carry the same view-transition names as the case-study header, so they
// morph into it on navigation.

// The links a project has, as words: the card is already one link, so these
// are labels, not nested links.
function linkLabels(project: ProjectSummary): string[] {
  const { paper, live, repo, post } = project.links;
  const labels: string[] = [];
  if (paper) labels.push("Paper");
  else if (project.type === "research" && project.status === "Accepted") labels.push("Link coming");
  if (live) labels.push("Live site");
  if (repo) labels.push("Code");
  if (post) labels.push("Post");
  return labels;
}

/** Class for card `index` of `count` in .pf-cards (lead / second-in-row). */
export function cardClass(count: number, index: number): string | undefined {
  const { lead, secondInRow } = cardLayout(count, index);
  if (lead) return "pf-cards__lead";
  if (secondInRow) return "pf-cards__second";
  return undefined;
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const status = kickerStatus(project.type, project.status);
  const detail = project.venue ?? project.role;
  const labels = linkLabels(project);

  return (
    <Link href={`/portfolio/${project.slug}`} className="card pf-card">
      {project.cover && (
        <ViewTransition name={projectCoverTransition(project.slug)}>
          <span className="pf-card__img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.cover} alt={project.coverAlt ?? ""} loading="lazy" decoding="async" />
          </span>
        </ViewTransition>
      )}
      <span className="kicker pf-card__kicker">
        <span className="kicker__tag">{TYPE_LABELS[project.type]}</span>
        {status && (
          <span className="kicker__more">
            <Sep className="kicker__dot" />
            {status}
          </span>
        )}
      </span>
      <ViewTransition name={projectTitleTransition(project.slug)}>
        <h3 className="pf-card__title">
          <span>{project.title}</span>
        </h3>
      </ViewTransition>
      <span className="pf-card__summary">{project.summary}</span>
      <span className="pf-card__meta">
        <time dateTime={project.date}>{formatProjectDate(project.date)}</time>
        {detail && (
          <>
            <Sep className="kicker__dot" />
            <span>{detail}</span>
          </>
        )}
      </span>
      {labels.length > 0 && (
        <span className="pf-card__links">
          <span className="sr-only">Links: </span>
          {labels.map((label, i) => (
            <span key={label} className="pf-card__link">
              {i > 0 && <Sep className="kicker__dot" />}
              {label}
            </span>
          ))}
        </span>
      )}
      <span className="pf-card__read" aria-hidden="true">
        Read the case study <span className="feature__arrow">→</span>
      </span>
    </Link>
  );
}
