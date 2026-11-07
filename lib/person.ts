import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";
import { AUTHOR_PHOTO } from "@/lib/pages";
import { getLocalImageSize } from "@/lib/image-size";

/**
 * The site owner as a schema.org Person, without "@context" so it can be the
 * top-level node (home) or nested (the CV's ProfilePage mainEntity).
 */
export function personJsonLd(): Record<string, unknown> {
  return {
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    sameAs: [siteConfig.links.linkedin, siteConfig.links.github].filter(Boolean),
    ...(getLocalImageSize(AUTHOR_PHOTO) ? { image: absoluteUrl(AUTHOR_PHOTO) } : {}),
  };
}
