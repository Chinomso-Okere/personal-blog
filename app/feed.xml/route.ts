import { getAllPosts } from "@/lib/posts";
import { buildRssFeed } from "@/lib/feed";
import { siteConfig } from "@/lib/site";

// Built once at deploy time, like the rest of the site.
export const dynamic = "force-static";

export function GET() {
  const xml = buildRssFeed(getAllPosts(), {
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
