import { createHash } from "node:crypto";
import { siteConfig } from "./site.ts";
import { sectionPages, HOME_EYEBROW, type SectionPage } from "./pages.ts";
import { TYPE_LABELS, type ProjectType } from "./project-types.ts";

/**
 * Bump when the card layout, fonts or colours in lib/og.tsx change, so every
 * card gets a new URL and LinkedIn and others fetch it again instead of
 * serving their cached copy.
 */
export const OG_LAYOUT_VERSION = 1;

/** What a branded card shows; lib/og.tsx draws it. */
export interface CardContent {
  /** Small uppercase label above the title; omitted on section cards, where
   *  it would only repeat the name in the bottom row. */
  label?: string;
  title: string;
  /** Optional second part of the title, set in italic clay (home tagline). */
  titleAccent?: string;
  description?: string;
}

export function homeCard(): CardContent {
  const at = siteConfig.tagline.indexOf(",");
  return {
    label: HOME_EYEBROW,
    title: at === -1 ? siteConfig.tagline : siteConfig.tagline.slice(0, at + 1),
    titleAccent: at === -1 ? undefined : siteConfig.tagline.slice(at + 1).trim(),
  };
}

export function sectionCard(key: SectionPage): CardContent {
  const page = sectionPages[key];
  return { title: page.title, description: page.description };
}

export function postCard(post: { title: string; tags?: string[] }): CardContent {
  return { label: post.tags?.[0] ?? "Blog", title: post.title };
}

export function projectCard(project: { type: ProjectType; title: string }): CardContent {
  return { label: TYPE_LABELS[project.type], title: project.title };
}

/**
 * Short hash of everything that decides how a card looks: its content, the
 * name and domain in the bottom row, and OG_LAYOUT_VERSION. Used as ?v= on the
 * card URL, so the URL changes exactly when the image does.
 */
export function cardVersion(content: CardContent): string {
  const inputs = {
    layout: OG_LAYOUT_VERSION,
    name: siteConfig.name,
    host: new URL(siteConfig.url).host,
    label: content.label ?? null,
    title: content.title,
    titleAccent: content.titleAccent ?? null,
    description: content.description ?? null,
  };
  return createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 10);
}
