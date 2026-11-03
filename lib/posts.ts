import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  tags?: string[];
  published?: boolean;
  slug?: string;
  [key: string]: unknown;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  content: string;
}

export type PostSummary = Omit<Post, "content">;

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function validateFrontmatter(
  data: Record<string, unknown>,
  filename: string
): asserts data is PostFrontmatter {
  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error(
      `Frontmatter error in "${filename}": missing or empty required field "title".`
    );
  }
  if (typeof data.date !== "string" || !DATE_REGEX.test(data.date.trim())) {
    throw new Error(
      `Frontmatter error in "${filename}": "date" must be a quoted string in YYYY-MM-DD format, e.g. date: "2026-11-02".`
    );
  }
  if (typeof data.description !== "string" || !data.description.trim()) {
    throw new Error(
      `Frontmatter error in "${filename}": missing or empty required field "description".`
    );
  }
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || !data.tags.every((t) => typeof t === "string")) {
      throw new Error(
        `Frontmatter error in "${filename}": "tags" must be an array of strings if provided.`
      );
    }
  }
}

/**
 * Reads all published posts from content/posts.
 * Posts are strictly discovered from filesystem filenames.
 * Unpublished posts (published !== true) are excluded.
 */
export function getAllPosts(): PostSummary[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(POSTS_DIR);
  const posts: PostSummary[] = [];

  for (const filename of entries) {
    if (!filename.endsWith(".md")) {
      continue;
    }

    const slug = path.basename(filename, ".md");
    if (!SLUG_REGEX.test(slug)) {
      throw new Error(
        `Invalid filename slug in "${filename}": slug "${slug}" does not match pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/.`
      );
    }
    const filePath = path.join(POSTS_DIR, filename);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(rawContent);

    validateFrontmatter(parsed.data, filename);

    // Fail if frontmatter slug is provided and conflicts with filename
    if (parsed.data.slug && parsed.data.slug !== slug) {
      throw new Error(
        `Frontmatter error in "${filename}": frontmatter slug "${parsed.data.slug}" does not match filename "${slug}".`
      );
    }

    // Only posts with explicit published: true are public
    if (parsed.data.published !== true) {
      continue;
    }

    posts.push({
      slug,
      title: parsed.data.title,
      date: parsed.data.date,
      description: parsed.data.description,
      tags: parsed.data.tags || [],
      readingTime: calculateReadingTime(parsed.content),
    });
  }

  // Sort descending by date
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Retrieves a published post by looking up the requested slug in the list
 * of known published posts. Never constructs arbitrary file paths from raw input.
 */
export function getPostBySlug(slug: string): Post | null {
  const publishedSummaries = getAllPosts();
  const summary = publishedSummaries.find((p) => p.slug === slug);
  if (!summary) {
    return null;
  }

  const filePath = path.join(POSTS_DIR, `${summary.slug}.md`);
  const rawContent = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(rawContent);

  return {
    ...summary,
    content: parsed.content,
  };
}

/**
 * Returns the most recent posts (e.g. for Home page feed).
 */
export function getRecentPosts(limit = 2): PostSummary[] {
  return getAllPosts().slice(0, limit);
}
