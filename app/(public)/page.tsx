import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { getRecentPosts } from "@/lib/posts";
import { getWritingEntries } from "@/lib/writing";
import { getAboutStatement, getWriteAboutTopics } from "@/lib/about";
import { formatDate } from "@/lib/format";
import { PostRow } from "@/components/PostRow";
import { ExternalArrow } from "@/components/ExternalArrow";

export const metadata: Metadata = {
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
};

// "Applied AI, evidence first." -> ["Applied AI,", "evidence first."]
function splitTagline(tagline: string): [string, string | null] {
  const at = tagline.indexOf(",");
  if (at === -1) return [tagline, null];
  return [tagline.slice(0, at + 1), tagline.slice(at + 1).trim()];
}

export default function HomePage() {
  const [latest, ...morePosts] = getRecentPosts(3);
  const research = getWritingEntries();
  const topics = getWriteAboutTopics();
  const statement = getAboutStatement();
  const [line1, line2] = splitTagline(siteConfig.tagline);

  return (
    <div className="home">
      <section className="hero">
        <div className="site-container">
          <div className="hero__grid">
            <div>
              <p className="hero__eyebrow rise d1">
                Applied AI researcher · Business analyst · Scotland
              </p>
              <h1 className="hero__display">
                <span className="ln">
                  <span>{line1}</span>
                </span>
                {line2 && (
                  <>
                    {" "}
                    <span className="ln ln--2">
                      <span>
                        <em>{line2}</em>
                      </span>
                    </span>
                  </>
                )}
              </h1>
            </div>
            <div>
              <p className="hero__lede rise d3">
                I write about what actually works in AI, and what is only a good
                demo: evaluating agents, multi-agent systems, voice agents, and
                putting AI into real organisations.
              </p>
              <div className="hero__cta rise d4">
                <Link href="/blog" className="btn">
                  Read the writing
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link href="/writing" className="text-link">
                  Research papers →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {latest && (
        <section className="home-sec" aria-labelledby="latest-heading">
          <div className="site-container">
            <div className="sec-head">
              <h2 id="latest-heading" className="sec-head__label">
                Latest
              </h2>
              <span className="sec-head__rule" aria-hidden="true"></span>
              <Link href="/blog" className="sec-head__link">
                All posts →
              </Link>
            </div>

            <article
              className={latest.coverImage ? "feature" : "feature feature--text"}
            >
              {latest.coverImage && (
                // Mouse shortcut only; the title link is the keyboard and
                // screen-reader route, so this one stays out of the tab order.
                <Link
                  href={`/blog/${latest.slug}`}
                  className="feature__img"
                  tabIndex={-1}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latest.coverImage} alt={latest.coverImageAlt || ""} />
                </Link>
              )}
              <div>
                {latest.tags && latest.tags.length > 0 && (
                  <p className="kicker">
                    <span className="kicker__tag">{latest.tags[0]}</span>
                  </p>
                )}
                <h3 className="feature__title">
                  <Link href={`/blog/${latest.slug}`}>{latest.title}</Link>
                </h3>
                {latest.description && (
                  <p className="feature__desc">{latest.description}</p>
                )}
                <p className="feature__meta">
                  <time dateTime={latest.date}>{formatDate(latest.date)}</time>
                  <span className="kicker__dot" aria-hidden="true"></span>
                  <span>{latest.readingTime}</span>
                </p>
                <Link
                  href={`/blog/${latest.slug}`}
                  className="feature__read"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  Read the post <span className="feature__arrow">→</span>
                </Link>
              </div>
            </article>

            {morePosts.length > 0 && (
              <div className="home-more">
                {morePosts.map((post) => (
                  <PostRow key={post.slug} post={post} headingLevel="h3" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {research.length > 0 && (
        <section className="band" aria-labelledby="research-heading">
          <div className="site-container">
            <div className="band__head">
              <p className="band__eyebrow">Research</p>
              <h2 id="research-heading" className="band__title">
                Co-authored work on multi-agent evaluation and causal reasoning
              </h2>
            </div>
            <ul className="ledger">
              {research.map((entry) => (
                <li key={entry.title} className="ledger__row">
                  <span className="ledger__year">{entry.year}</span>
                  <div>
                    <h3 className="ledger__title">
                      {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">
                          {entry.title}
                          <ExternalArrow />
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>
                      ) : (
                        entry.title
                      )}
                    </h3>
                    <p className="ledger__venue">{entry.venue}</p>
                    <p className="ledger__note">{entry.note}</p>
                  </div>
                  <span
                    className={
                      entry.status === "published"
                        ? "chip chip--pub"
                        : "chip chip--acc"
                    }
                  >
                    {entry.status === "published"
                      ? "Published"
                      : "Accepted · awaiting publication"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="home-sec" aria-labelledby="topics-heading">
          <div className="site-container">
            <div className="sec-head">
              <h2 id="topics-heading" className="sec-head__label">
                What I write about
              </h2>
              <span className="sec-head__rule" aria-hidden="true"></span>
            </div>
            <ol className="idx">
              {topics.map((topic, i) => (
                <li key={topic}>
                  <span className="idx__n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="idx__t">{topic}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {statement && (
        <section className="home-sec" aria-labelledby="about-heading">
          <div className="site-container">
            <div className="about-strip">
              <div className="sec-head sec-head--flush">
                <h2 id="about-heading" className="sec-head__label">
                  About
                </h2>
                <span className="sec-head__rule" aria-hidden="true"></span>
              </div>
              <div>
                <p className="about-strip__big">
                  {statement.intro} {statement.body}
                  {statement.emphasis && <em>{statement.emphasis}</em>}
                </p>
                <Link href="/about" className="text-link">
                  More about me →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
