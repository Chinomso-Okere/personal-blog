import type { Metadata } from "next";
import { getCv, parseCvSections, parseExperience, parseCvSkills } from "@/lib/cv";
import { renderMarkdown } from "@/lib/markdown";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, brandedImage, pageMetadata } from "@/lib/seo";
import { sectionCard } from "@/lib/og-cards";
import { sectionPages } from "@/lib/pages";
import { personJsonLd } from "@/lib/person";
import { JsonLd } from "@/components/JsonLd";
import { PrintButton } from "@/components/PrintButton";
import { Sep } from "@/components/Sep";

const page = sectionPages.cv;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  socialTitle: `${page.title} | ${siteConfig.name}`,
  description: page.description,
  path: page.path,
  image: brandedImage("cv", sectionCard("cv")),
});

// CV sections render without a lead paragraph or drop cap, and the DOI (the
// only external link in the body) opens in a new tab like the case studies.
const MARKDOWN = { lead: false, externalLinksNewTab: true } as const;

function sectionId(heading: string): string {
  return `cv-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

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

export default async function CvPage() {
  const cv = getCv();
  const sections = await Promise.all(
    parseCvSections(cv.content).map(async (section) => {
      if (/^experience$/i.test(section.heading)) {
        const roles = await Promise.all(
          parseExperience(section.body).map(async (role) => ({
            ...role,
            html: await renderMarkdown(role.body, MARKDOWN),
          }))
        );
        return { ...section, kind: "experience" as const, roles };
      }
      if (/^skills$/i.test(section.heading)) {
        return { ...section, kind: "skills" as const, skills: parseCvSkills(cv.content) };
      }
      return { ...section, kind: "text" as const, html: await renderMarkdown(section.body, MARKDOWN) };
    })
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${page.title} | ${siteConfig.name}`,
    url: absoluteUrl(page.path),
    mainEntity: personJsonLd(),
  };

  return (
    <div className="site-container cv">
      <JsonLd data={structuredData} />

      <header className="cv__head">
        <p className="hero__eyebrow rise d1">CV</p>
        <h1 className="cv__name rise d2">{cv.name}</h1>
        <p className="cv__headline rise d3">{cv.headline}</p>
        <p className="cv__contact rise d4">
          <span>{cv.location}</span>
          <span className="cv__contact-item">
            <Sep className="kicker__dot" />
            <a href={cv.email.href}>{cv.email.label}</a>
          </span>
          <span className="cv__contact-item">
            <Sep className="kicker__dot" />
            <a href={cv.linkedin.href} target="_blank" rel="noopener noreferrer">
              {cv.linkedin.label}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </span>
          <span className="cv__contact-item">
            <Sep className="kicker__dot" />
            <a href={cv.website.href}>{cv.website.label}</a>
          </span>
        </p>
        <div className="cv__actions rise d5">
          <PrintButton label="Save as PDF" />
        </div>
      </header>

      {sections.map((section) => {
        const id = sectionId(section.heading);
        return (
          <section key={id} className="cv-sec" aria-labelledby={id}>
            <SectionHead id={id}>{section.heading}</SectionHead>

            {section.kind === "experience" && (
              <ol className="cv-roles">
                {section.roles.map((role) => (
                  <li key={`${role.role}-${role.dates}`} className="cv-role">
                    <p className="cv-role__dates">{role.dates}</p>
                    <div className="cv-role__main">
                      <h3 className="cv-role__title">{role.role}</h3>
                      <p className="cv-role__org">{role.org}</p>
                      <div
                        className="article cv-text"
                        dangerouslySetInnerHTML={{ __html: role.html }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {section.kind === "skills" && (
              <dl className="cv-skills">
                {section.skills.map((group) => (
                  <div key={group.heading} className="cv-skills__row">
                    <dt>{group.heading}</dt>
                    <dd>{group.text}</dd>
                  </div>
                ))}
              </dl>
            )}

            {section.kind === "text" && (
              <div
                className="article cv-text"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
