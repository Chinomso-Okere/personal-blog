import Link from "next/link";
import type { PostSummary } from "@/lib/posts";
import { formatDate } from "@/lib/format";

interface PostRowProps {
  post: PostSummary;
  headingLevel?: "h2" | "h3";
}

export function PostRow({ post, headingLevel = "h2" }: PostRowProps) {
  const HeadingTag = headingLevel;
  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null;

  return (
    <article className="post-row">
      <p className="post-row__meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {primaryTag && (
          <>
            <span className="kicker__dot" aria-hidden="true"></span>
            <span className="post-row__tag">{primaryTag}</span>
          </>
        )}
      </p>
      <HeadingTag className="post-row__title">
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </HeadingTag>
      {post.description && <p className="post-row__desc">{post.description}</p>}
      <p className="post-row__read">{post.readingTime}</p>
    </article>
  );
}
