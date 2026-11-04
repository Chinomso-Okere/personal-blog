import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listPosts } from "@/lib/manage";
import { GitHubApiError } from "@/lib/github";
import { PublishValidationError } from "@/lib/publish";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Session verification
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check GitHub environment variables (fail closed)
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";

  if (!token || !owner || !repo) {
    console.error("List posts unavailable: missing required GitHub env vars");
    return NextResponse.json(
      { error: "Posts management is not configured." },
      { status: 500 }
    );
  }

  try {
    const result = await listPosts({
      token,
      owner,
      repo,
      branch,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof PublishValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const errName = err instanceof Error ? err.name : "Error";
    console.error(`List posts error: ${errName}`);
    return NextResponse.json(
      { error: "Failed to list posts." },
      { status: 500 }
    );
  }
}

