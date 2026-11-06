import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { cardVersion, type CardContent } from "@/lib/og-cards";

export interface SocialImage {
  /** Site path or absolute URL. */
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface PageMetadataInput {
  title?: string;
  /** og:title / twitter:title when it should differ from the page title. */
  socialTitle?: string;
  description: string;
  /** Site path such as "/blog", or an absolute URL (a post's originalUrl). */
  path: string;
  /** A post's cover, or the branded card from brandedImage(). */
  image: SocialImage;
  article?: { publishedTime: string };
}

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** RSS discovery link; part of every page's alternates. */
export const FEED_ALTERNATE = {
  "application/rss+xml": [{ url: "/feed.xml", title: siteConfig.name }],
};

/** Absolute URL on this site for a path; absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

/**
 * The branded 1200x630 card served by app/og/[...path]/route.tsx, for pages
 * without a cover image. `key` is "home", "blog", "writing", "about" or
 * "post/<slug>"; `content` is what that card shows (lib/og-cards.ts). The
 * ?v= hash changes whenever the card does, so social sites cannot keep
 * serving a stale cached copy under the same URL.
 */
export function brandedImage(key: string, content: CardContent): SocialImage {
  const title = [content.title, content.titleAccent].filter(Boolean).join(" ");
  return {
    url: `/og/${key}.png?v=${cardVersion(content)}`,
    alt: `${siteConfig.name}: ${title}`,
    ...OG_SIZE,
  };
}

/**
 * Canonical, Open Graph and Twitter metadata for a public page, built the same
 * way everywhere so og:url always matches the canonical.
 */
export function pageMetadata({
  title,
  socialTitle,
  description,
  path,
  image,
  article,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const shareTitle = socialTitle ?? title ?? siteConfig.title;
  const ogImage = {
    url: absoluteUrl(image.url),
    alt: image.alt,
    ...(image.width && image.height
      ? { width: image.width, height: image.height }
      : {}),
  };

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url, types: FEED_ALTERNATE },
    openGraph: {
      title: shareTitle,
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
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [{ url: ogImage.url, alt: ogImage.alt }],
    },
  };
}
