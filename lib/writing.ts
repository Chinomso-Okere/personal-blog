import fs from "fs";
import path from "path";
import { isValidCalendarDate } from "./post-input.ts";

export type WritingStatus = "published" | "accepted";

export interface WritingEntry {
  title: string;
  type: string;
  venue: string;
  year: number;
  status: WritingStatus;
  /** Required for papers; optional for articles. */
  note?: string;
  url?: string;
  /** "YYYY-MM-DD"; its year must equal `year`. */
  date?: string;
}

const WRITING_FILE = path.join(process.cwd(), "content", "writing.json");

/** Articles (pieces written for publications) as opposed to research papers. */
export function isArticle(entry: Pick<WritingEntry, "type">): boolean {
  return entry.type.trim().toLowerCase() === "article";
}

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

  const article = isArticle({ type: entry.type });
  if (entry.note !== undefined || !article) {
    if (typeof entry.note !== "string" || !entry.note.trim()) {
      throw new Error(
        `Writing validation error at index ${index}: "note" must be a non-empty string${
          article ? " when present" : ""
        }.`
      );
    }
  }

  if (typeof entry.year !== "number" || isNaN(entry.year)) {
    throw new Error(
      `Writing validation error at index ${index}: required field "year" must be a valid number.`
    );
  }

  if (entry.date !== undefined) {
    if (
      typeof entry.date !== "string" ||
      entry.date !== entry.date.trim() ||
      !isValidCalendarDate(entry.date)
    ) {
      throw new Error(
        `Writing validation error at index ${index}: "date" must be a real calendar date in YYYY-MM-DD format.`
      );
    }
    if (Number(entry.date.slice(0, 4)) !== entry.year) {
      throw new Error(
        `Writing validation error at index ${index}: "year" (${entry.year}) must match the year in "date" (${entry.date}).`
      );
    }
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
 * Validates parsed writing.json content. Throws on the first invalid entry.
 * Pure (no file access) so it can be tested directly.
 */
export function validateWritingEntries(parsed: unknown): WritingEntry[] {
  if (!Array.isArray(parsed)) {
    throw new Error("Writing data error: content/writing.json must contain an array.");
  }

  parsed.forEach((entry, idx) => {
    validateWritingEntry(entry, idx);
  });

  return parsed as WritingEntry[];
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
  return validateWritingEntries(JSON.parse(raw));
}

/** Articles, newest first: by date, then year for any undated entries. */
export function sortArticlesNewestFirst(entries: WritingEntry[]): WritingEntry[] {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.date ? -1 : b.date ? 1 : 0;
  });
}
