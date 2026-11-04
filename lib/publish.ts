import {
  validatePostInput,
  buildPostFile,
  type PostInputFields,
} from "./post-input.ts";
import {
  getFileInfo,
  putFile,
  type GitHubEnv,
  type GitHubDeps,
} from "./github.ts";

export class PublishValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishValidationError";
  }
}

export interface PublishPostParams {
  fields: PostInputFields;
  overwrite?: boolean;
  env: GitHubEnv;
}

export type PublishPostResult =
  | {
      status: "exists";
      slug: string;
      existingPublished: boolean;
    }
  | {
      status: "committed";
      slug: string;
      published: boolean;
      commitSha: string;
      overwritten: boolean;
      wasPublished: boolean;
    };

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Core publish workflow:
 * 1. Validates input fields and markers
 * 2. Re-asserts slug against strict regex
 * 3. Checks for existing file in GitHub repository
 * 4. Checks overwrite flag and handles conflict / existing publication status
 * 5. Builds commit message (Draft:, Update:, or Publish:, 72 chars max)
 * 6. Generates full markdown file with front matter
 * 7. Commits to GitHub via Contents API
 */
export async function publishPost(
  params: PublishPostParams,
  deps?: GitHubDeps
): Promise<PublishPostResult> {
  const { fields, overwrite, env } = params;

  // 1. Validate all post fields
  const validation = validatePostInput(fields);
  if (!validation.success) {
    throw new PublishValidationError(validation.error);
  }

  // 2. Strict slug pattern re-check immediately before path construction
  const slug = fields.slug.trim();
  if (!SLUG_REGEX.test(slug)) {
    throw new PublishValidationError(
      'Slug must consist of lowercase alphanumeric words separated by single hyphens (e.g. "my-post-title").'
    );
  }

  // 3. Strict server-side path construction
  const path = `content/posts/${slug}.md`;

  // 4. Look up existing file on GitHub
  const existingFile = await getFileInfo(path, env, deps);

  // 5. If file exists and overwrite is not true, return conflict status
  if (existingFile && overwrite !== true) {
    return {
      status: "exists",
      slug,
      existingPublished: existingFile.published,
    };
  }

  const overwritten = Boolean(existingFile);
  const wasPublished = existingFile ? existingFile.published : false;

  // 6. Build commit message
  const cleanTitle = fields.title.replace(/[\r\n]+/g, " ").trim().slice(0, 72);
  let commitMessage: string;
  if (!fields.published) {
    commitMessage = `Draft: ${cleanTitle}`;
  } else if (overwritten) {
    commitMessage = `Update: ${cleanTitle}`;
  } else {
    commitMessage = `Publish: ${cleanTitle}`;
  }

  // 7. Build markdown file content with front matter
  const fileContent = buildPostFile(fields);

  // 8. Commit file via GitHub API
  const putResult = await putFile(
    {
      path,
      content: fileContent,
      message: commitMessage,
      sha: existingFile?.sha,
    },
    env,
    deps
  );

  return {
    status: "committed",
    slug,
    published: fields.published,
    commitSha: putResult.commitSha,
    overwritten,
    wasPublished,
  };
}
