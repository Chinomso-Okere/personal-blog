export const SOURCE_TYPES = ["topic", "document", "transcript"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const ALLOWED_TAGS = [
  "AI Evaluation",
  "Multi-Agent Systems",
  "Causal Reasoning",
  "Voice AI",
  "Responsible AI",
  "AI Implementation",
  "Business Analysis",
  "UK AI",
] as const;
export type AllowedTag = (typeof ALLOWED_TAGS)[number];

const ALLOWED_TAGS_SET = new Set<string>(ALLOWED_TAGS);

export interface DraftRequest {
  sourceType: SourceType;
  sourceText: string;
  sourceRef?: string;
  angle?: string;
}

export interface DraftOutput {
  title: string;
  description: string;
  tags: string[];
  body: string;
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validates the draft generation request payload.
 * Pure function: no Next.js dependencies.
 */
export function validateDraftRequest(
  body: unknown
): ValidationResult<DraftRequest> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Request body must be an object." };
  }

  const { sourceType, sourceText, sourceRef, angle } = body as Record<
    string,
    unknown
  >;

  if (
    typeof sourceType !== "string" ||
    !SOURCE_TYPES.includes(sourceType as SourceType)
  ) {
    return {
      success: false,
      error: `Invalid sourceType "${String(
        sourceType
      )}". Must be one of: ${SOURCE_TYPES.join(", ")}.`,
    };
  }

  if (typeof sourceText !== "string" || !sourceText.trim()) {
    return {
      success: false,
      error: "sourceText must be a non-empty string.",
    };
  }

  const trimmedText = sourceText.trim();
  if (trimmedText.length > 100_000) {
    return {
      success: false,
      error:
        "sourceText exceeds the maximum allowed length of 100,000 characters.",
    };
  }

  let validRef: string | undefined = undefined;
  if (sourceRef !== undefined && sourceRef !== null && sourceRef !== "") {
    if (typeof sourceRef !== "string") {
      return {
        success: false,
        error: "sourceRef must be a string if provided.",
      };
    }
    const trimmedRef = sourceRef.trim();
    if (trimmedRef.length > 500) {
      return {
        success: false,
        error: "sourceRef exceeds maximum length of 500 characters.",
      };
    }
    if (trimmedRef) {
      validRef = trimmedRef;
    }
  }

  let validAngle: string | undefined = undefined;
  if (angle !== undefined && angle !== null && angle !== "") {
    if (typeof angle !== "string") {
      return { success: false, error: "angle must be a string if provided." };
    }
    const trimmedAngle = angle.trim();
    if (trimmedAngle.length > 2_000) {
      return {
        success: false,
        error: "angle exceeds maximum length of 2,000 characters.",
      };
    }
    if (trimmedAngle) {
      validAngle = trimmedAngle;
    }
  }

  return {
    success: true,
    data: {
      sourceType: sourceType as SourceType,
      sourceText: trimmedText,
      sourceRef: validRef,
      angle: validAngle,
    },
  };
}

/**
 * Validates the tool input received from Claude's submit_draft call.
 * Drops disallowed tags, dedupes, limits to max 3 tags.
 * Throws a descriptive Error if required fields are missing or invalid.
 */
export function validateDraftOutput(toolInput: unknown): DraftOutput {
  if (typeof toolInput !== "object" || toolInput === null) {
    throw new Error("Draft tool input must be a valid object.");
  }

  const { title, description, tags, body } = toolInput as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Missing or empty required draft field: title.");
  }

  const trimmedTitle = title.trim();

  if (typeof description !== "string" || !description.trim()) {
    throw new Error("Missing or empty required draft field: description.");
  }

  const trimmedDescription = description.trim();

  if (typeof body !== "string" || !body.trim()) {
    throw new Error("Missing or empty required draft field: body.");
  }

  // Tags: filter to ALLOWED_TAGS, deduplicate, keep at most 3
  const rawTags = Array.isArray(tags) ? tags : [];
  const filteredTags: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of rawTags) {
    if (typeof rawTag === "string") {
      const trimmedTag = rawTag.trim();
      if (ALLOWED_TAGS_SET.has(trimmedTag) && !seen.has(trimmedTag)) {
        seen.add(trimmedTag);
        filteredTags.push(trimmedTag);
        if (filteredTags.length === 3) break;
      }
    }
  }

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    tags: filteredTags,
    body: body.trim(),
  };
}

/**
 * Formats the user message for Claude with clear sections and <source> tags.
 */
export function buildUserMessage(request: DraftRequest): string {
  const parts: string[] = [];

  parts.push(`Source type: ${request.sourceType}`);

  if (request.sourceRef) {
    parts.push(`Source reference: ${request.sourceRef}`);
  }

  if (request.angle) {
    parts.push(`My angle: ${request.angle}`);
  }

  parts.push("");
  parts.push("<source>");
  parts.push(request.sourceText);
  parts.push("</source>");

  return parts.join("\n");
}

