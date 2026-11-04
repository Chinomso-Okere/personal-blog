import { NextResponse } from "next/server";
import { getSession, checkOrigin } from "@/lib/auth";
import { validateDraftRequest } from "@/lib/draft";
import { generateDraft } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  // (a) CSRF defense: Origin must match request host or Sec-Fetch-Site must be same-origin
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // (b) Defense in depth: Verify session independently
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check API configuration early (fail closed)
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.trim()) {
    console.error("Drafting unavailable: ANTHROPIC_API_KEY is not set.");
    return NextResponse.json(
      { error: "Drafting is not configured" },
      { status: 500 }
    );
  }

  // (c) Parse JSON safely
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const validation = validateDraftRequest(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // (d) Call generateDraft and return result with timings
  try {
    const result = await generateDraft(validation.data);
    return NextResponse.json({
      draft: result.draft,
      usage: result.usage,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    // Map upstream errors cleanly without logging source text or leaking raw errors
    const errorObj = err as { name?: string; status?: number; message?: string };

    if (errorObj?.message === "MISSING_API_KEY") {
      console.error("Drafting unavailable: ANTHROPIC_API_KEY is not set.");
      return NextResponse.json(
        { error: "Drafting is not configured" },
        { status: 500 }
      );
    }

    if (
      errorObj?.name === "APIConnectionTimeoutError" ||
      errorObj?.message === "SDK_TIMEOUT" ||
      errorObj?.name?.includes("Timeout") ||
      errorObj?.message?.includes("Timeout")
    ) {
      console.error("Draft generation timed out.");
      return NextResponse.json(
        { error: "The draft took too long. Try a shorter source." },
        { status: 504 }
      );
    }

    if (errorObj?.message === "DRAFT_TRUNCATED") {
      console.error("Draft generation output was truncated.");
      return NextResponse.json(
        {
          error:
            "The draft was cut off before it finished. Try a shorter source, or a narrower angle.",
        },
        { status: 502 }
      );
    }

    if (errorObj?.status === 429) {
      return NextResponse.json(
        { error: "The AI service is currently rate limited. Please try again shortly." },
        { status: 429 }
      );
    }

    console.error("Upstream error occurred during draft generation.");
    return NextResponse.json(
      { error: "Failed to generate draft from AI service. Please try again." },
      { status: 502 }
    );
  }
}

