import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import {
  getAllProjects,
  getProjectBySlug,
  adjacentProjects,
  LIMITATIONS_SECTION,
  TYPE_LABELS,
  type Project,
} from "@/lib/projects";
import { projectTitleTransition, projectCoverTransition } from "@/lib/project-types";
import { renderMarkdown } from "@/lib/markdown";
import { formatProjectDate } from "@/lib/format";
import { CoverImage } from "@/components/CoverImage";
import { ExternalArrow } from "@/components/ExternalArrow";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { Sep } from "@/components/Sep";
import { Venue } from "@/components/Venue";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, brandedImage, pageMetadata } from "@/lib/seo";
import { projectCard } from "@/lib/og-cards";
import { getLocalImageSize } from "@/lib/image-size";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: "Project Not Found" };
  }

  return pageMetadata({
    title: project.title,
    description: project.summary,
    path: `/portfolio/${project.slug}`,
    // A cover always wins; projects without one get the branded card.
    image: project.cover
      ? {
          url: project.cover,
          alt: project.coverAlt || project.title,
          ...(getLocalImageSize(project.cover) ?? {}),
        }
      : brandedImage(`project/${project.slug}`, projectCard(project)),
  });
}

interface ActionLink {
  href: string;
  label: string;
  external: boolean;
}

// In display order; only links the project actually has.
function actionLinks(project: Project): ActionLink[] {
  const { paper, live, repo, post } = project.links;
  const links: ActionLink[] = [];
  if (paper) links.push({ href: paper, label: "Read the paper", external: true });
  if (live) links.push({ href: live, label: "Live site", external: true });
  if (repo) links.push({ href: repo, label: "View code", external: true });
  if (post) {
    links.push({ href: post, label: "Related post", external: post.startsWith("https://") });
  }
  return links;
}

function ActionButton({ link, primary }: { link: ActionLink; primary: boolean }) {
  const className = primary ? "btn" : "btn btn--ghost";
  if (link.external) {
    return (
      <a className={className} href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
        <ExternalArrow />
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }
  return (
    <Link className={className} href={link.href}>
      {link.label}
      <span className="btn__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const projects = getAllProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  const html = await renderMarkdown(project.content, {
    caseStudy: { panelHeading: LIMITATIONS_SECTION },
  });
  const links = actionLinks(project);
  const linkComing = project.type === "research" && project.status === "Accepted" && !project.links.paper;
  const { prev, next } = adjacentProjects(projects, project.slug);
  const typeLabel = TYPE_LABELS[project.type];
  const metaItems = [
    <time key="date" dateTime={project.date}>
      {formatProjectDate(project.date)}
    </time>,
    project.venue && (
      <span key="venue">
        <Venue text={project.venue} />
      </span>
    ),
    project.role && <span key="role">{project.role}</span>,
  ].filter(Boolean);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: absoluteUrl(`/portfolio/${project.slug}`),
    dateCreated: project.date,
    genre: typeLabel,
    author: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    ...(project.links.paper ? { sameAs: project.links.paper } : {}),
    ...(project.cover ? { image: absoluteUrl(project.cover) } : {}),
  };

  return (
    <article className="post case">
      <JsonLd data={structuredData} />
      <div className="post__wrap">
        <div className="post__grid">
          <header className="post__head">
            <p className="kicker rise d1">
              <span className="kicker__tag">{typeLabel}</span>
              <span className="kicker__more">
                <Sep className="kicker__dot" />
                {project.status}
              </span>
            </p>
            <ViewTransition name={projectTitleTransition(project.slug)}>
              <h1 className="post__title rise d2">{project.title}</h1>
            </ViewTransition>
            <p className="post__dek rise d3">{project.summary}</p>

            <div className="case__meta">
              <p className="case__facts rise d4">
                {metaItems.map((item, i) => (
                  <span key={i} className="case__fact">
                    {i > 0 && <Sep className="byline__sep" />}
                    {item}
                  </span>
                ))}
              </p>
              {project.stack.length > 0 && (
                <ul className="case__stack" aria-label="Stack">
                  {project.stack.map((item) => (
                    <li key={item} className="chip chip--stack">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(links.length > 0 || linkComing) && (
              <div className="case__actions rise d5">
                {links.map((link, i) => (
                  <ActionButton key={link.href} link={link} primary={i === 0} />
                ))}
                {linkComing && <p className="case__note">Accepted, link coming</p>}
              </div>
            )}
          </header>
        </div>
      </div>

      {project.cover && (
        <div className="post__cover rise d5">
          <ViewTransition name={projectCoverTransition(project.slug)}>
            <div className="post__cover-in">
              <CoverImage
                src={project.cover}
                alt={project.coverAlt || ""}
                sizes="(min-width: 1100px) 1712px, 100vw"
              />
            </div>
          </ViewTransition>
        </div>
      )}

      <div className="post__wrap post__body">
        <div className="post__grid">
          {/* .post__main puts the column in the centre track of the desktop grid. */}
          <div className="post__main">
            <div className="article case__body" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>

      <nav className="post__wrap case__pager" aria-label="More projects">
        <div className="post__grid">
          <div className="post__main">
            <div className="case__pager-row">
              {prev && (
                <Link className="case__step case__step--prev" href={`/portfolio/${prev.slug}`}>
                  <span className="case__step-label">
                    <span aria-hidden="true">← </span>Previous project
                  </span>
                  <span className="case__step-title">{prev.title}</span>
                </Link>
              )}
              {next && (
                <Link className="case__step case__step--next" href={`/portfolio/${next.slug}`}>
                  <span className="case__step-label">
                    Next project<span aria-hidden="true"> →</span>
                  </span>
                  <span className="case__step-title">{next.title}</span>
                </Link>
              )}
            </div>
            <Link className="text-link case__back" href="/portfolio">
              Back to portfolio
            </Link>
          </div>
        </div>
      </nav>

      <Reveal />
    </article>
  );
}
