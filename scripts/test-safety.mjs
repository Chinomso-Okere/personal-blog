import { createHash } from "node:crypto";
import {
  renderMarkdown,
  renderMarkdownWithHeadings,
  sanitizeSchema,
} from "../lib/markdown.ts";

// Fingerprint of the sanitiser schema as approved (5 Nov 2026). Heading IDs are
// added after sanitising, so this must not change; update it only on purpose.
const SANITIZE_SCHEMA_FINGERPRINT =
  "5decbaff04ee32ce7133d491a986c13cc9f3676529b362c5f0b4b4443bd6d2b3";

function stableSerialize(value) {
  if (value instanceof RegExp) return `re:${value}`;
  if (Array.isArray(value)) return value.map(stableSerialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stableSerialize(value[k])])
    );
  }
  return value;
}

async function runTests() {
  console.log("=== RUNNING SAFETY & CODE FENCE TESTS ===");

  let failed = false;

  // 1. Sanitization of script, onerror, and javascript: URLs
  const maliciousMarkdown = `
# Safety Test

<script>alert(1)</script>

<img src="https://example.com/test.png" onerror="alert(2)" />

<img src="http://insecure.com/test.png" />

[x](javascript:alert(1))

[Safe link](https://example.com)
`;

  const maliciousResult = await renderMarkdown(maliciousMarkdown);
  const hasScript = maliciousResult.includes("<script");
  const hasOnError = maliciousResult.includes("onerror");
  const hasJsHref = maliciousResult.includes("javascript:");

  console.log(`PASS: No <script> tag:                         ${!hasScript}`);
  console.log(`PASS: No onerror handler:                      ${!hasOnError}`);
  console.log(`PASS: No javascript: href:                     ${!hasJsHref}`);

  if (hasScript || hasOnError || hasJsHref) {
    failed = true;
  }

  // 2. Code fence with title="example.py" -> <div class="cap">example.py</div>
  const titledFence = `
\`\`\`python title="example.py"
def hello():
    return "world"
\`\`\`
`;
  const titledResult = await renderMarkdown(titledFence);
  const hasTitledCap = titledResult.includes('<div class="cap">example.py</div>');
  console.log(`PASS: Titled fence has <div class="cap">:       ${hasTitledCap}`);
  if (!hasTitledCap) {
    console.error("FAILED: Expected <div class=\"cap\">example.py</div>, got:\n" + titledResult);
    failed = true;
  }

  // 3. Code fence with no title -> no class="cap"
  const untitledFence = `
\`\`\`python
def hello():
    return "world"
\`\`\`
`;
  const untitledResult = await renderMarkdown(untitledFence);
  const hasNoCap = !untitledResult.includes('class="cap"');
  console.log(`PASS: Untitled fence has no class="cap":       ${hasNoCap}`);
  if (!hasNoCap) {
    console.error("FAILED: Untitled fence should not contain class=\"cap\", got:\n" + untitledResult);
    failed = true;
  }

  // 4. Code fence with hostile title -> escaped in caption, no raw <img
  const hostileTitleFence = `
\`\`\`python title="<img src=x onerror=alert(1)>"
print("secure")
\`\`\`
`;
  const hostileTitleResult = await renderMarkdown(hostileTitleFence);
  const hasEscapedCaption =
    hostileTitleResult.includes('<div class="cap">&#x3C;img src=x onerror=alert(1)></div>') ||
    hostileTitleResult.includes('<div class="cap">&lt;img src=x onerror=alert(1)&gt;</div>');
  const hasNoRawImg = !hostileTitleResult.includes("<img");
  console.log(`PASS: Hostile title escaped in caption:        ${hasEscapedCaption}`);
  console.log(`PASS: Hostile title output contains no "<img": ${hasNoRawImg}`);
  if (!hasEscapedCaption || !hasNoRawImg) {
    console.error("FAILED: Hostile title was not properly escaped, got:\n" + hostileTitleResult);
    failed = true;
  }

  // 5. Heading IDs: strictly [a-z0-9-], de-duplicated, section-N fallback
  const headingMarkdown = `
## <script>

## ???

## <script>alert(1)</script>

## Same heading

## Same heading

## Café déjà vu

## <img src=x onerror=alert(1)> Real words
`;
  const { html: headingHtml, headings } =
    await renderMarkdownWithHeadings(headingMarkdown);
  const ids = headings.map((h) => h.id);
  const expectedIds = [
    "section-1",
    "section-2",
    "alert-1",
    "same-heading",
    "same-heading-2",
    "cafe-deja-vu",
    "real-words",
  ];
  const idsMatch = JSON.stringify(ids) === JSON.stringify(expectedIds);
  const idsStrict = ids.every((id) => /^[a-z0-9-]+$/.test(id));
  const idsUnique = new Set(ids).size === ids.length;
  const htmlIds = [...headingHtml.matchAll(/<h2 id="([^"]*)"/g)].map((m) => m[1]);
  const htmlIdsMatch = JSON.stringify(htmlIds) === JSON.stringify(expectedIds);
  const anchorsMatch = expectedIds.every((id) =>
    headingHtml.includes(`<a class="anchor" href="#${id}"`)
  );
  const headingsSafe =
    !headingHtml.includes("<script") &&
    !headingHtml.includes("onerror") &&
    !headingHtml.includes("<img");
  console.log(`PASS: Heading IDs as expected:                 ${idsMatch}`);
  console.log(`PASS: Heading IDs strictly [a-z0-9-]:          ${idsStrict}`);
  console.log(`PASS: Heading IDs unique:                      ${idsUnique}`);
  console.log(`PASS: Rendered h2 ids match heading list:      ${htmlIdsMatch}`);
  console.log(`PASS: Anchor links point at heading IDs:       ${anchorsMatch}`);
  console.log(`PASS: Hostile heading text stays inert:        ${headingsSafe}`);
  if (!idsMatch || !idsStrict || !idsUnique || !htmlIdsMatch || !anchorsMatch || !headingsSafe) {
    console.error("FAILED: Heading IDs wrong, got:\n" + JSON.stringify(ids) + "\n" + headingHtml);
    failed = true;
  }

  // 6. Sanitiser schema unchanged
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(stableSerialize(sanitizeSchema)))
    .digest("hex");
  const schemaUnchanged = fingerprint === SANITIZE_SCHEMA_FINGERPRINT;
  // The defaults allow only className "sr-only" on h2; no id on any heading,
  // and the user-content- id clobbering stays in force.
  const headingAttrs = [sanitizeSchema.attributes?.h2, sanitizeSchema.attributes?.h3]
    .flat()
    .filter(Boolean)
    .map((a) => (Array.isArray(a) ? a[0] : a));
  const noHeadingIdAllowance =
    !headingAttrs.includes("id") &&
    (sanitizeSchema.clobber || []).includes("id") &&
    sanitizeSchema.clobberPrefix === "user-content-";
  console.log(`PASS: Sanitiser schema fingerprint unchanged:  ${schemaUnchanged}`);
  console.log(`PASS: Schema allows no id on h2/h3:           ${noHeadingIdAllowance}`);
  if (!schemaUnchanged || !noHeadingIdAllowance) {
    console.error("FAILED: Sanitiser schema changed, fingerprint " + fingerprint);
    failed = true;
  }

  // 7. Post rendering unchanged by the case-study option (7 Nov 2026). The hash
  // covers the html and the heading list of a body that exercises the lead,
  // drop cap, h2 numbering and anchors, duplicate ids, pull quote, both fence
  // kinds and an image figure. Update it only on purpose.
  const POST_RENDER_FINGERPRINT =
    "4858d41c4d8ac133c93353f2a991bdbc1e46c61e1300f4828f487c7518c9b1b9";
  const postFixture = [
    "Opening paragraph with **bold**, _emphasis_, `inline code` and a [link](https://example.com).",
    "",
    "## First section",
    "",
    "A paragraph after a heading.",
    "",
    "> A pull quote.",
    "",
    '```ts title="example.ts"',
    "const x: number = 1;",
    "```",
    "",
    "```",
    "untitled fence",
    "```",
    "",
    "![A diagram](/images/example.png)",
    "",
    "## First section",
    "",
    "- one",
    "- two",
    "",
    "### A sub-heading",
    "",
    "1. first",
    "2. second",
    "",
  ].join("\n");
  const postRender = await renderMarkdownWithHeadings(postFixture);
  const postRenderHash = createHash("sha256").update(JSON.stringify(postRender)).digest("hex");
  const postRenderUnchanged = postRenderHash === POST_RENDER_FINGERPRINT;
  const defaultIsPost =
    (await renderMarkdown(postFixture)) === postRender.html &&
    (await renderMarkdown(postFixture, {})) === postRender.html;
  console.log(`PASS: Post rendering fingerprint unchanged:    ${postRenderUnchanged}`);
  console.log(`PASS: Default options render as a post:        ${defaultIsPost}`);
  if (!postRenderUnchanged || !defaultIsPost) {
    console.error("FAILED: Post rendering changed, fingerprint " + postRenderHash);
    failed = true;
  }

  // 8. Case-study render: same sanitiser, sections generated after it
  const caseHtml = await renderMarkdown(
    [
      "## Problem",
      "",
      'First <script>alert("x")</script> paragraph <img src=x onerror="alert(1)">.',
      "",
      "## What it doesn’t show",
      "",
      "Limits.",
    ].join("\n"),
    { caseStudy: { panelHeading: "What it doesn't show" } }
  );
  const caseSafe =
    !/<script/i.test(caseHtml) && !/onerror/i.test(caseHtml) && !/<img[^>]*src="x"/.test(caseHtml);
  const caseNoLead = !/class="lead"/.test(caseHtml) && !/data-dropcap/.test(caseHtml);
  const caseSections =
    (caseHtml.match(/<section class="cs-sec[^"]*" data-reveal="">/g) || []).length === 2 &&
    (caseHtml.match(/cs-sec--limits/g) || []).length === 1;
  console.log(`PASS: Case-study render still sanitised:       ${caseSafe}`);
  console.log(`PASS: Case-study render has no lead/drop cap:  ${caseNoLead}`);
  console.log(`PASS: Case-study sections wrapped, one panel:  ${caseSections}`);
  if (!caseSafe || !caseNoLead || !caseSections) {
    console.error("FAILED: Case-study render wrong:\n" + caseHtml);
    failed = true;
  }

  // 9. CV render options: new-tab links generated after sanitising
  const linkHtml = await renderMarkdown(
    "See [a paper](https://doi.org/10.1/x), [a page](/about) and [js](javascript:alert(1)).",
    { lead: false, externalLinksNewTab: true }
  );
  const externalNewTab =
    /<a href="https:\/\/doi\.org\/10\.1\/x" target="_blank" rel="noopener noreferrer">a paper<span class="sr-only"> \(opens in new tab\)<\/span><\/a>/.test(linkHtml);
  const internalUntouched = /<a href="\/about">a page<\/a>/.test(linkHtml);
  const jsStillStripped = !/javascript:/i.test(linkHtml);
  const noLead = !/class="lead"/.test(linkHtml);
  console.log(`PASS: External links open in new tab safely:  ${externalNewTab}`);
  console.log(`PASS: Internal links left as they are:        ${internalUntouched}`);
  console.log(`PASS: javascript: links still stripped:       ${jsStillStripped}`);
  console.log(`PASS: lead: false renders no lead paragraph:  ${noLead}`);
  if (!externalNewTab || !internalUntouched || !jsStillStripped || !noLead) {
    console.error("FAILED: CV render options wrong:\n" + linkHtml);
    failed = true;
  }

  if (failed) {
    console.error("\nONE OR MORE CHECKS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL SECURITY & FENCE ASSERTIONS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});
