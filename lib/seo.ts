import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

interface PageMetadataInput {
  title?: string;
  description: string;
  /** Site path such as "/blog", or an absolute URL (a post's originalUrl). */
  path: string;
  /** Site path or absolute URL of a preview image. */
  image?: string;
  imageAlt?: string;
  article?: { publishedTime: string };
}

/** Absolute URL on this site for a path; absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

/**
 * Canonical, Open Graph and Twitter metadata for a public page, built the same
 * way everywhere so og:url always matches the canonical.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  article,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = title ?? siteConfig.title;
  const images = image
    ? [{ url: absoluteUrl(image), ...(imageAlt ? { alt: imageAlt } : {}) }]
    : undefined;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: "en_GB",
      ...(article
        ? {
            type: "article",
            publishedTime: article.publishedTime,
            authors: [siteConfig.name],
          }
        : { type: "website" }),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}
