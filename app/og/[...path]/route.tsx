import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";
import { sectionPages, type SectionPage } from "@/lib/pages";
import { renderCard } from "@/lib/og";
import {
  homeCard,
  sectionCard,
  postCard,
  projectCard,
  type CardContent,
} from "@/lib/og-cards";

// Branded social cards, rendered once at build time:
//   /og/home.png, /og/blog.png, /og/writing.png, /og/about.png
//   /og/post/<slug>.png     (only for posts without a cover)
//   /og/project/<slug>.png  (only for projects without a cover)
// Pages link them with ?v=<hash> (lib/seo.ts brandedImage) to bust social
// caches; the query string plays no part in which card is served.
export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { path: string[] };

export function generateStaticParams(): Params[] {
  const posts = getAllPosts().filter((post) => !post.coverImage);
  const projects = getAllProjects().filter((project) => !project.cover);
  return [
    { path: ["home.png"] },
    ...Object.keys(sectionPages).map((key) => ({ path: [`${key}.png`] })),
    ...posts.map((post) => ({ path: ["post", `${post.slug}.png`] })),
    ...projects.map((project) => ({ path: ["project", `${project.slug}.png`] })),
  ];
}

function cardFor(segments: string[]): CardContent | null {
  if (segments.length === 1 && segments[0] === "home.png") {
    return homeCard();
  }

  if (segments.length === 1) {
    const key = segments[0].replace(/\.png$/, "");
    if (key in sectionPages) return sectionCard(key as SectionPage);
  }

  if (segments.length === 2 && segments[0] === "post") {
    const slug = segments[1].replace(/\.png$/, "");
    const post = getAllPosts().find((p) => p.slug === slug && !p.coverImage);
    if (post) return postCard(post);
  }

  if (segments.length === 2 && segments[0] === "project") {
    const slug = segments[1].replace(/\.png$/, "");
    const project = getAllProjects().find((p) => p.slug === slug && !p.cover);
    if (project) return projectCard(project);
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
