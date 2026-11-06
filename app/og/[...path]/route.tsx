import { getAllPosts } from "@/lib/posts";
import { sectionPages, HOME_EYEBROW, type SectionPage } from "@/lib/pages";
import { siteConfig } from "@/lib/site";
import { renderCard, type CardContent } from "@/lib/og";

// Branded social cards, rendered once at build time:
//   /og/home.png, /og/blog.png, /og/writing.png, /og/about.png
//   /og/post/<slug>.png  (only for posts without a cover)
export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { path: string[] };

export function generateStaticParams(): Params[] {
  const posts = getAllPosts().filter((post) => !post.coverImage);
  return [
    { path: ["home.png"] },
    ...Object.keys(sectionPages).map((key) => ({ path: [`${key}.png`] })),
    ...posts.map((post) => ({ path: ["post", `${post.slug}.png`] })),
  ];
}

function cardFor(segments: string[]): CardContent | null {
  if (segments.length === 1 && segments[0] === "home.png") {
    const at = siteConfig.tagline.indexOf(",");
    return {
      label: HOME_EYEBROW,
      title: at === -1 ? siteConfig.tagline : siteConfig.tagline.slice(0, at + 1),
      titleAccent: at === -1 ? undefined : siteConfig.tagline.slice(at + 1).trim(),
    };
  }

  if (segments.length === 1) {
    const key = segments[0].replace(/\.png$/, "");
    if (key in sectionPages) {
      const page = sectionPages[key as SectionPage];
      return { title: page.title, description: page.description };
    }
  }

  if (segments.length === 2 && segments[0] === "post") {
    const slug = segments[1].replace(/\.png$/, "");
    const post = getAllPosts().find((p) => p.slug === slug && !p.coverImage);
    if (post) return { label: post.tags?.[0] ?? "Blog", title: post.title };
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { path } = await params;
  const card = cardFor(path);
  if (!card) return new Response("Not found", { status: 404 });
  return renderCard(card);
}
