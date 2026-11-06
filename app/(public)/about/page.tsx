import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAbout } from "@/lib/about";
import { getRecentPosts } from "@/lib/posts";
import {
  getWritingEntries,
  isArticle,
  sortArticlesNewestFirst,
} from "@/lib/writing";
import { getLocalImageSize } from "@/lib/image-size";
import { formatDate } from "@/lib/format";
import { brandedImage, pageMetadata } from "@/lib/seo";
import { sectionPages, AUTHOR_PHOTO } from "@/lib/pages";
import { siteConfig } from "@/lib/site";
import { ExternalArrow } from "@/components/ExternalArrow";

const page = sectionPages.about;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  socialTitle: `${page.title} | ${siteConfig.name}`,
  description: page.description,
  path: page.path,
  image: brandedImage("about", page.title),
});

interface WorkItem {
  label: string;
  title: string;
  meta: string;
  href: string;
  external: boolean;
}

// Selected work, from real data only: the newest post, the published paper and
// the newest article. Anything missing is left out.
function selectedWork(): WorkItem[] {
  const items: WorkItem[] = [];

  const [latestPost] = getRecentPosts(1);
  if (latestPost) {
    items.push({
      label: "Latest post",
      title: latestPost.title,
      meta: formatDate(latestPost.date),
      href: `/blog/${latestPost.slug}`,
      external: false,
    });
  }

  const entries = getWritingEntries();
  const paper = entries.find(
    (entry) => !isArticle(entry) && entry.status === "published" && entry.url
  );
  if (paper?.url) {
    items.push({
      label: "Published paper",
      title: paper.title,
      meta: paper.venue,
      href: paper.url,
      external: true,
    });
  }

  const [article] = sortArticlesNewestFirst(entries.filter(isArticle));
  if (article?.url) {
    items.push({
      label: "Latest article",
      title: article.title,
      meta: article.date
        ? `${article.venue}, ${formatDate(article.date)}`
        : article.venue,
      href: article.url,
      external: true,
    });
  }

  return items;
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

export default function AboutPage() {
  const about = getAbout();
  const photo = getLocalImageSize(AUTHOR_PHOTO);
  const work = selectedWork();
  const { linkedin, email, portfolio } = siteConfig.links;

  return (
    <div className="site-container about-page">
      <section className={photo ? "about-hero" : "about-hero about-hero--text"}>
        {photo && (
          <div className="about-hero__photo">
            <Image
              src={AUTHOR_PHOTO}
              alt="Portrait of Chinomso Okere"
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 900px) 340px, 220px"
              preload
              fetchPriority="high"
            />
          </div>
        )}
        <div>
          <h1 className="about-hero__label">About</h1>
          {about.intro && <p className="about-hero__intro">{about.intro}</p>}
        </div>
      </section>

      {about.atAGlance && (
        <section className="about-sec" aria-labelledby="glance-heading">
          <SectionHead id="glance-heading">At a glance</SectionHead>
          <ul className="facts">
            {about.atAGlance.map((lines) => (
              <li key={lines.join(" ")}>
                {lines.map((line) => (
                  <span key={line} className="facts__line">
                    {line}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {about.thinkingQuote && (
        <section className="about-sec" aria-labelledby="thinking-heading">
          <SectionHead id="thinking-heading">How I think about AI</SectionHead>
          <div className="about-measure">
            {about.thinkingLead && <p className="about-text">{about.thinkingLead}</p>}
            <blockquote className="pull">
              <p>{about.thinkingQuote}</p>
            </blockquote>
          </div>
        </section>
      )}

      {about.writeAbout && (
        <section className="about-sec" aria-labelledby="topics-heading">
          <SectionHead id="topics-heading">What I write about</SectionHead>
          <ol className="idx">
            {about.writeAbout.map((topic, i) => (
              <li key={topic}>
                <span className="idx__n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="idx__t">{topic}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {work.length > 0 && (
        <section className="about-sec" aria-labelledby="work-heading">
          <SectionHead id="work-heading">Selected work</SectionHead>
          <ul className="work-cards">
            {work.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a
                    className="card work-card"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WorkCardBody item={item} />
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                ) : (
                  <Link className="card work-card" href={item.href}>
                    <WorkCardBody item={item} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="about-more">
            <Link href="/writing" className="text-link">
              All writing →
            </Link>
          </p>
        </section>
      )}

      {about.audience && (
        <section className="about-sec" aria-labelledby="audience-heading">
          <SectionHead id="audience-heading">Who it&apos;s for</SectionHead>
          <p className="about-text about-measure">{about.audience}</p>
        </section>
      )}

      {about.workWithMe && (
        <section className="about-sec" aria-labelledby="contact-heading">
          <SectionHead id="contact-heading">Work with me</SectionHead>
          <p className="about-text about-measure">{about.workWithMe}</p>
          <div className="about-cta">
            {linkedin && (
              <a className="btn" href={linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
                <span className="btn__arrow" aria-hidden="true">
                  ↗
                </span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
            {email && (
              <a className="btn btn--ghost" href={email}>
                Email
              </a>
            )}
            {portfolio && (
              <a
                className="btn btn--ghost"
                href={portfolio}
                target="_blank"
                rel="noopener noreferrer"
              >
                View my portfolio
                <span className="btn__arrow" aria-hidden="true">
                  ↗
                </span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function WorkCardBody({ item }: { item: WorkItem }) {
  return (
    <>
      <span className="work-card__label">{item.label}</span>
      <span className="work-card__title">
        {item.title}
        {item.external && <ExternalArrow />}
      </span>
      <span className="work-card__meta">{item.meta}</span>
    </>
  );
}
