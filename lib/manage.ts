import { parseFrontmatter } from "./frontmatter.ts";
import {
  validatePostInput,
  buildPostFile,
  normalizeParsedDate,
  type PostInputFields,
} from "./post-input.ts";
import {
  getFileRaw,
  listDirectory,
  putFile,
  deleteFile,
  type GitHubEnv,
  type GitHubDeps,
} from "./github.ts";
import { PublishValidationError } from "./publish.ts";

export class PostNotFoundError extends Error {
  constructor(message = "Post not found on GitHub.") {
    super(message);
    this.name = "PostNotFoundError";
  }
}

export interface PostListItem {
  slug: string;
  filename: string;
  title: string;
  date: string;
  published: boolean;
  sha: string;
  invalid?: boolean;
  loadError?: boolean;
  note?: string;
  hasValidSlug: boolean;
}

export interface ListPostsResult {
  posts: PostListItem[];
  totalCount: number;
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Concurrency helper with bounded parallelism.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Lists posts directly from GitHub Contents API.
 * Caps at 100 files, handles malformed frontmatter and invalid filenames gracefully.
 */
export async function listPosts(
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<ListPostsResult> {
  const items = await listDirectory("content/posts", env, deps);

  // Filter to .md files, strictly excluding .gitkeep and non-.md files
  const mdFiles = items.filter(
    (item) =>
      item.type === "file" &&
      item.name.endsWith(".md") &&
      item.name !== ".gitkeep"
  );

  const totalCount = mdFiles.length;
  const filesToProcess = mdFiles.slice(0, 100);

  // Process files with bounded concurrency of 5
  const posts = await mapConcurrent(filesToProcess, 5, async (item) => {
    const filename = item.name;
    const nameWithoutExt = filename.slice(0, -3);
    const hasValidSlug = SLUG_REGEX.test(nameWithoutExt);

    // If filename does not match slug regex, list as Invalid immediately
    if (!hasValidSlug) {
      return {
        slug: nameWithoutExt,
        filename,
        title: filename,
        date: "—",
        published: false,
        sha: item.sha,
        invalid: true,
        note: "Fix or remove this file on GitHub.",
        hasValidSlug: false,
      };
    }

    let file: import("./github.ts").RawFileInfo | null;
    try {
      file = await getFileRaw(item.path, env, deps);
    } catch {
      // getFileRaw threw a network or GitHub error: distinct loadError state
      return {
        slug: nameWithoutExt,
        filename,
        title: filename,
        date: "—",
        published: false,
        sha: item.sha,
        invalid: false,
        loadError: true,
        note: "Could not load. Refresh to retry.",
        hasValidSlug: true,
      };
    }

    if (!file) {
      return {
        slug: nameWithoutExt,
        filename,
        title: filename,
        date: "—",
        published: false,
        sha: item.sha,
        invalid: true,
        loadError: false,
        note: "Fix or remove this file on GitHub.",
        hasValidSlug: true,
      };
    }

    try {
      const parsed = parseFrontmatter(file.decoded);
      const data = parsed.data || {};
      const title =
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : nameWithoutExt;

      const date =
        typeof data.date === "string"
          ? data.date
          : data.date instanceof Date
          ? normalizeParsedDate(data.date)
          : "—";

      const published = data.published === true;

      return {
        slug: nameWithoutExt,
        filename,
        title,
        date,
        published,
        sha: file.sha,
        invalid: false,
        loadError: false,
        hasValidSlug: true,
      };
    } catch {
      // Front matter parse failure is marked Invalid without crashing the page
      return {
        slug: nameWithoutExt,
        filename,
        title: filename,
        date: "—",
        published: false,
        sha: item.sha,
        invalid: true,
        loadError: false,
        note: "Fix or remove this file on GitHub.",
        hasValidSlug: true,
      };
    }
  });

  // Sort newest first: valid dates descending, invalid / undated / error at the bottom
  posts.sort((a, b) => {
    const aBad = a.invalid || a.loadError;
    const bBad = b.invalid || b.loadError;
    if (aBad && !bBad) return 1;
    if (!aBad && bBad) return -1;
    return b.date.localeCompare(a.date);
  });

  return {
    posts,
    totalCount,
  };
}

/**
 * Retrieves a single post's full fields and SHA for editing.
 */
export async function getPost(
  slug: string,
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<{ fields: PostInputFields; sha: string }> {
  if (!SLUG_REGEX.test(slug)) {
    throw new PublishValidationError(
      'Slug must consist of lowercase alphanumeric words separated by single hyphens (e.g. "my-post-title").'
    );
  }

  const path = `content/posts/${slug}.md`;
  const file = await getFileRaw(path, env, deps);
  if (!file) {
    throw new PostNotFoundError("Post not found on GitHub.");
  }

  const parsed = parseFrontmatter(file.decoded);
  const data = parsed.data || {};

  const fields: PostInputFields = {
    title: typeof data.title === "string" ? data.title : "",
    slug: typeof data.slug === "string" ? data.slug : slug,
    date:
      typeof data.date === "string"
        ? data.date
        : data.date instanceof Date
        ? normalizeParsedDate(data.date)
        : "",
    description: typeof data.description === "string" ? data.description : "",
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : [],
    coverImage:
      typeof data.coverImage === "string" && data.coverImage.trim()
        ? data.coverImage.trim()
        : undefined,
    coverImageAlt:
      typeof data.coverImageAlt === "string" && data.coverImageAlt.trim()
        ? data.coverImageAlt.trim()
        : undefined,
    originalUrl:
      typeof data.originalUrl === "string" && data.originalUrl.trim()
        ? data.originalUrl.trim()
        : undefined,
    body: parsed.content || "",
    published: data.published === true,
  };

  return {
    fields,
    sha: file.sha,
  };
}

/**
 * Toggles a post's published status via GitHub Contents API.
 * Validates the existing front matter exactly as it is (does NOT filter tags).
 * Only the published flag may change.
 */
export async function togglePublishPost(
  params: { slug: string; published: boolean },
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<{ slug: string; published: boolean; commitSha: string }> {
  if (typeof params.published !== "boolean") {
    throw new PublishValidationError("Field 'published' must be a boolean.");
  }

  const slug = params.slug.trim();
  if (!SLUG_REGEX.test(slug)) {
    throw new PublishValidationError(
      'Slug must consist of lowercase alphanumeric words separated by single hyphens (e.g. "my-post-title").'
    );
  }

  const path = `content/posts/${slug}.md`;
  const file = await getFileRaw(path, env, deps);
  if (!file) {
    throw new PostNotFoundError("Post not found on GitHub.");
  }

  const parsed = parseFrontmatter(file.decoded);
  const data = parsed.data || {};

  // Build fields from parsed front matter WITHOUT dropping or filtering anything
  const fields: PostInputFields = {
    title: typeof data.title === "string" ? data.title : "",
    slug: typeof data.slug === "string" ? data.slug : slug,
    date:
      typeof data.date === "string"
        ? data.date
        : data.date instanceof Date
        ? normalizeParsedDate(data.date)
        : "",
    description: typeof data.description === "string" ? data.description : "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    coverImage:
      typeof data.coverImage === "string" ? data.coverImage : undefined,
    coverImageAlt:
      typeof data.coverImageAlt === "string" ? data.coverImageAlt : undefined,
    originalUrl:
      typeof data.originalUrl === "string" ? data.originalUrl : undefined,
    body: parsed.content || "",
    published: params.published,
  };

  // Validate post input - fails if any disallowed tag or [CHECK: marker exists
  const validation = validatePostInput(fields);
  if (!validation.success) {
    throw new PublishValidationError(validation.error);
  }

  // Rebuild file and commit with existing sha
  const updatedContent = buildPostFile(fields);
  const cleanTitle = fields.title.replace(/[\r\n]+/g, " ").trim().slice(0, 72);
  const message = params.published
    ? `Publish: ${cleanTitle}`
    : `Unpublish: ${cleanTitle}`;

  const putResult = await putFile(
    {
      path,
      content: updatedContent,
      message,
      sha: file.sha,
    },
    env,
    deps
  );

  return {
    slug,
    published: params.published,
    commitSha: putResult.commitSha,
  };
}

/**
 * Deletes a post via GitHub Contents API.
 * The server fetches the file's current SHA and title itself at delete time.
 */
export async function deletePost(
  params: { slug: string },
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<{ success: true; slug: string; commitSha: string }> {
  const slug = params.slug.trim();
  if (!SLUG_REGEX.test(slug)) {
    throw new PublishValidationError(
      'Slug must consist of lowercase alphanumeric words separated by single hyphens (e.g. "my-post-title").'
    );
  }

  const path = `content/posts/${slug}.md`;
  const file = await getFileRaw(path, env, deps);
  if (!file) {
    throw new PostNotFoundError("Post not found on GitHub.");
  }

  let title = slug;
  try {
    const parsed = parseFrontmatter(file.decoded);
    if (typeof parsed.data?.title === "string" && parsed.data.title.trim()) {
      title = parsed.data.title.trim();
    }
  } catch {
    // fallback to slug
  }

  const cleanTitle = title.replace(/[\r\n]+/g, " ").trim().slice(0, 72);
  const message = `Delete: ${cleanTitle}`;

  const deleteResult = await deleteFile(
    {
      path,
      sha: file.sha,
      message,
    },
    env,
    deps
  );

  return {
    success: true,
    slug,
    commitSha: deleteResult.commitSha,
  };
}
