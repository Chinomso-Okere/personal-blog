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
    <div className="site-container py-12 md:py-16">
      <div className="article-col">
        <header className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,42px)] font-medium leading-[1.15] tracking-[-0.015em] mb-3 text-[var(--fg)]">
            Writing
          </h1>
          <p className="font-[family-name:var(--font-ui)] text-[15px] text-[var(--muted)] leading-relaxed">
            Research papers I have co-authored.
          </p>
        </header>

        <div className="space-y-8">
          {entries.map((entry, idx) => {
            const capitalizedType =
              entry.type.charAt(0).toUpperCase() + entry.type.slice(1);

            return (
              <article
                key={idx}
                className="border-b border-[var(--border)] pb-8 last:border-b-0"
              >
                <div className="ey">{capitalizedType}</div>
                <h2 className="font-[family-name:var(--font-display)] text-[20px] md:text-[22px] font-medium leading-[1.3] text-[var(--fg)] mt-1 mb-2">
                  {entry.title}
                </h2>
                <div className="card-meta mb-3">
                  <span>{entry.venue}</span>
                  {entry.status === "published" ? (
                    !entry.venue.includes(String(entry.year)) && (
                      <>
                        <span className="dot" aria-hidden="true" />
                        <span>{entry.year}</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="dot" aria-hidden="true" />
                      <span>Accepted · proceedings not yet published</span>
                    </>
                  )}
                </div>
                <p className="font-[family-name:var(--font-ui)] text-[14px] text-[var(--muted)] leading-[1.6] mb-4">
                  {entry.note}
                </p>
                {entry.url ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--fg)] hover:text-[var(--accent-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                  >
                    Read the paper
                    <ExternalArrow />
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                ) : (
                  <span className="font-[family-name:var(--font-ui)] text-[14px] text-[var(--muted)]">
                    Link coming soon
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

