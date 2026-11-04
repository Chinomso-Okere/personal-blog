import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { PostCard } from "@/components/PostCard";
import { siteConfig } from "@/lib/site";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const canonical = post.originalUrl || `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      siteName: siteConfig.name,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const html = await renderMarkdown(post.content);
  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null;

  // More from the blog: up to 2 other published posts
  const allPosts = getAllPosts();
  const morePosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="site-container">
      <article className="article">
        {primaryTag && <div className="eyebrow">{primaryTag}</div>}
        <h1>{post.title}</h1>
        <div className="meta">
          <span>{formatDate(post.date)}</span>
          <span className="dot" aria-hidden="true"></span>
          <span>{post.readingTime}</span>
        </div>
        <div className="rule" aria-hidden="true"></div>

        {post.coverImage && (
          <figure className="my-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.coverImageAlt || ""}
              className="w-full h-auto rounded-[10px] border border-[var(--border)] my-0"
            />
          </figure>
        )}

        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      {morePosts.length > 0 && (
        <section className="more">
          <h2>More from the blog</h2>
          <div className="cards">
            {morePosts.map((p) => (
              <PostCard key={p.slug} post={p} headingLevel="h3" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

