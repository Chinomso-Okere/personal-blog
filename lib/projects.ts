import fs from "fs";
import path from "path";
import { parseFrontmatter } from "./frontmatter.ts";
import { getAllPosts } from "./posts.ts";
import {
  PROJECT_TYPES,
  PROJECT_STATUSES,
  type ProjectType,
  type ProjectStatus,
} from "./project-types.ts";

export { PROJECT_TYPES, PROJECT_STATUSES, TYPE_LABELS } from "./project-types.ts";
export type { ProjectType, ProjectStatus } from "./project-types.ts";

export interface ProjectLinks {
  paper?: string;
  repo?: string;
  live?: string;
  /** https URL, or an internal "/blog/<slug>" path. */
  post?: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  summary: string;
  type: ProjectType;
  status: ProjectStatus;
  /** "YYYY" or "YYYY-MM". */
  date: string;
  role?: string;
  venue?: string;
  stack: string[];
  links: ProjectLinks;
  cover?: string;
  coverAlt?: string;
  featured: boolean;
  /** Position among entries in the same group; lower comes first. */
  order?: number;
}

export interface Project extends ProjectSummary {
  content: string;
}

export type ProjectValidationResult =
  | { success: true; project: ProjectSummary; published: boolean }
  | { success: false; field: string; error: string };

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}(?:-(0[1-9]|1[0-2]))?$/;
const INTERNAL_POST_REGEX = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

const ALLOWED_KEYS = new Set([
  "title",
  "slug",
  "summary",
  "type",
  "status",
  "date",
  "role",
  "venue",
  "stack",
  "links",
  "cover",
  "coverAlt",
  "featured",
  "order",
  "published",
]);
const LINK_KEYS = ["paper", "repo", "live", "post"] as const;

const REQUIRED_SECTIONS = ["Problem", "Approach", "Evidence"];
/** Heading of the limitations section; the case study renders it as a panel. */
export const LIMITATIONS_SECTION = "What it doesn't show";
const TYPES_NEEDING_LIMITATIONS = new Set<ProjectType>(["research", "proof-of-concept"]);

const MAX_TITLE = 120;
const MAX_SLUG = 80;
const MAX_SUMMARY = 200;
const MAX_LABEL = 120;
const MAX_STACK = 8;

function fail(field: string, error: string): ProjectValidationResult {
  return { success: false, field, error };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Body lines outside fenced code blocks, with inline code spans removed, so
 * code that mentions "## ..." or "[CHECK:" is not mistaken for the real thing.
 */
function proseLines(body: string): { number: number; text: string }[] {
  const lines: { number: number; text: string }[] = [];
  let fence: string | null = null;
  body.split("\n").forEach((line, i) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return;
    }
    if (fence !== null) return;
    lines.push({ number: i + 1, text: line.replace(/(`+)[^`]*?\1/g, "") });
  });
  return lines;
}

/** Normalised H2 headings of a markdown body, ignoring code. */
function h2Headings(body: string): string[] {
  const headings: string[] = [];
  for (const { text } of proseLines(body)) {
    const heading = text.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) headings.push(normaliseHeading(heading[1]));
  }
  return headings;
}

function normaliseHeading(text: string): string {
  return text.replace(/[‘’]/g, "'").trim().toLowerCase();
}

/**
 * Validates one project's front matter and body. Pure: `slug` is the
 * filename without ".md". Rules:
 * - only the documented keys (and only paper/repo/live/post inside links)
 * - title ≤ 120, slug ≤ 80 and equal to the filename, summary ≤ 200
 * - type and status from fixed lists; date "YYYY" or "YYYY-MM" (a string)
 * - role and venue optional, ≤ 120; stack optional, ≤ 8 unique strings
 * - links https only, except post, which may also be "/blog/<slug>"
 * - cover https or /images/, and coverAlt exactly when cover is set
 * - featured optional boolean; order optional integer ≥ 1; published boolean
 * - Problem, Approach and Evidence H2s always; "What it doesn't show" for
 *   research and proof-of-concept; no unresolved [CHECK: marker outside code
 */
export function validateProject(
  slug: string,
  data: Record<string, unknown>,
  body: string
): ProjectValidationResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("front matter", "front matter must be a YAML mapping.");
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) {
      return fail(key, `unknown field "${key}".`);
    }
  }

  // Title
  if (!isNonEmptyString(data.title)) {
    return fail("title", `"title" is required.`);
  }
  const title = data.title.trim();
  if (title.length > MAX_TITLE) {
    return fail("title", `"title" exceeds ${MAX_TITLE} characters (${title.length}).`);
  }

  // Slug
  if (!SLUG_REGEX.test(slug) || slug.length > MAX_SLUG) {
    return fail(
      "filename",
      `filename slug "${slug}" must be lowercase words separated by single hyphens, at most ${MAX_SLUG} characters.`
    );
  }
  if (!isNonEmptyString(data.slug)) {
    return fail("slug", `"slug" is required.`);
  }
  if (data.slug !== slug) {
    return fail("slug", `"slug" "${data.slug}" does not match the filename "${slug}".`);
  }

  // Summary
  if (!isNonEmptyString(data.summary)) {
    return fail("summary", `"summary" is required.`);
  }
  const summary = data.summary.trim();
  if (summary.length > MAX_SUMMARY) {
    return fail("summary", `"summary" exceeds ${MAX_SUMMARY} characters (${summary.length}).`);
  }

  // Type and status
  if (!PROJECT_TYPES.includes(data.type as ProjectType)) {
    return fail("type", `"type" must be one of: ${PROJECT_TYPES.join(", ")}.`);
  }
  const type = data.type as ProjectType;
  if (!PROJECT_STATUSES.includes(data.status as ProjectStatus)) {
    return fail("status", `"status" must be one of: ${PROJECT_STATUSES.join(", ")}.`);
  }

  // Date
  if (typeof data.date !== "string" || !DATE_REGEX.test(data.date)) {
    return fail(
      "date",
      `"date" must be a quoted string "YYYY" or "YYYY-MM" (e.g. date: "2026-11").`
    );
  }

  // Role and venue
  for (const field of ["role", "venue"] as const) {
    const value = data[field];
    if (value === undefined) continue;
    if (!isNonEmptyString(value)) {
      return fail(field, `"${field}" must be a non-empty string if provided.`);
    }
    if (value.trim().length > MAX_LABEL) {
      return fail(field, `"${field}" exceeds ${MAX_LABEL} characters.`);
    }
  }

  // Stack
  let stack: string[] = [];
  if (data.stack !== undefined) {
    if (!Array.isArray(data.stack) || !data.stack.every(isNonEmptyString)) {
      return fail("stack", `"stack" must be a list of non-empty strings.`);
    }
    stack = data.stack.map((item: string) => item.trim());
    if (stack.length > MAX_STACK) {
      return fail("stack", `"stack" has ${stack.length} items; the maximum is ${MAX_STACK}.`);
    }
    if (new Set(stack).size !== stack.length) {
      return fail("stack", `"stack" contains a duplicate item.`);
    }
  }

  // Links
  const links: ProjectLinks = {};
  if (data.links !== undefined) {
    if (!data.links || typeof data.links !== "object" || Array.isArray(data.links)) {
      return fail("links", `"links" must be a mapping (use links: {} for none).`);
    }
    const raw = data.links as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
      if (!(LINK_KEYS as readonly string[]).includes(key)) {
        return fail(`links.${key}`, `unknown link "${key}"; allowed: ${LINK_KEYS.join(", ")}.`);
      }
    }
    for (const key of LINK_KEYS) {
      const value = raw[key];
      if (value === undefined) continue;
      if (typeof value !== "string") {
        return fail(`links.${key}`, `"links.${key}" must be a string.`);
      }
      const isHttps = value.startsWith("https://") && value.length > "https://".length;
      if (key === "post") {
        if (!isHttps && !INTERNAL_POST_REGEX.test(value)) {
          return fail(
            "links.post",
            `"links.post" must start with "https://" or be an internal path "/blog/<slug>".`
          );
        }
      } else if (!isHttps) {
        return fail(`links.${key}`, `"links.${key}" must start with "https://".`);
      }
      links[key] = value;
    }
  }

  // Cover
  if (data.cover !== undefined) {
    if (
      typeof data.cover !== "string" ||
      (!data.cover.startsWith("https://") && !data.cover.startsWith("/images/"))
    ) {
      return fail("cover", `"cover" must start with "https://" or "/images/".`);
    }
    if (!isNonEmptyString(data.coverAlt)) {
      return fail("coverAlt", `"coverAlt" is required when "cover" is set.`);
    }
  } else if (data.coverAlt !== undefined) {
    return fail("coverAlt", `"coverAlt" is set but there is no "cover".`);
  }

  // Featured, order, published
  if (data.featured !== undefined && typeof data.featured !== "boolean") {
    return fail("featured", `"featured" must be true or false.`);
  }
  if (
    data.order !== undefined &&
    (typeof data.order !== "number" || !Number.isInteger(data.order) || data.order < 1)
  ) {
    return fail("order", `"order" must be a whole number of 1 or more.`);
  }
  if (typeof data.published !== "boolean") {
    return fail("published", `"published" is required and must be true or false.`);
  }

  // Body. A marker in code (e.g. prose explaining the rule) is not a marker.
  for (const line of proseLines(body)) {
    if (line.text.includes("[CHECK:")) {
      return fail(
        "body",
        `unresolved marker [CHECK: on body line ${line.number}. Resolve all markers first.`
      );
    }
  }
  const headings = h2Headings(body);
  const required = TYPES_NEEDING_LIMITATIONS.has(type)
    ? [...REQUIRED_SECTIONS, LIMITATIONS_SECTION]
    : REQUIRED_SECTIONS;
  for (const section of required) {
    if (!headings.includes(normaliseHeading(section))) {
      return fail("body", `missing the "## ${section}" section.`);
    }
  }

  return {
    success: true,
    published: data.published,
    project: {
      slug,
      title,
      summary,
      type,
      status: data.status as ProjectStatus,
      date: data.date,
      role: isNonEmptyString(data.role) ? data.role.trim() : undefined,
      venue: isNonEmptyString(data.venue) ? data.venue.trim() : undefined,
      stack,
      links,
      cover: data.cover as string | undefined,
      coverAlt: isNonEmptyString(data.coverAlt) ? data.coverAlt.trim() : undefined,
      featured: data.featured === true,
      order: data.order as number | undefined,
    },
  };
}

/**
 * Turns one project file into a Project, or null if it is not published.
 * Throws a message naming the file and field on any invalid input, so a
 * broken file fails the build. Pure (no file access).
 */
export function parseProjectFile(filename: string, rawContent: string): Project | null {
  const slug = path.basename(filename, ".md");
  let parsed;
  try {
    parsed = parseFrontmatter(rawContent);
  } catch (err) {
    throw new Error(
      `Project error in "${filename}": front matter could not be parsed (${(err as Error).message}).`
    );
  }
  const result = validateProject(slug, parsed.data, parsed.content);
  if (!result.success) {
    throw new Error(`Project error in "${filename}" (${result.field}): ${result.error}`);
  }
  if (!result.published) return null;
  return { ...result.project, content: parsed.content };
}

/**
 * Featured first; then entries with `order` (ascending) before those
 * without; then date, newest first ("2026-11" before "2026"); then title.
 */
export function compareProjects(a: ProjectSummary, b: ProjectSummary): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.order !== b.order) {
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    return a.order - b.order;
  }
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title.localeCompare(b.title, "en");
}

/**
 * Removes internal "/blog/<slug>" post links whose post is missing or not
 * published, warning once per dropped link. A dead link must never fail the
 * build: posts are unpublished from the admin, and a failing build would
 * silently stop deploys. https post links are left alone.
 */
export function dropDeadPostLinks<T extends ProjectSummary>(
  projects: T[],
  publishedPostSlugs: ReadonlySet<string>,
  warn: (message: string) => void = console.warn
): T[] {
  return projects.map((project) => {
    const match = project.links.post?.match(INTERNAL_POST_REGEX);
    if (!match || publishedPostSlugs.has(match[1])) return project;
    warn(
      `Project "${project.slug}": dropped links.post "${project.links.post}" because that post is missing or unpublished.`
    );
    const links = { ...project.links };
    delete links.post;
    return { ...project, links };
  });
}

/**
 * Reads all published projects from content/projects, sorted for display.
 * Always the fixed folder: a folder parameter makes Turbopack trace and ship
 * the whole project (see lib/posts.ts).
 */
export function getAllProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  const projects: Project[] = [];
  for (const filename of fs.readdirSync(PROJECTS_DIR)) {
    if (!filename.endsWith(".md")) {
      continue;
    }
    const rawContent = fs.readFileSync(path.join(PROJECTS_DIR, filename), "utf-8");
    const project = parseProjectFile(filename, rawContent);
    if (project) projects.push(project);
  }

  const postSlugs = new Set(getAllPosts().map((post) => post.slug));
  return dropDeadPostLinks(projects, postSlugs).sort(compareProjects);
}

/**
 * Looks a published project up by slug in the known list. Never builds a
 * file path from the requested slug.
 */
export function getProjectBySlug(slug: string): Project | null {
  return getAllProjects().find((project) => project.slug === slug) ?? null;
}

/**
 * The projects either side of `slug` in display order. No wrap-around: the
 * first has no previous and the last no next. Pure.
 */
export function adjacentProjects<T extends { slug: string }>(
  projects: T[],
  slug: string
): { prev: T | null; next: T | null } {
  const at = projects.findIndex((project) => project.slug === slug);
  if (at === -1) return { prev: null, next: null };
  return {
    prev: at > 0 ? projects[at - 1] : null,
    next: at < projects.length - 1 ? projects[at + 1] : null,
  };
}
