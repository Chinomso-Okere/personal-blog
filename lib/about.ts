import fs from "fs";
import path from "path";
import { parseFrontmatter } from "@/lib/frontmatter";

const ABOUT_FILE = path.join(process.cwd(), "content", "about.md");

// Phrase of thinkingQuote that the home About strip sets in italic accent.
const EMPHASIS = "show the answer is right";

/**
 * Content of content/about.md (front matter). Every field is optional: a
 * missing or malformed one is left out, so its section is simply not shown.
 */
export interface About {
  intro?: string;
  atAGlance?: string[];
  thinkingLead?: string;
  thinkingQuote?: string;
  writeAbout?: string[];
  audience?: string;
  workWithMe?: string;
  homeStatement?: string;
}

export interface AboutStatement {
  intro: string;
  body: string;
  emphasis: string;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function list(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(text).filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : undefined;
}

export function getAbout(): About {
  let raw: string;
  try {
    raw = fs.readFileSync(ABOUT_FILE, "utf-8");
  } catch {
    return {};
  }

  let data: Record<string, unknown>;
  try {
    data = parseFrontmatter(raw).data;
  } catch {
    return {};
  }

  return {
    intro: text(data.intro),
    atAGlance: list(data.atAGlance),
    thinkingLead: text(data.thinkingLead),
    thinkingQuote: text(data.thinkingQuote),
    writeAbout: list(data.writeAbout),
    audience: text(data.audience),
    workWithMe: text(data.workWithMe),
    homeStatement: text(data.homeStatement),
  };
}

/** The "What I write about" topics; [] if not set. */
export function getWriteAboutTopics(): string[] {
  return getAbout().writeAbout ?? [];
}

/**
 * The home About strip: homeStatement, then thinkingQuote with its closing
 * phrase emphasised. Returns null if either is missing, so the strip is omitted.
 */
export function getAboutStatement(): AboutStatement | null {
  const { homeStatement, thinkingQuote } = getAbout();
  if (!homeStatement || !thinkingQuote) return null;

  const at = thinkingQuote.lastIndexOf(EMPHASIS);
  return {
    intro: homeStatement,
    body: at === -1 ? thinkingQuote : thinkingQuote.slice(0, at),
    emphasis: at === -1 ? "" : thinkingQuote.slice(at),
  };
}
