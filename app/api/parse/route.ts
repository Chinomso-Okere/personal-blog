import { NextResponse } from "next/server";
import { getSession, checkOrigin } from "@/lib/auth";
import { parseFrontmatter } from "@/lib/frontmatter";
import { normalizeParsedDate, generateSlug } from "@/lib/post-input";
import { ALLOWED_TAGS } from "@/lib/tags";

export const dynamic = "force-dynamic";

const ALLOWED_TAGS_SET = new Set<string>(ALLOWED_TAGS);

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

  const { text } = (bodyData || {}) as { text?: unknown };
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "Field 'text' must be a string." },
      { status: 400 }
    );
  }

  if (text.length > 250_000) {
    return NextResponse.json(
      { error: "Text exceeds maximum allowed length of 250,000 characters." },
      { status: 400 }
    );
  }

  const trimmedText = text.trim();

  // If text does not start with front matter delimiter, treat whole text as body
  if (!trimmedText.startsWith("---")) {
    return NextResponse.json({
      parsed: false,
      body: text,
    });
  }

  try {
    const { data, content } = parseFrontmatter(trimmedText);

    // Map extracted fields
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const slug =
      typeof data.slug === "string" && data.slug.trim()
        ? data.slug.trim()
        : title
        ? generateSlug(title)
        : "";

    const date = normalizeParsedDate(data.date);
    const description =
      typeof data.description === "string" ? data.description.trim() : "";

    // Tags: filter to allowed and cap at 3
    const rawTags = Array.isArray(data.tags) ? data.tags : [];
    const validTags: string[] = [];
    const seen = new Set<string>();
    for (const t of rawTags) {
      if (typeof t === "string") {
        const trimmed = t.trim();
        if (ALLOWED_TAGS_SET.has(trimmed) && !seen.has(trimmed)) {
          seen.add(trimmed);
          validTags.push(trimmed);
          if (validTags.length === 3) break;
        }
      }
    }

    const coverImage =
      typeof data.coverImage === "string" ? data.coverImage.trim() : undefined;
    const coverImageAlt =
      typeof data.coverImageAlt === "string"
        ? data.coverImageAlt.trim()
        : undefined;
    const originalUrl =
      typeof data.originalUrl === "string"
        ? data.originalUrl.trim()
        : undefined;
    const published = data.published === true;

    return NextResponse.json({
      parsed: true,
      fields: {
        title,
        slug,
        date,
        description,
        tags: validTags,
        coverImage,
        coverImageAlt,
        originalUrl,
        published,
      },
      body: content.trim(),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to parse front matter.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

