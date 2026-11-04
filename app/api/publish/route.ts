import { NextResponse } from "next/server";
import { getSession, checkOrigin } from "@/lib/auth";
import { publishPost, PublishValidationError } from "@/lib/publish";
import { GitHubApiError } from "@/lib/github";
import type { PostInputFields } from "@/lib/post-input";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. CSRF defense
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Session verification
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Size check before parsing (max 300,000 characters)
  const rawBody = await request.text();
  if (rawBody.length > 300_000) {
    return NextResponse.json(
      {
        error:
          "Request body exceeds maximum allowed size of 300,000 characters.",
      },
      { status: 400 }
    );
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  if (
    !rawParsed ||
    typeof rawParsed !== "object" ||
    Array.isArray(rawParsed)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const bodyData = rawParsed as Record<string, unknown>;

  // 4. Check required GitHub environment variables (fail closed)
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";

  if (!token) {
    console.error("Publishing unavailable: missing GITHUB_TOKEN");
    return NextResponse.json(
      { error: "Publishing is not configured." },
      { status: 500 }
    );
  }
  if (!owner) {
    console.error("Publishing unavailable: missing GITHUB_OWNER");
    return NextResponse.json(
      { error: "Publishing is not configured." },
      { status: 500 }
    );
  }
  if (!repo) {
    console.error("Publishing unavailable: missing GITHUB_REPO");
    return NextResponse.json(
      { error: "Publishing is not configured." },
      { status: 500 }
    );
  }

  const overwrite = bodyData.overwrite === true;
  const fields = (
    bodyData.fields &&
    typeof bodyData.fields === "object" &&
    !Array.isArray(bodyData.fields)
      ? bodyData.fields
      : bodyData
  ) as PostInputFields;

  try {
    const result = await publishPost({
      fields,
      overwrite,
      env: {
        token,
        owner,
        repo,
        branch,
      },
    });

    if (result.status === "exists") {
      return NextResponse.json(
        {
          exists: true,
          slug: result.slug,
          existingPublished: result.existingPublished,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        committed: true,
        slug: result.slug,
        published: result.published,
        commitSha: result.commitSha,
        overwritten: result.overwritten,
        wasPublished: result.wasPublished,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof PublishValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    const errName = err instanceof Error ? err.name : "Error";
    console.error(`Publish error: ${errName}`);
    return NextResponse.json(
      { error: "Publishing failed." },
      { status: 500 }
    );
  }
}

