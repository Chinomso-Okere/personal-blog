import type { PostSummary } from "./posts.ts";

export interface FeedSite {
  /** Absolute site URL without a trailing slash. */
  url: string;
  name: string;
  description: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Post dates are calendar days ("YYYY-MM-DD"); RSS wants RFC 822.
function rfc822(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toUTCString();
}

/**
 * RSS 2.0 for the given posts. Pass published posts only (getAllPosts already
 * excludes drafts). Pure: no file or network access, so it is tested directly.
 * lastBuildDate is the newest post's date, so the output only changes when the
 * content does.
 */
export function buildRssFeed(posts: PostSummary[], site: FeedSite): string {
  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const feedUrl = `${site.url}/feed.xml`;

  const items = sorted.map((post) => {
    const link = `${site.url}/blog/${post.slug}`;
    const categories = (post.tags ?? [])
      .map((tag) => `      <category>${escapeXml(tag)}</category>`)
      .join("\n");
    return [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${rfc822(post.date)}</pubDate>`,
      `      <description>${escapeXml(post.description)}</description>`,
      categories,
      "    </item>",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(site.name)}</title>`,
    `    <link>${escapeXml(site.url)}</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    "    <language>en-GB</language>",
    ...(sorted[0] ? [`    <lastBuildDate>${rfc822(sorted[0].date)}</lastBuildDate>`] : []),
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
