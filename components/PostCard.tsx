import Link from "next/link";
import type { PostSummary } from "@/lib/posts";
import { formatDate } from "@/lib/format";

interface PostCardProps {
  post: PostSummary;
  headingLevel?: "h2" | "h3";
}

export function PostCard({ post, headingLevel = "h3" }: PostCardProps) {
  const HeadingTag = headingLevel;
  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null;

  return (
    <Link href={`/blog/${post.slug}`} className="card group">
      {primaryTag && <div className="ey">{primaryTag}</div>}
      <HeadingTag className="card-title">{post.title}</HeadingTag>
      <p>{post.description}</p>
      <div className="card-meta">
        <span>{formatDate(post.date)}</span>
        <span className="dot" aria-hidden="true"></span>
        <span>{post.readingTime}</span>
      </div>
    </Link>
  );
}

