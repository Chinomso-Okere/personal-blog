import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllProjects,
  showFilters,
  toSummary,
  type ProjectSummary,
} from "@/lib/projects";
import { cardClass } from "@/components/ProjectCard";
import { getCvSkills } from "@/lib/cv";
import { getAbout } from "@/lib/about";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, brandedImage, pageMetadata } from "@/lib/seo";
import { sectionCard } from "@/lib/og-cards";
import { sectionPages, PORTFOLIO_HERO, CV_PATH } from "@/lib/pages";
import { ProjectCard } from "@/components/ProjectCard";
import { PortfolioFilters } from "@/components/PortfolioFilters";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";

const page = sectionPages.portfolio;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  socialTitle: `${page.title} | ${siteConfig.name}`,
  description: page.description,
  path: page.path,
  image: brandedImage("portfolio", sectionCard("portfolio")),
});

function SectionHead({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="sec-head">
      <h2 id={id} className="sec-head__label">
        {children}
      </h2>
      <span className="sec-head__rule" aria-hidden="true"></span>
    </div>
  );
}

export default function PortfolioPage() {
  // Cards and the client filters need no body text.
  const projects: ProjectSummary[] = getAllProjects().map(toSummary);
  const skills = getCvSkills();
  const { workWithMe } = getAbout();
  const { linkedin, email } = siteConfig.links;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    description: page.description,
    url: absoluteUrl(page.path),
    author: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    hasPart: projects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      url: absoluteUrl(`/portfolio/${project.slug}`),
    })),
  };

  return (
    <div className="portfolio">
      <JsonLd data={structuredData} />

      <section className="hero">
        <div className="site-container">
          {/* Stacked: the display gets the full width (two lines), lede below. */}
          <div className="hero__grid hero__grid--stack">
            <div>
              <p className="hero__eyebrow rise d1">{PORTFOLIO_HERO.eyebrow}</p>
              <h1 className="hero__display">
                <span className="ln">
                  <span>{PORTFOLIO_HERO.line1}</span>
                </span>{" "}
                <span className="ln ln--2">
                  <span>
                    <em>{PORTFOLIO_HERO.line2}</em>
                  </span>
                </span>
              </h1>
            </div>
            <div>
              <p className="hero__lede rise d3">{PORTFOLIO_HERO.lede}</p>
            </div>
          </div>
        </div>
      </section>

      {projects.length > 0 && (
        <section className="home-sec" aria-labelledby="cases-heading">
          <div className="site-container">
            <SectionHead id="cases-heading">Case studies</SectionHead>
            {showFilters(projects.length) ? (
              <PortfolioFilters projects={projects} />
            ) : (
              <ul className="pf-cards">
                {projects.map((project, i) => (
                  <li
                    key={project.slug}
                    data-reveal=""
                    className={cardClass(projects.length, i)}
                  >
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="home-sec" aria-labelledby="capabilities-heading">
          <div className="site-container">
            <SectionHead id="capabilities-heading">Capabilities</SectionHead>
            <ul className="pf-skills">
              {skills.map((group) => (
                <li key={group.heading} data-reveal="">
                  <h3 className="pf-skills__heading">{group.heading}</h3>
                  <p className="pf-skills__text">{group.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="home-sec" aria-label="Get in touch">
        <div className="site-container">
          <div className="pf-routes">
            <div className="pf-route" data-reveal="">
              <h2 className="pf-route__title">Hiring?</h2>
              <div className="about-cta">
                {CV_PATH && (
                  <Link className="btn" href={CV_PATH}>
                    See my CV
                    <span className="btn__arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                )}
                {linkedin && (
                  <a
                    className={CV_PATH ? "btn btn--ghost" : "btn"}
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                    <span className="btn__arrow" aria-hidden="true">
                      ↗
                    </span>
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                )}
              </div>
            </div>
            <div className="pf-route" data-reveal="">
              <h2 className="pf-route__title">Work with me</h2>
              {workWithMe && <p className="pf-route__text">{workWithMe}</p>}
              <div className="about-cta">
                {email && (
                  <a className="btn" href={email}>
                    Email
                  </a>
                )}
                <Link className="text-link pf-route__more" href="/about#work-with-me">
                  More about working with me →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Reveal />
    </div>
  );
}
