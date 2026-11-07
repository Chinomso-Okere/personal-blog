import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";

// Published posts and projects only (both loaders exclude drafts).
// lastModified is only set where there is a real date: each post's own date,
// and the newest post's date for home and /blog. /writing, /about, /portfolio
// and the case studies have no reliable modification date ("2026" is when the work
// happened, not when the page changed), so none is given rather than a
// misleading build time.
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
    { url: `${siteConfig.url}/portfolio` },
    ...posts.map((post) => ({
      url: `${siteConfig.url}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
    ...getAllProjects().map((project) => ({
      url: `${siteConfig.url}/portfolio/${project.slug}`,
    })),
  ];
}
