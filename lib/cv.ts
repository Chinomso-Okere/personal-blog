import fs from "fs";
import path from "path";
import { parseFrontmatter } from "./frontmatter.ts";
import { siteConfig } from "./site.ts";

const CV_FILE = path.join(process.cwd(), "content", "cv.md");

// Contact details deliberately live in lib/site.ts, not in the CV file, so a
// new address changes in one place. Any other key fails the build.
const ALLOWED_KEYS = ["name", "headline", "location"] as const;

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// International (+44 7700 900123) or UK national (07700 900123, 0131 496 0000).
// The lookbehind keeps digit runs inside DOIs and dates from matching.
const PHONE_REGEX =
  /(?:\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,3}|(?<![\w./])\(?0\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4})(?!\w)/;
const UK_POSTCODE_REGEX = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/;

export interface CvLink {
  href: string;
  label: string;
}

export interface Cv {
  name: string;
  headline: string;
  location: string;
  /** From siteConfig; never stored in content/cv.md. */
  email: CvLink;
  linkedin: CvLink;
  website: CvLink;
  content: string;
}

export type CvValidationResult =
  | { success: true }
  | { success: false; field: string; error: string };

/**
 * Validates content/cv.md: only name, headline and location (non-empty
 * strings), and no email address, phone number or UK postcode anywhere in
 * the file. Pure.
 */
export function validateCv(data: Record<string, unknown>, body: string): CvValidationResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { success: false, field: "front matter", error: "front matter must be a YAML mapping." };
  }
  for (const key of Object.keys(data)) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      return {
        success: false,
        field: key,
        error: `unknown field "${key}"; contact details come from lib/site.ts.`,
      };
    }
  }
  for (const key of ALLOWED_KEYS) {
    const value = data[key];
    if (typeof value !== "string" || !value.trim()) {
      return { success: false, field: key, error: `"${key}" is required.` };
    }
  }

  const texts: [string, string][] = [
    ...ALLOWED_KEYS.map((key): [string, string] => [key, data[key] as string]),
    ["body", body],
  ];
  for (const [field, text] of texts) {
    if (EMAIL_REGEX.test(text)) {
      return { success: false, field, error: "contains an email address; use siteConfig.links.email." };
    }
    if (PHONE_REGEX.test(text)) {
      return { success: false, field, error: "contains what looks like a phone number." };
    }
    if (UK_POSTCODE_REGEX.test(text)) {
      return { success: false, field, error: "contains what looks like a postcode." };
    }
  }
  return { success: true };
}

function withoutScheme(url: string): string {
  return url.replace(/^(mailto:|https?:\/\/)(www\.)?/, "").replace(/\/+$/, "");
}

/** Parses CV file text and adds the contact links from siteConfig. Pure. */
export function parseCvFile(rawContent: string): Cv {
  let parsed;
  try {
    parsed = parseFrontmatter(rawContent);
  } catch (err) {
    throw new Error(`CV error in "content/cv.md": front matter could not be parsed (${(err as Error).message}).`);
  }
  const result = validateCv(parsed.data, parsed.content);
  if (!result.success) {
    throw new Error(`CV error in "content/cv.md" (${result.field}): ${result.error}`);
  }

  const { email, linkedin } = siteConfig.links;
  return {
    name: (parsed.data.name as string).trim(),
    headline: (parsed.data.headline as string).trim(),
    location: (parsed.data.location as string).trim(),
    email: { href: email, label: withoutScheme(email) },
    linkedin: { href: linkedin, label: withoutScheme(linkedin) },
    website: { href: siteConfig.url, label: withoutScheme(siteConfig.url) },
    content: parsed.content,
  };
}

/** Reads content/cv.md. Throws (failing the build) if it is missing or invalid. */
export function getCv(): Cv {
  return parseCvFile(fs.readFileSync(CV_FILE, "utf-8"));
}
