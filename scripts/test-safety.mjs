import { renderMarkdown } from "../lib/markdown.ts";

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
