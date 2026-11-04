import { NextResponse } from "next/server";
import { getSession, checkOrigin } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CSRF defense
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Session verification
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyData: unknown;
  try {
    bodyData = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const { body } = (bodyData || {}) as { body?: unknown };
  if (typeof body !== "string") {
    return NextResponse.json(
      { error: "Field 'body' must be a string." },
      { status: 400 }
    );
  }

  if (body.length > 200_000) {
    return NextResponse.json(
      { error: "Body exceeds maximum allowed length of 200,000 characters." },
      { status: 400 }
    );
  }

  try {
    const html = await renderMarkdown(body);
    return NextResponse.json({ html });
  } catch {
    return NextResponse.json(
      { error: "Failed to render markdown." },
      { status: 500 }
    );
  }
}

