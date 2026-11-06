import { parseFrontmatter } from "../lib/frontmatter.ts";
import {
  validatePostInput,
  buildPostFile,
  generateSlug,
  normalizeParsedDate,
  isValidCalendarDate,
} from "../lib/post-input.ts";
import { readFileSync } from "node:fs";
import {
  validateWritingEntries,
  isArticle,
  sortArticlesNewestFirst,
} from "../lib/writing.ts";
import { parsePublishedPost, getAllPosts } from "../lib/posts.ts";
import { buildRssFeed } from "../lib/feed.ts";
import { cardVersion, homeCard, sectionCard, postCard } from "../lib/og-cards.ts";
import { XMLValidator, XMLParser } from "fast-xml-parser";

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

  // Cover image: https:// or /images/ & required alt text
  const localCoverPost = validatePostInput({
    ...testPost,
    coverImage: "/images/x.png",
    coverImageAlt: "Alt description",
  });
  assert(localCoverPost.success, 'a coverImage of "/images/x.png" with alt text passes');

  const httpCoverPost = validatePostInput({
    ...testPost,
    coverImage: "http://x.png",
    coverImageAlt: "Alt description",
  });
  assert(
    !httpCoverPost.success &&
      httpCoverPost.error === 'Cover image URL must start with "https://" or "/images/".',
    'a coverImage of "http://x.png" is rejected'
  );

  const uploadsCoverPost = validatePostInput({
    ...testPost,
    coverImage: "/uploads/x.png",
    coverImageAlt: "Alt description",
  });
  assert(
    !uploadsCoverPost.success &&
      uploadsCoverPost.error === 'Cover image URL must start with "https://" or "/images/".',
    'a coverImage of "/uploads/x.png" is rejected'
  );

  const missingAltPost = validatePostInput({
    ...testPost,
    coverImage: "/images/x.png",
    coverImageAlt: "",
  });
  assert(!missingAltPost.success, "a coverImage set with empty alt is still rejected");

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

  // Writing entries (content/writing.json): papers and articles
  const writingJson = JSON.parse(readFileSync("content/writing.json", "utf-8"));
  let realEntries = [];
  let realError = null;
  try {
    realEntries = validateWritingEntries(writingJson);
  } catch (err) {
    realError = err.message;
  }
  assert(realError === null, `Real writing.json validates${realError ? ": " + realError : ""}`);
  assert(
    realEntries.filter((e) => !isArticle(e)).length === 3 &&
      realEntries.filter(isArticle).length === 5,
    "Real writing.json has 3 papers and 5 articles"
  );
  assert(
    isArticle({ type: "article" }) && isArticle({ type: "Article" }) && !isArticle({ type: "paper" }),
    "isArticle is case-insensitive and excludes papers"
  );
  const sortedDates = sortArticlesNewestFirst(realEntries.filter(isArticle)).map((e) => e.date);
  assert(
    JSON.stringify(sortedDates) ===
      JSON.stringify(["2026-03-30", "2026-02-26", "2026-01-07", "2025-06-27", "2024-03-03"]),
    "Articles sort newest first"
  );

  const article = {
    title: "An article",
    type: "article",
    venue: "Daily Times Nigeria",
    year: 2026,
    date: "2026-03-30",
    status: "published",
    url: "https://example.com/article",
  };
  const paper = {
    title: "A paper",
    type: "paper",
    venue: "A venue",
    year: 2026,
    status: "accepted",
    note: "A note.",
  };
  const rejects = (entry) => {
    try {
      validateWritingEntries([entry]);
      return false;
    } catch {
      return true;
    }
  };
  assert(!rejects(article), "Article without note is accepted");
  assert(!rejects({ ...article, type: "Article" }), "Article type is accepted in either case");
  assert(rejects({ ...paper, note: undefined }), "Paper without note is rejected");
  assert(rejects({ ...article, note: "   " }), "Article with an empty note is rejected");
  assert(rejects({ ...article, date: "30/03/2026" }), "Date not in YYYY-MM-DD format is rejected");
  assert(rejects({ ...article, date: "2026-02-30" }), "Impossible calendar date is rejected");
  assert(rejects({ ...article, date: " 2026-03-30" }), "Date with surrounding whitespace is rejected");
  assert(rejects({ ...article, year: 2025 }), "Year that does not match the date is rejected");
  assert(rejects({ ...article, url: "http://example.com/article" }), "Non-https url is rejected");
  assert(rejects({ ...article, url: "" }), "Published entry without url is rejected");

  // RSS feed: drafts excluded, fields escaped, XML well-formed
  const site = {
    url: "https://chinomsookere.co.uk",
    name: "Chinomso Okere",
    description: "Writing on AI & evaluation",
  };
  const fixture = (published, title) => `---
title: ${JSON.stringify(title)}
date: "2026-11-01"
description: "A <b>test</b> post & more"
tags: ["AI Evaluation"]
published: ${published}
---

Body text.
`;
  const fixtures = [
    ["published-post.md", fixture(true, `Tom & Jerry's "<script>" guide`)],
    ["draft-post.md", fixture(false, "Secret draft title")],
  ];
  const feedPosts = fixtures
    .map(([name, raw]) => parsePublishedPost(name, raw))
    .filter(Boolean);
  const feedXml = buildRssFeed(feedPosts, site);

  assert(feedPosts.length === 1 && feedPosts[0].slug === "published-post", "parsePublishedPost drops the draft fixture");
  assert(!feedXml.includes("draft-post") && !feedXml.includes("Secret draft title"), "Feed excludes the draft");
  assert(feedXml.includes("https://chinomsookere.co.uk/blog/published-post"), "Feed links the published post with an absolute URL");
  assert(XMLValidator.validate(feedXml) === true, "Feed XML is well-formed (fast-xml-parser XMLValidator)");
  const parsedFeed = new XMLParser({ ignoreAttributes: false }).parse(feedXml);
  const channel = parsedFeed?.rss?.channel;
  const item = channel?.item;
  assert(parsedFeed?.rss?.["@_version"] === "2.0", "Feed is RSS 2.0");
  assert(
    channel?.["atom:link"]?.["@_href"] === "https://chinomsookere.co.uk/feed.xml" &&
      channel?.["atom:link"]?.["@_rel"] === "self",
    "Feed has atom:link rel=self to /feed.xml"
  );
  assert(item && !Array.isArray(item), "Feed has exactly one item");
  assert(
    feedXml.includes("Tom &amp; Jerry&apos;s &quot;&lt;script&gt;&quot; guide") && !feedXml.includes("<script>"),
    "Item title is escaped"
  );
  assert(feedXml.includes("A &lt;b&gt;test&lt;/b&gt; post &amp; more"), "Item description is escaped");
  assert(item?.pubDate === "Sun, 01 Nov 2026 00:00:00 GMT", "pubDate is RFC 822");
  const realFeed = buildRssFeed(getAllPosts(), site);
  assert(
    XMLValidator.validate(realFeed) === true &&
      (realFeed.match(/<item>/g) || []).length === getAllPosts().length,
    "Feed from the real published posts is well-formed with one item per post"
  );

  // Branded OG card versions (?v=): change exactly when a card's content does
  const cards = {
    home: homeCard(),
    blog: sectionCard("blog"),
    writing: sectionCard("writing"),
    about: sectionCard("about"),
  };
  const versions = Object.fromEntries(Object.entries(cards).map(([k, c]) => [k, cardVersion(c)]));
  assert(Object.values(versions).every((v) => /^[0-9a-f]{10}$/.test(v)), "Card versions are 10 hex characters");
  assert(new Set(Object.values(versions)).size === 4, "Each page's card has its own version");
  assert(cardVersion(sectionCard("writing")) === versions.writing, "Card version is stable for unchanged content");
  const editedWriting = { ...cards.writing, description: cards.writing.description + " Edited." };
  const afterEdit = { ...versions, writing: cardVersion(editedWriting) };
  assert(
    afterEdit.writing !== versions.writing &&
      ["home", "blog", "about"].every((k) => afterEdit[k] === versions[k]),
    "Changing one page's description changes only that page's version"
  );
  assert(cardVersion({ ...cards.home, label: "Other label" }) !== versions.home, "Changing a card's label changes its version");
  assert(
    cardVersion(postCard({ title: "A", tags: ["AI Evaluation"] })) !== cardVersion(postCard({ title: "A", tags: ["UK AI"] })),
    "Post card version follows its tag label"
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

