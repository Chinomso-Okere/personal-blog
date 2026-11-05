import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getAllPosts } from "@/lib/posts";

// Published posts only (getAllPosts excludes drafts). lastModified is only set
// where there is a real date: each post's own date, and the newest post's date
// for home and /blog. /writing and /about have no reliable date, so none is
// given rather than a misleading build time.
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const newest = posts.reduce<string | null>(
    (latest, post) => (!latest || post.date > latest ? post.date : latest),
    null
  );
  const newestDate = newest ? { lastModified: new Date(newest) } : {};

  return [
    { url: siteConfig.url, ...newestDate },
    { url: `${siteConfig.url}/blog`, ...newestDate },
    { url: `${siteConfig.url}/writing` },
    { url: `${siteConfig.url}/about` },
    ...posts.map((post) => ({
      url: `${siteConfig.url}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  ];
}
