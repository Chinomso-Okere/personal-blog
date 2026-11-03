import fs from "fs";
import path from "path";

export type WritingStatus = "published" | "accepted";

export interface WritingEntry {
  title: string;
  type: string;
  venue: string;
  year: number;
  status: WritingStatus;
  note: string;
  url?: string;
}

const WRITING_FILE = path.join(process.cwd(), "content", "writing.json");

function validateWritingEntry(
  raw: unknown,
  index: number
): asserts raw is WritingEntry {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(
      `Writing validation error at index ${index}: entry must be a valid object.`
    );
  }

  const entry = raw as Record<string, unknown>;

  if (typeof entry.title !== "string" || !entry.title.trim()) {
    throw new Error(
      `Writing validation error at index ${index}: required field "title" must be a non-empty string.`
    );
  }

  if (typeof entry.type !== "string" || !entry.type.trim()) {
    throw new Error(
      `Writing validation error at index ${index}: required field "type" must be a non-empty string.`
    );
  }

  if (typeof entry.venue !== "string" || !entry.venue.trim()) {
    throw new Error(
      `Writing validation error at index ${index}: required field "venue" must be a non-empty string.`
    );
  }

  if (typeof entry.note !== "string" || !entry.note.trim()) {
    throw new Error(
      `Writing validation error at index ${index}: required field "note" must be a non-empty string.`
    );
  }

  if (typeof entry.year !== "number" || isNaN(entry.year)) {
    throw new Error(
      `Writing validation error at index ${index}: required field "year" must be a valid number.`
    );
  }

  if (entry.status !== "published" && entry.status !== "accepted") {
    throw new Error(
      `Writing validation error at index ${index}: "status" must be either "published" or "accepted".`
    );
  }

  if (entry.status === "published") {
    if (typeof entry.url !== "string" || !entry.url.trim()) {
      throw new Error(
        `Writing validation error at index ${index}: "url" is required for status "published".`
      );
    }
  }

  if (entry.url !== undefined && entry.url !== null && entry.url !== "") {
    if (typeof entry.url !== "string" || !entry.url.startsWith("https://")) {
      throw new Error(
        `Writing validation error at index ${index}: "url" must start with "https://".`
      );
    }
  }
}

/**
 * Returns all writing entries from content/writing.json.
 * Preserves file order (no sorting). Fails build if any entry is invalid.
 */
export function getWritingEntries(): WritingEntry[] {
  if (!fs.existsSync(WRITING_FILE)) {
    return [];
  }

  const raw = fs.readFileSync(WRITING_FILE, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Writing data error: content/writing.json must contain an array.");
  }

  parsed.forEach((entry, idx) => {
    validateWritingEntry(entry, idx);
  });

  return parsed as WritingEntry[];
}

