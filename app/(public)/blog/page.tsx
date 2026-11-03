import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Long-form articles on evaluating AI agents, voice systems, and production engineering.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="site-container py-12 md:py-16">
      <div className="article-col">
        <header className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,42px)] font-medium leading-[1.15] tracking-[-0.015em] mb-3 text-[var(--fg)]">
            Blog
          </h1>
          <p className="font-[family-name:var(--font-ui)] text-[15px] text-[var(--muted)] leading-relaxed">
            Long-form technical articles, evaluations, and architecture notes.
          </p>
        </header>

        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-[var(--border)] pb-8 last:border-b-0">
              <PostCard post={post} headingLevel="h2" />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

