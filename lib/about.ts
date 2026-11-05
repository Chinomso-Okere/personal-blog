import fs from "fs";
import path from "path";

const ABOUT_FILE = path.join(process.cwd(), "content", "about.md");

// Phrase from about.md that the home About strip sets in italic accent.
const EMPHASIS = "show the answer is right";

export interface AboutStatement {
  intro: string;
  body: string;
  emphasis: string;
}

function readAbout(): string {
  try {
    return fs.readFileSync(ABOUT_FILE, "utf-8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/[*_`]/g, "").trim();
}

/** Items of the "What I write about" list in about.md; [] if not found. */
export function getWriteAboutTopics(): string[] {
  const lines = readAbout().split("\n");
  const start = lines.findIndex((l) => /^##\s+What I write about\s*$/i.test(l.trim()));
  if (start === -1) return [];

  const topics: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) topics.push(stripInlineMarkdown(item[1]));
    else if (topics.length > 0 && line.trim() !== "") break;
  }
  return topics;
}

/**
 * The home About strip: the first sentence of about.md, then the sentence
 * that begins "I care less about", with the closing phrase emphasised.
 * Returns null if either sentence cannot be found, so the strip is omitted.
 */
export function getAboutStatement(): AboutStatement | null {
  const text = readAbout();
  const firstParagraph = text.split(/\n\s*\n/)[0]?.trim() ?? "";
  const intro = firstParagraph.match(/^[^\n]*?[.!?](?=\s|$)/)?.[0];
  const sentence = text.match(/I care less about[^.!?]*[.!?]/)?.[0];
  if (!intro || !sentence) return null;

  const plain = stripInlineMarkdown(sentence);
  const at = plain.lastIndexOf(EMPHASIS);
  return {
    intro: stripInlineMarkdown(intro),
    body: at === -1 ? plain : plain.slice(0, at),
    emphasis: at === -1 ? "" : plain.slice(at),
  };
}
