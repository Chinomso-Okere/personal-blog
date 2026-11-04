import { parseFrontmatter } from "./frontmatter.ts";

export interface GitHubEnv {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

export interface ExistingFileInfo {
  sha: string;
  published: boolean;
}

export interface PutFileParams {
  path: string;
  content: string;
  message: string;
  sha?: string;
}

export interface PutFileResult {
  commitSha: string;
  contentSha: string;
}

export interface GitHubDeps {
  customFetch?: typeof fetch;
}

export class GitHubApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Maps GitHub HTTP status codes and responses to safe, sanitized user-facing errors.
 * Guarantees that token strings and raw API payload secrets are never leaked.
 */
export function mapGitHubError(status: number, token?: string): GitHubApiError {
  let message: string;

  if (status === 401 || status === 403) {
    message = "GitHub rejected the token. Check its permissions and expiry.";
  } else if (status === 404) {
    message = "Repository not found. Check GITHUB_OWNER and GITHUB_REPO.";
  } else if (status === 409 || status === 422) {
    message = "The file changed on GitHub. Reload and try again.";
  } else if (status === 429) {
    message = "GitHub rate limit reached. Try again shortly.";
  } else {
    message = "GitHub API request failed.";
  }

  // Ensure token never appears in the error message
  if (token && token.length > 0) {
    message = message.split(token).join("[REDACTED]");
  }

  return new GitHubApiError(message);
}

/**
 * Retrieves file SHA and publication status from GitHub Contents API.
 * Returns null if the file does not exist (404).
 */
export async function getFileInfo(
  path: string,
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<ExistingFileInfo | null> {
  const fetchFn = deps?.customFetch || fetch;
  const branch = env.branch || "main";
  const url = `https://api.github.com/repos/${encodeURIComponent(
    env.owner
  )}/${encodeURIComponent(env.repo)}/contents/${path}?ref=${encodeURIComponent(
    branch
  )}`;

  const res = await fetchFn(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw mapGitHubError(res.status, env.token);
  }

  const data = (await res.json()) as {
    sha?: string;
    content?: string;
    encoding?: string;
  };

  if (!data || typeof data.sha !== "string") {
    throw new Error("Invalid GitHub response: missing file SHA.");
  }

  let published = false;
  if (typeof data.content === "string") {
    try {
      const decoded = Buffer.from(
        data.content.replace(/\r?\n/g, ""),
        "base64"
      ).toString("utf-8");
      const parsed = parseFrontmatter(decoded);
      published = parsed.data?.published === true;
    } catch {
      // Frontmatter parse failure is safely treated as unpublished
      published = false;
    }
  }

  return {
    sha: data.sha,
    published,
  };
}

/**
 * Commits or updates a file in the repo via GitHub Contents API.
 */
export async function putFile(
  params: PutFileParams,
  env: GitHubEnv,
  deps?: GitHubDeps
): Promise<PutFileResult> {
  const fetchFn = deps?.customFetch || fetch;
  const branch = env.branch || "main";
  const url = `https://api.github.com/repos/${encodeURIComponent(
    env.owner
  )}/${encodeURIComponent(env.repo)}/contents/${params.path}`;

  // Base64 encode UTF-8 content (handles diacritics, symbols and emojis properly)
  const base64Content = Buffer.from(params.content, "utf-8").toString("base64");

  const payload: Record<string, unknown> = {
    message: params.message,
    content: base64Content,
    branch,
  };

  if (params.sha) {
    payload.sha = params.sha;
  }

  const res = await fetchFn(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw mapGitHubError(res.status, env.token);
  }

  const data = (await res.json()) as {
    commit?: { sha?: string };
    content?: { sha?: string };
  };

  const commitSha = data?.commit?.sha;
  const contentSha = data?.content?.sha;

  if (!commitSha || !contentSha) {
    throw new Error("Invalid GitHub response: missing commit or content SHA.");
  }

  return {
    commitSha,
    contentSha,
  };
}
