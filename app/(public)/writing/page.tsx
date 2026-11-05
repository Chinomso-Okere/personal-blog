import type { Metadata } from "next";
import { getWritingEntries } from "@/lib/writing";
import { ExternalArrow } from "@/components/ExternalArrow";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Research papers co-authored by Chinomso Okere on multi-agent evaluation and causal reasoning.",
  alternates: {
    canonical: "/writing",
  },
  openGraph: {
    title: "Writing",
    description:
      "Research papers co-authored by Chinomso Okere on multi-agent evaluation and causal reasoning.",
    siteName: siteConfig.name,
  },
};

export default function WritingPage() {
  const entries = getWritingEntries();

  return (
    <div className="site-container">
      <div className="page-col">
        <header className="page-head">
          <h1 className="page-title">Writing</h1>
          <p className="page-intro">Research papers I have co-authored.</p>
        </header>

        <div className="post-list">
          {entries.map((entry, idx) => {
            const capitalizedType =
              entry.type.charAt(0).toUpperCase() + entry.type.slice(1);

            return (
              <article key={idx} className="post-row">
                <p className="post-row__meta">
                  <span className="post-row__tag">{capitalizedType}</span>
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
                <h2 className="post-row__title">{entry.title}</h2>
                <p className="post-row__venue">
                  {entry.venue}
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
      </div>
    </div>
  );
}

