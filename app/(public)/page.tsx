import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { getRecentPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

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

export default function HomePage() {
  const recentPosts = getRecentPosts(2);

  return (
    <div className="site-container py-12 md:py-16">
      <div className="article-col">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(30px,6vw,46px)] font-medium leading-[1.1] tracking-[-0.015em] mb-6 text-[var(--fg)] text-balance">
          {siteConfig.tagline}
        </h1>
        <p className="font-[family-name:var(--font-display)] text-[20px] leading-[1.55] text-[var(--fg)] my-4">
          I&apos;m Chinomso Okere MBCS, a business analyst and applied AI
          researcher based in Scotland. This is where I write at length about
          what actually works in AI, and what is only a good demo: evaluating
          multi-agent systems, building voice agents, and getting AI into real
          organisations. Expect evidence over hype, including the limitations.
        </p>

        {recentPosts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[var(--border)]">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-[family-name:var(--font-ui)] text-[12px] font-semibold tracking-[0.11em] uppercase text-[var(--muted)]">
                Recent Writing
              </h2>
              <Link
                href="/blog"
                className="font-[family-name:var(--font-ui)] text-[12px] uppercase tracking-[0.08em] font-medium text-[var(--muted)] hover:text-[var(--accent-ink)] transition-colors"
              >
                All posts →
              </Link>
            </div>
            <div className="space-y-8">
              {recentPosts.map((post) => (
                <article key={post.slug} className="border-b border-[var(--border)] pb-8 last:border-b-0">
                  <PostCard post={post} headingLevel="h3" />
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
