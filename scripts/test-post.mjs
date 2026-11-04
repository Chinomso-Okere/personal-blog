import { parseFrontmatter } from "../lib/frontmatter.ts";
import {
  validatePostInput,
  buildPostFile,
  generateSlug,
  normalizeParsedDate,
  isValidCalendarDate,
} from "../lib/post-input.ts";

async function runTests() {
  console.log("=== RUNNING POST INPUT, VALIDATION & FRONTMATTER TESTS ===\n");

  let failed = false;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed = true;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  // 1. Slug generator
  const slug1 = generateSlug("Evaluating Multi-Agent Systems in Practice!");
  assert(
    slug1 === "evaluating-multi-agent-systems-in-practice",
    "generateSlug normalises title with symbols and accents"
  );

  const slugAccents = generateSlug("Café & Résumé: A Practical Guide to AI");
  assert(
    slugAccents === "cafe-resume-a-practical-guide-to-ai",
    "generateSlug strips diacritics and replaces non-alphanumeric"
  );

  const longSlug = generateSlug("A".repeat(100));
  assert(
    longSlug.length <= 80,
    "generateSlug caps output at 80 characters"
  );

  // 2. Safe Frontmatter Parsing & ---js Security Engine Block
  delete globalThis.__EXPLOIT_EXECUTED;
  const hostileJsPayload = `---js
(() => { globalThis.__EXPLOIT_EXECUTED = true; return { title: "PWNED" }; })()
---
Body text.`;

  let jsBlocked = false;
  try {
    parseFrontmatter(hostileJsPayload);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only YAML front matter is supported.")) {
      jsBlocked = true;
    }
  }

  assert(
    jsBlocked && globalThis.__EXPLOIT_EXECUTED === undefined,
    'parseFrontmatter rejects "---js" front matter and prevents code execution'
  );

  // 3. Date Normalisation
  const dateObj = new Date("2026-11-04T00:00:00.000Z");
  assert(
    normalizeParsedDate(dateObj) === "2026-11-04",
    "normalizeParsedDate converts Date object to YYYY-MM-DD"
  );

  assert(
    normalizeParsedDate("2026-11-04") === "2026-11-04",
    "normalizeParsedDate preserves valid YYYY-MM-DD string"
  );

  // 4. buildPostFile & parseFrontmatter Round-trip
  const testPost = {
    title: 'Evaluating "Agents": Does It Work in Practice?',
    slug: "evaluating-agents-does-it-work-in-practice",
    date: "2026-11-04",
    description: "A plain assessment of multi-agent evaluation techniques.",
    tags: ["AI Evaluation", "Multi-Agent Systems"],
    coverImage: "https://example.com/cover.png",
    coverImageAlt: "Cover diagram illustrating agent workflow",
    originalUrl: "https://example.com/original-article",
    body: "## Section 1\n\nThis is the markdown body.\n\n```python\nprint('hello')\n```",
    published: true,
  };

  const fileText = buildPostFile(testPost);
  assert(
    fileText.includes('date: "2026-11-04"'),
    "buildPostFile ensures date is strictly a quoted string"
  );

  const parsed = parseFrontmatter(fileText);
  assert(
    parsed.data.title === testPost.title,
    "Title with quotes and colons survives round-trip intact"
  );
  assert(
    typeof parsed.data.date === "string" && parsed.data.date === "2026-11-04",
    "Parsed date remains string YYYY-MM-DD after round-trip"
  );
  assert(
    parsed.data.slug === testPost.slug &&
      parsed.data.coverImage === testPost.coverImage &&
      parsed.data.coverImageAlt === testPost.coverImageAlt &&
      parsed.data.originalUrl === testPost.originalUrl &&
      parsed.data.published === true,
    "All front matter metadata fields round-trip cleanly"
  );
  assert(
    parsed.content.trim() === testPost.body.trim(),
    "Markdown body content round-trips cleanly"
  );

  // 5. Validation Rules
  // Valid post passes
  const validRes = validatePostInput(testPost);
  assert(validRes.success, "Valid post passes validatePostInput");

  // Title limits: 1 to 120
  const emptyTitle = validatePostInput({ ...testPost, title: "" });
  assert(!emptyTitle.success, "Empty title is rejected");

  const longTitle = validatePostInput({ ...testPost, title: "T".repeat(121) });
  assert(!longTitle.success, "Title over 120 characters is rejected");

  // Slug limits & pattern: 1 to 80
  const longSlugPost = validatePostInput({
    ...testPost,
    slug: "a".repeat(81),
  });
  assert(!longSlugPost.success, "Slug over 80 characters is rejected");

  const invalidSlugPost = validatePostInput({
    ...testPost,
    slug: "Invalid_Slug!",
  });
  assert(!invalidSlugPost.success, "Slug with uppercase or symbols is rejected");

  // Date validation & calendar-valid dates
  assert(!isValidCalendarDate("2026-02-31"), "isValidCalendarDate rejects 2026-02-31");
  assert(!isValidCalendarDate("2026-04-31"), "isValidCalendarDate rejects 2026-04-31");
  assert(!isValidCalendarDate("2027-02-29"), "isValidCalendarDate rejects non-leap 2027-02-29");
  assert(isValidCalendarDate("2028-02-29"), "isValidCalendarDate accepts leap day 2028-02-29");

  const badDatePost = validatePostInput({
    ...testPost,
    date: "04-11-2026",
  });
  assert(!badDatePost.success, "Date not matching YYYY-MM-DD is rejected");

  const impossibleDatePost = validatePostInput({
    ...testPost,
    date: "2026-02-31",
  });
  assert(
    !impossibleDatePost.success &&
      impossibleDatePost.error === "Date must be a valid calendar date.",
    "validatePostInput rejects impossible date with exact message 'Date must be a valid calendar date.'"
  );

  const leapDatePost = validatePostInput({
    ...testPost,
    date: "2028-02-29",
  });
  assert(leapDatePost.success, "validatePostInput accepts valid leap year date 2028-02-29");

  // Description limits: max 300
  const longDescPost = validatePostInput({
    ...testPost,
    description: "D".repeat(301),
  });
  assert(!longDescPost.success, "Description over 300 characters is rejected");

  // Tags: max 3, must be allowed
  const tooManyTagsPost = validatePostInput({
    ...testPost,
    tags: [
      "AI Evaluation",
      "Multi-Agent Systems",
      "Causal Reasoning",
      "Voice AI",
    ],
  });
  assert(!tooManyTagsPost.success, "More than 3 tags is rejected");

  const disallowedTagPost = validatePostInput({
    ...testPost,
    tags: ["Disallowed Tag"],
  });
  assert(!disallowedTagPost.success, "Disallowed tag is rejected");

  // Cover image: https:// only & required alt text
  const httpCoverPost = validatePostInput({
    ...testPost,
    coverImage: "http://insecure.com/img.png",
  });
  assert(!httpCoverPost.success, "Non-https cover image URL is rejected");

  const missingAltPost = validatePostInput({
    ...testPost,
    coverImage: "https://example.com/cover.png",
    coverImageAlt: "",
  });
  assert(!missingAltPost.success, "Missing alt text when cover image URL is present is rejected");

  // Body: max 200,000 chars & [CHECK: rejection
  const longBodyPost = validatePostInput({
    ...testPost,
    body: "B".repeat(200_001),
  });
  assert(!longBodyPost.success, "Body over 200,000 characters is rejected");

  const checkMarkerBody = `Line 1
Line 2
Line 3 has [CHECK: verify citation here]
Line 4`;
  const checkMarkerPost = validatePostInput({
    ...testPost,
    body: checkMarkerBody,
  });
  assert(
    !checkMarkerPost.success &&
      checkMarkerPost.error.includes("line 3"),
    "Body containing [CHECK: is rejected and reports exact line number"
  );

  if (failed) {
    console.error("\nONE OR MORE POST TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL POST INPUT, VALIDATION & FRONTMATTER TESTS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

