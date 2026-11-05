import type { Metadata } from "next";
import {
  getWritingEntries,
  isArticle,
  sortArticlesNewestFirst,
} from "@/lib/writing";
import { formatDate } from "@/lib/format";
import { ExternalArrow } from "@/components/ExternalArrow";
import { Venue } from "@/components/Venue";
import { Sep } from "@/components/Sep";
import { pageMetadata } from "@/lib/seo";

const DESCRIPTION =
  "Research papers co-authored by Chinomso Okere on multi-agent evaluation and causal reasoning, and articles written for publications.";

export const metadata: Metadata = pageMetadata({
  title: "Writing",
  description: DESCRIPTION,
  path: "/writing",
});

export default function WritingPage() {
  const entries = getWritingEntries();
  const papers = entries.filter((entry) => !isArticle(entry));
  const articles = sortArticlesNewestFirst(entries.filter(isArticle));

  return (
    <div className="site-container">
      <div className="page-col">
        <header className="page-head">
          <h1 className="page-title">Writing</h1>
          <p className="page-intro">
            Research papers I have co-authored, and articles I have written for
            publications.
          </p>
        </header>

        {papers.length > 0 && (
          <section id="papers" className="writing-sec" aria-labelledby="papers-heading">
            <div className="sec-head">
              <h2 id="papers-heading" className="sec-head__label">
                Research papers
              </h2>
              <span className="sec-head__rule" aria-hidden="true"></span>
            </div>

            <div className="post-list">
              {papers.map((entry, idx) => {
                const capitalizedType =
                  entry.type.charAt(0).toUpperCase() + entry.type.slice(1);

                return (
                  <article key={idx} className="post-row">
                    <p className="post-row__meta">
                      <span className="post-row__tag">{capitalizedType}</span>
                      <Sep />
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
                    </p>
                    <h3 className="post-row__title">{entry.title}</h3>
                    <p className="post-row__venue">
                      <Venue text={entry.venue} />
                      {!entry.venue.includes(String(entry.year)) && `, ${entry.year}`}
                    </p>
                    <p className="post-row__desc">{entry.note}</p>
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                      >
                        Read the paper
                        <ExternalArrow />
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    ) : (
                      <span className="post-row__read">Link coming soon</span>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {articles.length > 0 && (
          <section
            id="articles"
            className="writing-sec"
            aria-labelledby="articles-heading"
          >
            <div className="sec-head">
              <h2 id="articles-heading" className="sec-head__label">
                Articles
              </h2>
              <span className="sec-head__rule" aria-hidden="true"></span>
            </div>

            <div className="post-list">
              {articles.map((entry) => (
                <article key={entry.url ?? entry.title} className="post-row">
                  <p className="post-row__meta">
                    <span>{entry.venue}</span>
                    <Sep className="kicker__dot" />
                    {entry.date ? (
                      <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                    ) : (
                      <span>{entry.year}</span>
                    )}
                  </p>
                  <h3 className="post-row__title">
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
                  {entry.note && <p className="post-row__desc">{entry.note}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
