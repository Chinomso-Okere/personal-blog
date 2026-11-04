import { NextResponse } from "next/server";
import { getSession, checkOrigin } from "@/lib/auth";
import {
  getPost,
  togglePublishPost,
  deletePost,
  PostNotFoundError,
} from "@/lib/manage";
import { GitHubApiError } from "@/lib/github";
import { PublishValidationError } from "@/lib/publish";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

function getGitHubEnv() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";

  if (!token || !owner || !repo) {
    return null;
  }

  return { token, owner, repo, branch };
}

function mapRouteError(err: unknown, defaultMessage: string) {
  if (err instanceof PublishValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof PostNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof GitHubApiError) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
  const errName = err instanceof Error ? err.name : "Error";
  console.error(`Post route error: ${errName}`);
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getGitHubEnv();
  if (!env) {
    console.error("Posts API unavailable: missing required GitHub env vars");
    return NextResponse.json(
      { error: "Posts management is not configured." },
      { status: 500 }
    );
  }

  const { slug } = await context.params;

  try {
    const result = await getPost(slug, env);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return mapRouteError(err, "Failed to get post.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getGitHubEnv();
  if (!env) {
    console.error("Posts API unavailable: missing required GitHub env vars");
    return NextResponse.json(
      { error: "Posts management is not configured." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > 300_000) {
    return NextResponse.json(
      { error: "Request body exceeds maximum allowed size." },
      { status: 400 }
    );
  }

  let bodyData: unknown;
  try {
    bodyData = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  if (
    !bodyData ||
    typeof bodyData !== "object" ||
    Array.isArray(bodyData)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const record = bodyData as Record<string, unknown>;
  if (typeof record.published !== "boolean") {
    return NextResponse.json(
      { error: "Field 'published' must be a boolean." },
      { status: 400 }
    );
  }

  const { slug } = await context.params;

  try {
    const result = await togglePublishPost(
      {
        slug,
        published: record.published,
      },
      env
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return mapRouteError(err, "Failed to update post status.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getGitHubEnv();
  if (!env) {
    console.error("Posts API unavailable: missing required GitHub env vars");
    return NextResponse.json(
      { error: "Posts management is not configured." },
      { status: 500 }
    );
  }

  const { slug } = await context.params;

  try {
    const result = await deletePost({ slug }, env);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return mapRouteError(err, "Failed to delete post.");
  }
}

