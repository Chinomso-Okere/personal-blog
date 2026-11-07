import {
  validateProject,
  parseProjectFile,
  compareProjects,
  dropDeadPostLinks,
  getAllProjects,
  getProjectBySlug,
  adjacentProjects,
  filterProjects,
  showFilters,
  toSummary,
  FILTER_THRESHOLD,
  LIMITATIONS_SECTION,
  TYPE_LABELS,
} from "../lib/projects.ts";
import { parseCvSkills, getCvSkills, parseCvSections, parseExperience } from "../lib/cv.ts";
import { cardLayout } from "../lib/project-types.ts";
import { sectionPages, PORTFOLIO_HERO, CV_PATH } from "../lib/pages.ts";
import { sectionCard } from "../lib/og-cards.ts";
import {
  kickerStatus,
  projectTitleTransition,
  projectCoverTransition,
} from "../lib/project-types.ts";
import { formatProjectDate } from "../lib/format.ts";
import { projectCard, cardVersion } from "../lib/og-cards.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { validateCv, parseCvFile, getCv } from "../lib/cv.ts";
import { siteConfig } from "../lib/site.ts";
import { getAllPosts } from "../lib/posts.ts";
import { readFileSync, readdirSync } from "node:fs";

const FULL_BODY = `## Problem

The problem.

## Approach

The approach.

## Evidence

The evidence.

## What it doesn't show

The limits.
`;

const BUILD_BODY = `## Problem

P.

## Approach

A.

## Evidence

E.
`;

const BASE = {
  title: "A valid project",
  slug: "valid-project",
  summary: "One sentence summary.",
  type: "research",
  status: "Published",
  date: "2026-11",
  published: true,
};

// Values are written as JSON (valid YAML flow syntax); { raw } writes the
// YAML value verbatim, and undefined leaves the key out.
function fixture(overrides = {}, body = FULL_BODY) {
  const data = { ...BASE, ...overrides };
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) =>
      value && typeof value === "object" && "raw" in value
        ? `${key}: ${value.raw}`
        : `${key}: ${JSON.stringify(value)}`
    );
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function parseError(filename, text) {
  try {
    parseProjectFile(filename, text);
    return null;
  } catch (err) {
    return err.message;
  }
}

async function runTests() {
  console.log("=== RUNNING PROJECT & CV CONTENT MODEL TESTS ===\n");

  let failed = false;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed = true;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  // Rejects with an error naming the file and the field.
  function rejects(label, overrides, field, body, filename = "valid-project.md") {
    const message = parseError(filename, fixture(overrides, body));
    assert(
      message !== null &&
        message.includes(`"${filename}"`) &&
        message.includes(`(${field})`),
      `Rejects ${label} (error names file and "${field}")${message ? "" : " -- no error thrown"}`
    );
  }

  // 1. Valid fixtures
  const full = parseProjectFile(
    "valid-project.md",
    fixture({
      role: "Co-author",
      venue: "IEEE AAIML 2026",
      stack: ["Python", "CrewAI"],
      links: {
        paper: "https://doi.org/10.1/x",
        repo: "https://github.com/a/b",
        live: "https://example.com",
        post: "/blog/some-post",
      },
      cover: "/images/cover.png",
      coverAlt: "A diagram",
      featured: true,
      order: { raw: "2" },
    })
  );
  assert(full !== null && full.slug === "valid-project", "Valid fixture with every field parses");
  assert(full?.order === 2 && full?.featured === true, "order and featured are carried through");
  assert(full?.links.post === "/blog/some-post", "Internal /blog/<slug> post link is accepted");
  assert(full?.content.includes("## Problem"), "Body content is returned");

  const minimal = parseProjectFile("valid-project.md", fixture());
  assert(
    minimal !== null &&
      minimal.featured === false &&
      minimal.order === undefined &&
      minimal.stack.length === 0 &&
      Object.keys(minimal.links).length === 0,
    "Minimal fixture parses with defaults (not featured, no order, empty stack and links)"
  );

  const emptyLinks = parseProjectFile("valid-project.md", fixture({ links: { raw: "{}" } }));
  assert(emptyLinks !== null && Object.keys(emptyLinks.links).length === 0, "links: {} means no links");

  assert(
    parseProjectFile("valid-project.md", fixture({ date: "2026" })) !== null,
    'Year-only date "2026" is accepted'
  );
  assert(
    parseProjectFile("valid-project.md", fixture({ links: { post: "https://medium.com/x" } })) !== null,
    "https post link is accepted"
  );
  assert(
    parseProjectFile("valid-project.md", fixture({ cover: "https://example.com/c.png", coverAlt: "Alt" })) !== null,
    "https cover with alt is accepted"
  );
  assert(
    parseProjectFile("valid-project.md", fixture({ type: "build", status: "Live" }, BUILD_BODY)) !== null,
    'A build entry without "What it doesn\'t show" is accepted'
  );
  assert(
    parseProjectFile(
      "valid-project.md",
      fixture({}, FULL_BODY.replace("What it doesn't show", "What it doesn’t show"))
    ) !== null,
    "Limitations heading with a curly apostrophe is accepted"
  );
  assert(
    parseProjectFile("valid-project.md", fixture({ stack: Array.from({ length: 8 }, (_, i) => `T${i}`) })) !== null,
    "Stack of exactly 8 items is accepted"
  );

  // 2. Rejections
  for (const field of ["title", "slug", "summary", "type", "status", "date", "published"]) {
    rejects(`a missing "${field}"`, { [field]: undefined }, field);
  }
  rejects("an empty title", { title: "  " }, "title");
  rejects("a title over 120 characters", { title: "T".repeat(121) }, "title");
  rejects("a summary over 200 characters", { summary: "S".repeat(201) }, "summary");
  rejects("a slug that does not match the filename", { slug: "other-slug" }, "slug");
  rejects("a bad filename slug", { slug: "Bad_Slug" }, "filename", FULL_BODY, "Bad_Slug.md");
  rejects("a filename slug over 80 characters", { slug: "a".repeat(81) }, "filename", FULL_BODY, `${"a".repeat(81)}.md`);
  rejects("an unknown top-level key", { tags: ["x"] }, "tags");
  rejects("an unknown links key", { links: { demo: "https://example.com" } }, "links.demo");
  rejects("links as a list", { links: ["https://example.com"] }, "links");
  rejects("an unknown type", { type: "essay" }, "type");
  rejects("an unknown status", { status: "Draft" }, "status");
  for (const date of ["2026-13", "2026-00", "2026-1", "26", "2026-11-06", "Nov 2026"]) {
    rejects(`date "${date}"`, { date }, "date");
  }
  rejects("an unquoted (numeric) date", { date: { raw: "2026" } }, "date");
  rejects("an http paper link", { links: { paper: "http://doi.org/x" } }, "links.paper");
  rejects("an http repo link", { links: { repo: "http://github.com/a/b" } }, "links.repo");
  rejects("an http live link", { links: { live: "http://example.com" } }, "links.live");
  rejects("a relative live link", { links: { live: "/blog/x" } }, "links.live");
  rejects('post link "/other/x"', { links: { post: "/other/x" } }, "links.post");
  rejects('post link "/blog/Bad_Slug"', { links: { post: "/blog/Bad_Slug" } }, "links.post");
  rejects('post link "/blog/a/b"', { links: { post: "/blog/a/b" } }, "links.post");
  rejects("an http cover", { cover: "http://example.com/c.png", coverAlt: "Alt" }, "cover");
  rejects("a cover without alt", { cover: "/images/c.png" }, "coverAlt");
  rejects("coverAlt without a cover", { coverAlt: "Alt" }, "coverAlt");
  rejects("a stack of 9 items", { stack: Array.from({ length: 9 }, (_, i) => `T${i}`) }, "stack");
  rejects("a stack with an empty item", { stack: ["Python", " "] }, "stack");
  rejects("a stack with a duplicate", { stack: ["Python", "Python"] }, "stack");
  rejects("an empty role", { role: "" }, "role");
  rejects("a venue over 120 characters", { venue: "V".repeat(121) }, "venue");
  rejects('a string "published"', { published: "true" }, "published");
  rejects('a string "featured"', { featured: "yes" }, "featured");
  rejects("order 0", { order: { raw: "0" } }, "order");
  rejects("a negative order", { order: { raw: "-1" } }, "order");
  rejects("a fractional order", { order: { raw: "1.5" } }, "order");
  rejects("a quoted order", { order: "1" }, "order");
  rejects(
    "a research entry without the limitations section",
    {},
    "body",
    BUILD_BODY
  );
  rejects(
    "a proof-of-concept entry without the limitations section",
    { type: "proof-of-concept", status: "Proof of concept" },
    "body",
    BUILD_BODY
  );
  for (const section of ["Problem", "Approach", "Evidence"]) {
    rejects(
      `a build entry without "## ${section}"`,
      { type: "build", status: "Live" },
      "body",
      BUILD_BODY.replace(`## ${section}`, `### ${section}`)
    );
  }
  rejects(
    "a limitations heading that exists only inside a code fence",
    {},
    "body",
    BUILD_BODY + "\n```md\n## What it doesn't show\n```\n"
  );
  rejects("an unresolved [CHECK: marker", {}, "body", FULL_BODY + "\nSome claim [CHECK: source].\n");
  rejects(
    "a [CHECK: marker on a line that also has inline code",
    {},
    "body",
    FULL_BODY + "\nThe `parse` step [CHECK: confirm].\n"
  );
  const checkInCode = parseError(
    "valid-project.md",
    fixture({}, FULL_BODY + "\nPublishing is blocked while any `[CHECK:` marker is left.\n\n```\n[CHECK: example]\n```\n")
  );
  assert(checkInCode === null, "[CHECK: inside inline code or a code fence is a mention, not a marker");
  const lineMessage = parseError("valid-project.md", fixture({}, "Line one.\n[CHECK: x]\n" + FULL_BODY));
  assert(lineMessage?.includes("body line 3"), "[CHECK: error reports the body line number");

  const jsMessage = parseError("valid-project.md", "---js\n({ title: 'x' })\n---\nBody");
  assert(
    jsMessage !== null && jsMessage.includes('"valid-project.md"'),
    "JavaScript front matter is refused with a message naming the file"
  );

  const pure = validateProject("valid-project", { ...BASE, extra: 1 }, FULL_BODY);
  assert(
    pure.success === false && pure.field === "extra",
    "validateProject is pure and reports the failing field"
  );

  // 3. Drafts are excluded
  assert(
    parseProjectFile("valid-project.md", fixture({ published: false })) === null,
    "published: false returns null (excluded)"
  );
  rejects("an invalid draft (drafts are still validated)", { published: false, type: "essay" }, "type");

  // 4. Sort order
  const p = (slug, fields) => ({
    slug,
    title: slug,
    summary: "",
    type: "research",
    status: "Published",
    date: "2026",
    stack: [],
    links: {},
    featured: false,
    ...fields,
  });
  const unsorted = [
    p("z-plain-old", { date: "2025" }),
    p("feat-no-order-new", { featured: true, date: "2026-11" }),
    p("plain-year", { date: "2026" }),
    p("feat-order-2", { featured: true, order: 2, date: "2024" }),
    p("plain-month", { date: "2026-03" }),
    p("feat-no-order-old", { featured: true, date: "2025-01" }),
    p("feat-order-1", { featured: true, order: 1, date: "2020" }),
    p("b-same-date", { date: "2025" }),
    p("a-same-date", { date: "2025" }),
  ];
  const sorted = [...unsorted].sort(compareProjects).map((x) => x.slug);
  const expected = [
    "feat-order-1",
    "feat-order-2",
    "feat-no-order-new",
    "feat-no-order-old",
    "plain-month",
    "plain-year",
    "a-same-date",
    "b-same-date",
    "z-plain-old",
  ];
  assert(
    JSON.stringify(sorted) === JSON.stringify(expected),
    `Sort: featured, then order asc, then no order, then date desc ("2026-03" before "2026"), then title (got ${sorted.join(", ")})`
  );

  // 5. Dead internal post links are dropped with a warning, never thrown
  const warnings = [];
  const linked = [
    p("live-link", { links: { post: "/blog/exists", repo: "https://github.com/a/b" } }),
    p("dead-link", { links: { post: "/blog/gone", repo: "https://github.com/a/b" } }),
    p("external-link", { links: { post: "https://medium.com/x" } }),
  ];
  const resolved = dropDeadPostLinks(linked, new Set(["exists"]), (m) => warnings.push(m));
  assert(resolved[0].links.post === "/blog/exists", "Post link to a published post is kept");
  assert(
    resolved[1].links.post === undefined && resolved[1].links.repo === "https://github.com/a/b",
    "Post link to a missing or unpublished post is dropped; other links stay"
  );
  assert(resolved[2].links.post === "https://medium.com/x", "https post links are never dropped");
  assert(
    warnings.length === 1 && warnings[0].includes('"dead-link"') && warnings[0].includes("/blog/gone"),
    "Exactly one warning, naming the project and the post"
  );
  assert(linked[1].links.post === "/blog/gone", "dropDeadPostLinks does not mutate its input");

  // 6. Real content
  const files = readdirSync("content/projects").filter((f) => f.endsWith(".md"));
  const realWarnings = [];
  const originalWarn = console.warn;
  console.warn = (m) => realWarnings.push(m);
  let projects;
  try {
    projects = getAllProjects();
  } finally {
    console.warn = originalWarn;
  }
  assert(files.length === 5 && projects.length === 5, `All 5 project files load and are published (${projects.length})`);
  assert(realWarnings.length === 0, `No dead post links in real content (${realWarnings.length} warnings)`);
  const order = projects.map((x) => x.slug);
  const expectedOrder = [
    "gtv-feedback-agents",
    "blog-platform",
    "enquiry-triage",
    "adversarial-causal-deliberation",
    "causalagentbench",
  ];
  assert(
    JSON.stringify(order) === JSON.stringify(expectedOrder),
    `Real order is ${expectedOrder.join(", ")} (got ${order.join(", ")})`
  );
  assert(new Set(order).size === order.length, "Project slugs are unique");

  const postSlugs = new Set(getAllPosts().map((x) => x.slug));
  assert(
    projects.every((x) => !x.links.post || !x.links.post.startsWith("/blog/") || postSlugs.has(x.links.post.slice(6))),
    "Every internal post link resolves to a published post"
  );
  assert(
    projects.filter((x) => x.type !== "build").every((x) => /^## What it doesn't show$/m.test(x.content)),
    "Every research and proof-of-concept entry has its limitations section"
  );
  assert(
    projects.every((x) => Object.values(x.links).every((l) => !/\.pdf(\?|#|$)/i.test(l))),
    "No project links to a PDF"
  );
  assert(getProjectBySlug("blog-platform")?.content.includes("## Evidence"), "getProjectBySlug returns content");
  assert(getProjectBySlug("no-such-project") === null, "getProjectBySlug returns null for an unknown slug");
  assert(getProjectBySlug("../posts/ai-build-playbook-part-1") === null, "getProjectBySlug never resolves a path");

  // 7. CV
  const cv = getCv();
  assert(cv.name === "Chinomso Okere" && cv.location === "Scotland, UK", "content/cv.md parses (name, location)");
  assert(cv.content.includes("## Experience"), "CV body is returned");
  assert(
    cv.email.href === siteConfig.links.email && cv.email.label === siteConfig.links.email.replace(/^mailto:/, ""),
    "CV email comes from siteConfig.links.email (href as stored, label without mailto:)"
  );
  assert(cv.linkedin.href === siteConfig.links.linkedin, "CV LinkedIn comes from siteConfig.links.linkedin");
  assert(cv.website.href === siteConfig.url, "CV website comes from siteConfig.url");
  const cvRaw = readFileSync("content/cv.md", "utf-8");
  assert(!/@/.test(cvRaw), "content/cv.md contains no email address (no @ at all)");

  const cvFixture = (front, body = "## Profile\n\nText.\n") =>
    `---\n${front}\n---\n\n${body}`;
  const okFront = 'name: "N"\nheadline: "H"\nlocation: "Scotland, UK"';
  const cvRejects = (label, raw, field) => {
    let message = null;
    try {
      parseCvFile(raw);
    } catch (err) {
      message = err.message;
    }
    assert(
      message !== null && message.includes('"content/cv.md"') && message.includes(`(${field})`),
      `CV rejects ${label} (error names "${field}")`
    );
  };
  assert(parseCvFile(cvFixture(okFront)).name === "N", "Minimal valid CV fixture parses");
  cvRejects("an email field", cvFixture(`${okFront}\nemail: "a@b.com"`), "email");
  cvRejects("a linkedin field", cvFixture(`${okFront}\nlinkedin: "https://linkedin.com/in/x"`), "linkedin");
  cvRejects("a website field", cvFixture(`${okFront}\nwebsite: "https://example.com"`), "website");
  cvRejects("a missing headline", cvFixture('name: "N"\nlocation: "L"'), "headline");
  cvRejects("an email address in the body", cvFixture(okFront, "Contact me at someone@example.com."), "body");
  for (const phone of ["+44 7700 900123", "07700 900123", "0131 496 0000", "+447700900123"]) {
    cvRejects(`phone number "${phone}" in the body`, cvFixture(okFront, `Call ${phone} today.`), "body");
  }
  cvRejects("a phone number in the location", cvFixture('name: "N"\nheadline: "H"\nlocation: "07700 900123"'), "location");
  cvRejects("a UK postcode in the body", cvFixture(okFront, "Lives at 1 High Street, EH1 1YZ."), "body");
  for (const safe of ["150+ requirements", "pp. 367–372", "Aug 2018 – Aug 2020", "doi.org/10.1109/AAIML67890.2026.11498196", "2011 – 2016"]) {
    assert(validateCv({ name: "N", headline: "H", location: "L" }, safe).success, `CV check does not flag "${safe}"`);
  }

  // 8. Case-study page helpers (Phase 2)
  const three = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  const first = adjacentProjects(three, "a");
  const middle = adjacentProjects(three, "b");
  const last = adjacentProjects(three, "c");
  assert(first.prev === null && first.next?.slug === "b", "adjacentProjects: first has no previous (no wrap-around)");
  assert(middle.prev?.slug === "a" && middle.next?.slug === "c", "adjacentProjects: middle has both");
  assert(last.prev?.slug === "b" && last.next === null, "adjacentProjects: last has no next (no wrap-around)");
  const unknown = adjacentProjects(three, "zz");
  assert(unknown.prev === null && unknown.next === null, "adjacentProjects: unknown slug has neither");
  const realPager = adjacentProjects(projects, "blog-platform");
  assert(
    realPager.prev?.slug === "gtv-feedback-agents" && realPager.next?.slug === "enquiry-triage",
    "adjacentProjects follows the real display order"
  );

  assert(formatProjectDate("2026") === "2026", 'formatProjectDate("2026") is "2026"');
  assert(formatProjectDate("2026-11") === "November 2026", 'formatProjectDate("2026-11") is "November 2026"');
  assert(formatProjectDate("2026-01") === "January 2026", 'formatProjectDate("2026-01") is "January 2026"');

  assert(
    projectCard({ type: "research", title: "T" }).label === "Research" &&
      projectCard({ type: "build", title: "T" }).label === "Build" &&
      projectCard({ type: "proof-of-concept", title: "T" }).label === "Proof of concept",
    "Project social card label is the type label"
  );
  assert(
    cardVersion(projectCard({ type: "research", title: "T" })) !==
      cardVersion(projectCard({ type: "build", title: "T" })),
    "Changing a project's type changes its card version"
  );
  assert(Object.keys(TYPE_LABELS).length === 3, "Every type has a label");
  assert(
    kickerStatus("proof-of-concept", "Proof of concept") === null &&
      kickerStatus("research", "Published") === "Published" &&
      kickerStatus("build", "Live") === "Live" &&
      kickerStatus("research", "Accepted") === "Accepted",
    "Kicker hides the status only when it repeats the type label"
  );
  assert(
    projectTitleTransition("x") === "project-title-x" && projectCoverTransition("x") === "project-cover-x",
    "View-transition names are stable per slug"
  );

  // 9. Case-study rendering of the real entries
  for (const project of projects) {
    const html = await renderMarkdown(project.content, {
      caseStudy: { panelHeading: LIMITATIONS_SECTION },
    });
    const sections = (html.match(/<section class="cs-sec[^"]*" data-reveal="">/g) || []).length;
    const panels = (html.match(/class="cs-sec cs-sec--limits"/g) || []).length;
    const panelIsLimits = /<section class="cs-sec cs-sec--limits"[^>]*><h2 id="what-it-doesn-t-show"/.test(html);
    assert(
      sections === 4 && panels === 1 && panelIsLimits,
      `${project.slug}: 4 sections, the limitations one rendered as the panel`
    );
    assert(!/class="lead"|data-dropcap/.test(html), `${project.slug}: no lead paragraph or drop cap`);
    assert(!/href="[^"]*\.pdf(?:[?#][^"]*)?"/i.test(html), `${project.slug}: no PDF linked in the body`);
  }

  const panelOnly = await renderMarkdown("## Problem\n\nP.\n\n## Evidence\n\nE.\n", {
    caseStudy: { panelHeading: LIMITATIONS_SECTION },
  });
  assert(!/cs-sec--limits/.test(panelOnly), "No panel class when there is no limitations section");
  const preamble = await renderMarkdown("Intro before any heading.\n\n## Problem\n\nP.\n", {
    caseStudy: { panelHeading: LIMITATIONS_SECTION },
  });
  assert(
    /^<p>Intro before any heading.<\/p>/.test(preamble.trim()) && /<section class="cs-sec"/.test(preamble),
    "Content before the first H2 stays outside any section, and is not a lead"
  );

  // 10. Portfolio index helpers (Phase 3)
  assert(FILTER_THRESHOLD === 6, "Filter threshold is 6");
  assert(!showFilters(5) && !showFilters(6) && showFilters(7), "Filters show only above 6 entries (5 and 6 hidden, 7 shown)");
  assert(!showFilters(projects.length), `Filters hidden for the real ${projects.length} entries`);
  const mixed = [
    { slug: "r1", type: "research" },
    { slug: "b1", type: "build" },
    { slug: "r2", type: "research" },
    { slug: "p1", type: "proof-of-concept" },
  ];
  assert(filterProjects(mixed, "all").length === 4, 'filterProjects "all" keeps everything');
  assert(
    JSON.stringify(filterProjects(mixed, "research").map((x) => x.slug)) === '["r1","r2"]',
    "filterProjects keeps one type, in display order"
  );
  assert(filterProjects(mixed, "build").length === 1 && filterProjects([], "build").length === 0, "filterProjects: one build, empty list stays empty");

  const summary = toSummary(projects[0]);
  assert(!("content" in summary) && summary.slug === projects[0].slug && "content" in projects[0], "toSummary drops the body without touching the project");

  const skills = getCvSkills();
  assert(
    JSON.stringify(skills.map((g) => g.heading)) === '["Business and delivery","AI and research","Tools"]',
    `Capabilities come from the CV Skills section (${skills.map((g) => g.heading).join(", ")})`
  );
  assert(skills[2]?.text === "Python, APIs, n8n, Make.com.", "Skills text is verbatim from the CV");
  assert(
    parseCvSkills("## Skills\n\n**A:** x, y.\nnot a skill line\n\n## Other\n\n**B:** z.").length === 1,
    "Skills parser stops at the next H2 and skips other lines"
  );
  assert(parseCvSkills("## Profile\n\n**A:** x.").length === 0, "No Skills section gives no groups");

  assert(
    PORTFOLIO_HERO.eyebrow === "Portfolio" &&
      PORTFOLIO_HERO.line1 === "Work that shows" &&
      PORTFOLIO_HERO.line2 === "the answer is right." &&
      PORTFOLIO_HERO.lede ===
        "I focus on making digital and AI services trustworthy, measurable and useful to the people who rely on them.",
    "Portfolio hero copy is exactly the approved wording"
  );
  assert(
    sectionPages.portfolio.path === "/portfolio" &&
      sectionPages.portfolio.description ===
        "Case studies by Chinomso Okere: research, builds and proofs of concept, each with its evidence and what it doesn't show.",
    "Portfolio page metadata is the approved description"
  );
  assert(sectionCard("portfolio").title === "Portfolio", "Portfolio gets a branded section card");
  assert(CV_PATH === "/cv" && sectionPages.cv.path === "/cv", `CV_PATH is "/cv" now the page exists (${CV_PATH})`);
  assert(
    sectionPages.cv.description === "CV of Chinomso Okere: MBCS, business analyst and applied AI researcher in Scotland, UK." &&
      sectionCard("cv").title === "CV",
    "CV metadata is the approved description, with a branded card"
  );

  // 11. Lead card layout (Phase 4)
  const layout = (count) =>
    Array.from({ length: count }, (_, i) => {
      const { lead, secondInRow } = cardLayout(count, i);
      return lead ? "L" : secondInRow ? "2" : "1";
    }).join("");
  assert(layout(1) === "L", "1 card: a lone lead");
  assert(layout(2) === "12", "2 cards: one pair");
  assert(layout(5) === "L1212", "5 cards: lead, then two pairs");
  assert(layout(6) === "121212", "6 cards: three pairs, no lead");
  assert(layout(7) === "L121212", "7 cards: lead, then three pairs");
  const research = filterProjects(mixed, "research");
  assert(layout(research.length) === "12" && layout(mixed.length) === "1212", "Filtered counts drive the layout (4 -> pairs, 2 research -> pair)");
  assert(layout(filterProjects(mixed, "build").length) === "L", "A filter leaving 1 card makes it the lead");

  // 12. CV sections and experience (Phase 4)
  const cvSections = parseCvSections(getCv().content);
  assert(
    JSON.stringify(cvSections.map((s) => s.heading)) ===
      JSON.stringify(["Profile", "Selected contributions", "Experience", "Research and publications", "Education", "Professional memberships and development", "Skills"]),
    `CV sections in order (${cvSections.map((s) => s.heading).join(", ")})`
  );
  const roles = parseExperience(cvSections.find((s) => s.heading === "Experience").body);
  assert(roles.length === 5, `5 roles parsed (${roles.length})`);
  assert(
    roles[0].role === "Review Officer (HEO)" && roles[0].org === "UK Civil Service" && roles[0].dates === "Jan 2026 – present",
    "First role split into role, organisation and dates"
  );
  assert(roles.every((r) => r.body.startsWith("- ")), "Every role keeps its bullets");
  for (const bad of ["### Analyst · Somewhere", "### Analyst · Org · 2020 · extra", "### Analyst ·  · 2020"]) {
    let message = null;
    try {
      parseExperience(`${bad}\n- did things`);
    } catch (err) {
      message = err.message;
    }
    assert(message?.includes('"content/cv.md" (Experience)') && message.includes(bad.slice(4)), `Strict role heading rejects "${bad.slice(4)}"`);
  }
  const research2 = cvSections.find((s) => s.heading === "Research and publications").body;
  assert(!/\.pdf/i.test(getCv().content), "CV links no PDF");
  const pubHtml = await renderMarkdown(research2, { lead: false, externalLinksNewTab: true });
  const pubLinks = pubHtml.match(/<a [^>]*>/g) || [];
  assert(
    pubLinks.length === 1 &&
      /href="https:\/\/doi\.org\/10\.1109\/AAIML67890\.2026\.11498196"/.test(pubLinks[0]) &&
      /target="_blank"/.test(pubLinks[0]) &&
      /rel="noopener noreferrer"/.test(pubLinks[0]) &&
      pubHtml.includes('<span class="sr-only"> (opens in new tab)</span>'),
    "Publications: only the DOI is a link, opening in a new tab with hidden text"
  );
  assert(!/class="lead"|data-dropcap/.test(pubHtml), "CV sections render without lead or drop cap");
  assert(siteConfig.links.portfolio === "/portfolio", "Header Portfolio link is internal (/portfolio)");

  console.log("");
  if (failed) {
    console.error("SOME PROJECT & CV TESTS FAILED.");
    process.exit(1);
  }
  console.log("ALL PROJECT & CV CONTENT MODEL TESTS PASSED!");
}

runTests();
