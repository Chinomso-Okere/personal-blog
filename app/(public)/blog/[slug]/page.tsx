import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { renderMarkdownWithHeadings, type Heading } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { PostCard } from "@/components/PostCard";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TocTracker } from "@/components/TocTracker";
import { CodeCopy } from "@/components/CodeCopy";
import { CoverImage } from "@/components/CoverImage";
import { Sep } from "@/components/Sep";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, brandedImage, pageMetadata } from "@/lib/seo";
import { getLocalImageSize } from "@/lib/image-size";
import { AUTHOR_PHOTO } from "@/lib/pages";

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

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: postCanonical(post),
    // A cover always wins; posts without one get the branded card.
    image: post.coverImage
      ? {
          url: post.coverImage,
          alt: post.coverImageAlt || post.title,
          ...(getLocalImageSize(post.coverImage) ?? {}),
        }
      : brandedImage(`post/${post.slug}`, post.title),
    article: { publishedTime: post.date },
  });
}

// A post republished from elsewhere keeps the original as its canonical.
function postCanonical(post: { slug: string; originalUrl?: string }): string {
  return post.originalUrl || `/blog/${post.slug}`;
}

const AUTHOR_INITIALS = siteConfig.name
  .split(" ")
  .map((part) => part[0])
  .join("")
  .toUpperCase();

const hasAuthorPhoto = getLocalImageSize(AUTHOR_PHOTO) !== null;

const authorBio = siteConfig.bio.charAt(0).toUpperCase() + siteConfig.bio.slice(1);

// Display only: "part 1" never breaks across lines. The stored title and the
// metadata keep the plain space.
function keepPartNumberTogether(title: string): string {
  return title.replace(/\b(part)\s+(\d+)/gi, "$1 $2");
}

function TocLinks({ headings }: { headings: Heading[] }) {
  return (
    <ul className="toc__list">
      {headings.map((h) => (
        <li key={h.id}>
          <a href={`#${h.id}`}>{h.text}</a>
        </li>
      ))}
    </ul>
  );
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { html, headings } = await renderMarkdownWithHeadings(post.content);
  const [primaryTag, ...otherTags] = post.tags ?? [];
  const showToc = headings.length >= 2;

  // Keep reading: up to 2 other published posts; nothing when there are none.
  const allPosts = getAllPosts();
  const morePosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    ...(post.description ? { description: post.description } : {}),
    datePublished: post.date,
    author: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    url: absoluteUrl(postCanonical(post)),
    ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
  };

  return (
    <article className="post">
      <JsonLd data={structuredData} />
      <div className="post__wrap">
        <div className="post__grid">
          <header className="post__head">
            {primaryTag && (
              <p className="kicker rise d1">
                <span className="kicker__tag">{primaryTag}</span>
                {otherTags.map((tag) => (
                  <span key={tag} className="kicker__more">
                    <Sep className="kicker__dot" />
                    {tag}
                  </span>
                ))}
              </p>
            )}
            <h1 className="post__title rise d2">
              {keepPartNumberTogether(post.title)}
            </h1>
            {post.description && (
              <p className="post__dek rise d3">{post.description}</p>
            )}
            <div className="byline rise d4">
              <span className="avatar" aria-hidden="true">
                {AUTHOR_INITIALS}
              </span>
              <div className="byline__text">
                <strong>{siteConfig.name}</strong>
                <Sep className="byline__sep byline__sep--name" />
                <span className="byline__meta">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <Sep className="byline__sep" />
                  <span>{post.readingTime}</span>
                </span>
              </div>
            </div>
          </header>
        </div>
      </div>

      {post.coverImage && (
        <div className="post__cover rise d5">
          <a
            className="fig__open"
            href={post.coverImage}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="post__cover-in">
              <CoverImage
                src={post.coverImage}
                alt={post.coverImageAlt || ""}
                // Deliberately ~2x the 856px display width on desktop: diagram
                // text only stays crisp when the browser scales down once.
                sizes="(min-width: 1100px) 1712px, 100vw"
              />
            </div>
            <span className="sr-only"> (opens full size in new tab)</span>
            <span className="fig__hint" aria-hidden="true">
              View full size ↗
            </span>
          </a>
        </div>
      )}

      <div className="post__wrap post__body">
        <div className="post__grid">
          {showToc && (
            <nav className="toc toc--side" aria-label="On this page" data-toc>
              <p className="toc__label">On this page</p>
              <TocLinks headings={headings} />
            </nav>
          )}

          <div className="post__main">
            {showToc && (
              <details className="toc toc--inline" data-toc>
                <summary className="toc__label">On this page</summary>
                <nav aria-label="On this page">
                  <TocLinks headings={headings} />
                </nav>
              </details>
            )}

            <div className="article" data-post-article>
              <div dangerouslySetInnerHTML={{ __html: html }} />
              <p className="endmark" aria-hidden="true">
                • • •
              </p>
            </div>

            <aside className="author" aria-label="About the author">
              {hasAuthorPhoto ? (
                // Decorative: the name is right beside it.
                <Image
                  className="avatar avatar--lg avatar--photo"
                  src={AUTHOR_PHOTO}
                  alt=""
                  width={56}
                  height={56}
                />
              ) : (
                <span className="avatar avatar--lg" aria-hidden="true">
                  {AUTHOR_INITIALS}
                </span>
              )}
              <div>
                <h2 className="author__name">{siteConfig.name}</h2>
                <p className="author__bio">{authorBio}</p>
                <Link href="/about" className="author__link">
                  More about me →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {morePosts.length > 0 && (
        <section className="site-container keep" aria-labelledby="keep-reading">
          <div className="sec-head">
            <h2 id="keep-reading" className="sec-head__label">
              Keep reading
            </h2>
            <span className="sec-head__rule" aria-hidden="true"></span>
          </div>
          <div className="keep__cards">
            {morePosts.map((p) => (
              <PostCard key={p.slug} post={p} headingLevel="h3" />
            ))}
          </div>
        </section>
      )}

      <ReadingProgress />
      {showToc && <TocTracker />}
      <CodeCopy />
    </article>
  );
}
