import { ALLOWED_TAGS } from "./tags.ts";

export interface PostInputFields {
  title: string;
  slug: string;
  date: string;
  description: string;
  tags: string[];
  coverImage?: string;
  coverImageAlt?: string;
  originalUrl?: string;
  body: string;
  published: boolean;
}

export type PostValidationResult =
  | { success: true }
  | { success: false; error: string };

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_TAGS_SET = new Set<string>(ALLOWED_TAGS);

/**
 * Verifies that a string matches YYYY-MM-DD and represents a real calendar date.
 * Builds Date.UTC(y, m-1, d) and asserts year, month, and day round-trip.
 * Rejects impossible dates like 2026-02-31, 2026-04-31, 2027-02-29; accepts 2028-02-29.
 */
export function isValidCalendarDate(str: string): boolean {
  if (typeof str !== "string") return false;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);

  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() === m - 1 &&
    utc.getUTCDate() === d
  );
}

/**
 * Auto-generates a clean URL slug from a title:
 * - strips accents and non-ASCII diacritics
 * - converts to lowercase
 * - replaces non-alphanumeric characters with hyphens
 * - collapses consecutive hyphens
 * - trims leading and trailing hyphens
 * - caps at 80 characters
 */
export function generateSlug(title: string): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length <= 80) {
    return normalized;
  }

  // Cap at 80 chars and avoid trailing hyphen
  return normalized.slice(0, 80).replace(/-+$/, "");
}

/**
 * Normalises a date from parsed frontmatter into a YYYY-MM-DD string.
 * Handles YAML Date objects (from unquoted dates) and string formats.
 */
export function normalizeParsedDate(rawDate: unknown): string {
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.toISOString().slice(0, 10);
  }

  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    if (isValidCalendarDate(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getUTCFullYear();
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      const formatted = `${y}-${m}-${d}`;
      if (isValidCalendarDate(formatted)) {
        return formatted;
      }
    }
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates post input fields against required limits and rules:
 * - title: 1 to 120 chars
 * - slug: 1 to 80 chars, pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/
 * - date: YYYY-MM-DD, valid calendar date
 * - description: 1 to 300 chars
 * - tags: max 3, must be members of ALLOWED_TAGS, no duplicates
 * - coverImage: optional, https:// only
 * - coverImageAlt: required and non-empty if coverImage is given
 * - originalUrl: optional, https:// only
 * - body: required, max 200,000 chars, refuses [CHECK: with line number
 */
export function validatePostInput(fields: PostInputFields): PostValidationResult {
  if (!fields || typeof fields !== "object") {
    return { success: false, error: "Post fields must be an object." };
  }

  // Title
  if (typeof fields.title !== "string" || !fields.title.trim()) {
    return { success: false, error: "Title is required." };
  }
  const title = fields.title.trim();
  if (title.length > 120) {
    return {
      success: false,
      error: `Title exceeds maximum length of 120 characters (${title.length} chars).`,
    };
  }

  // Slug
  if (typeof fields.slug !== "string" || !fields.slug.trim()) {
    return { success: false, error: "Slug is required." };
  }
  const slug = fields.slug.trim();
  if (slug.length > 80) {
    return {
      success: false,
      error: `Slug exceeds maximum length of 80 characters (${slug.length} chars).`,
    };
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      success: false,
      error: 'Slug must consist of lowercase alphanumeric words separated by single hyphens (e.g. "my-post-title").',
    };
  }

  // Date
  if (typeof fields.date !== "string" || !isValidCalendarDate(fields.date)) {
    return { success: false, error: "Date must be a valid calendar date." };
  }

  // Description
  if (typeof fields.description !== "string" || !fields.description.trim()) {
    return { success: false, error: "Description is required." };
  }
  const description = fields.description.trim();
  if (description.length > 300) {
    return {
      success: false,
      error: `Description exceeds hard limit of 300 characters (${description.length} chars).`,
    };
  }

  // Tags
  if (!Array.isArray(fields.tags)) {
    return { success: false, error: "Tags must be an array." };
  }
  if (fields.tags.length > 3) {
    return {
      success: false,
      error: `A maximum of 3 tags is allowed (received ${fields.tags.length}).`,
    };
  }
  const seenTags = new Set<string>();
  for (const tag of fields.tags) {
    if (typeof tag !== "string" || !ALLOWED_TAGS_SET.has(tag)) {
      return {
        success: false,
        error: `Tag "${tag}" is not in the allowed tag list.`,
      };
    }
    if (seenTags.has(tag)) {
      return {
        success: false,
        error: `Duplicate tag "${tag}" is not allowed.`,
      };
    }
    seenTags.add(tag);
  }

  // Cover image & alt text
  if (fields.coverImage !== undefined && fields.coverImage !== null && fields.coverImage !== "") {
    if (typeof fields.coverImage !== "string" || !fields.coverImage.startsWith("https://")) {
      return {
        success: false,
        error: 'Cover image URL must start with "https://".',
      };
    }
    if (
      typeof fields.coverImageAlt !== "string" ||
      !fields.coverImageAlt.trim()
    ) {
      return {
        success: false,
        error: "Cover image alt text is required when a cover image URL is provided.",
      };
    }
  }

  // Original URL
  if (fields.originalUrl !== undefined && fields.originalUrl !== null && fields.originalUrl !== "") {
    if (typeof fields.originalUrl !== "string" || !fields.originalUrl.startsWith("https://")) {
      return {
        success: false,
        error: 'Originally published at URL must start with "https://".',
      };
    }
  }

  // Body
  if (typeof fields.body !== "string" || !fields.body.trim()) {
    return { success: false, error: "Body is required." };
  }
  if (fields.body.length > 200_000) {
    return {
      success: false,
      error: `Body exceeds maximum allowed length of 200,000 characters (${fields.body.length} chars).`,
    };
  }

  // Check for unresolved [CHECK: markers
  const lines = fields.body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("[CHECK:")) {
      return {
        success: false,
        error: `Unresolved marker [CHECK: on line ${i + 1}. Resolve all markers before saving or publishing.`,
      };
    }
  }

  return { success: true };
}

/**
 * Builds the exact markdown file content with front matter:
 * - Every string serialized via JSON.stringify (safely escaping colons, double quotes, newlines)
 * - Date ALWAYS quoted
 * - Tags as JSON array
 * - Published true/false
 * - Optional fields included only when given
 * - Followed by closing ---, a blank line, and the body
 */
export function buildPostFile(fields: PostInputFields): string {
  const lines: string[] = ["---"];

  lines.push(`title: ${JSON.stringify(fields.title.trim())}`);
  lines.push(`slug: ${JSON.stringify(fields.slug.trim())}`);
  lines.push(`date: "${fields.date.trim()}"`);
  lines.push(`description: ${JSON.stringify(fields.description.trim())}`);
  lines.push(`tags: ${JSON.stringify(fields.tags)}`);
  lines.push(`published: ${Boolean(fields.published)}`);

  if (fields.coverImage && fields.coverImage.trim()) {
    lines.push(`coverImage: ${JSON.stringify(fields.coverImage.trim())}`);
  }
  if (fields.coverImageAlt && fields.coverImageAlt.trim()) {
    lines.push(`coverImageAlt: ${JSON.stringify(fields.coverImageAlt.trim())}`);
  }
  if (fields.originalUrl && fields.originalUrl.trim()) {
    lines.push(`originalUrl: ${JSON.stringify(fields.originalUrl.trim())}`);
  }

  lines.push("---");
  lines.push("");
  lines.push(fields.body.trim());
  lines.push("");

  return lines.join("\n");
}
