import fs from "fs";
import path from "path";
import {
  validateDraftRequest,
  validateDraftOutput,
  buildUserMessage,
} from "../lib/draft.ts";

async function runTests() {
  console.log("=== RUNNING DRAFT LOGIC & VALIDATION TESTS ===\n");

  let failed = false;

  function assert(condition, message) {
    console.log(`PASS: ${message}: ${condition}`);
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed = true;
    }
  }

  // 1. validateDraftRequest tests
  const badTypeRes = validateDraftRequest({
    sourceType: "invalid-type",
    sourceText: "valid text",
  });
  assert(!badTypeRes.success, "validateDraftRequest rejects invalid sourceType");

  const emptyTextRes = validateDraftRequest({
    sourceType: "topic",
    sourceText: "   ",
  });
  assert(!emptyTextRes.success, "validateDraftRequest rejects empty sourceText");

  const longTextRes = validateDraftRequest({
    sourceType: "topic",
    sourceText: "a".repeat(100_001),
  });
  assert(
    !longTextRes.success,
    "validateDraftRequest rejects over-long sourceText (>100,000 chars)"
  );

  const longRefRes = validateDraftRequest({
    sourceType: "topic",
    sourceText: "valid text",
    sourceRef: "a".repeat(501),
  });
  assert(
    !longRefRes.success,
    "validateDraftRequest rejects over-long sourceRef (>500 chars)"
  );

  const longAngleRes = validateDraftRequest({
    sourceType: "topic",
    sourceText: "valid text",
    angle: "a".repeat(2001),
  });
  assert(
    !longAngleRes.success,
    "validateDraftRequest rejects over-long angle (>2,000 chars)"
  );

  const validReqRes = validateDraftRequest({
    sourceType: "document",
    sourceText: "Here is the paper text.",
    sourceRef: "ICSRS 2026 paper",
    angle: "Focus on causal benchmark handoffs",
  });
  assert(
    validReqRes.success &&
      validReqRes.data.sourceType === "document" &&
      validReqRes.data.sourceRef === "ICSRS 2026 paper",
    "validateDraftRequest accepts a valid request"
  );

  // 2. validateDraftOutput tests
  const validOutputInput = {
    title: "Evaluating Multi-Agent Systems in Practice",
    description: "An evidence-based look at agent evaluation handoffs.",
    tags: [
      "AI Evaluation",
      "Disallowed Tag",
      "AI Evaluation", // Duplicate
      "Multi-Agent Systems",
      "Causal Reasoning",
      "Voice AI", // 4th valid tag, should be dropped (max 3)
    ],
    body: "This is the draft body content.",
  };

  const outputResult = validateDraftOutput(validOutputInput);
  assert(
    outputResult.title === "Evaluating Multi-Agent Systems in Practice" &&
      outputResult.description ===
        "An evidence-based look at agent evaluation handoffs.",
    "validateDraftOutput preserves title and description"
  );
  assert(
    outputResult.tags.length === 3 &&
      outputResult.tags[0] === "AI Evaluation" &&
      outputResult.tags[1] === "Multi-Agent Systems" &&
      outputResult.tags[2] === "Causal Reasoning" &&
      !outputResult.tags.includes("Disallowed Tag"),
    "validateDraftOutput drops disallowed tags, dedupes, and caps at 3"
  );

  // Over-long title and description test (returned unchanged)
  const longTitle = "T".repeat(130);
  const longDesc = "D".repeat(201);
  const longOutput = validateDraftOutput({
    title: longTitle,
    description: longDesc,
    tags: ["AI Evaluation"],
    body: "Body text.",
  });
  assert(
    longOutput.title === longTitle && longOutput.description === longDesc,
    "validateDraftOutput accepts 130-char title and 201-char description unchanged"
  );

  let missingTitleFailed = false;
  try {
    validateDraftOutput({
      title: "",
      description: "valid",
      tags: [],
      body: "valid",
    });
  } catch {
    missingTitleFailed = true;
  }
  assert(missingTitleFailed, "validateDraftOutput rejects missing title");

  let missingBodyFailed = false;
  try {
    validateDraftOutput({
      title: "valid",
      description: "valid",
      tags: [],
      body: "   ",
    });
  } catch {
    missingBodyFailed = true;
  }
  assert(missingBodyFailed, "validateDraftOutput rejects missing body");

  // 3. buildUserMessage tests
  const msgWithOptionals = buildUserMessage({
    sourceType: "transcript",
    sourceText: "Transcript line 1",
    sourceRef: "Speaker Jane",
    angle: "Contrarian angle",
  });
  assert(
    msgWithOptionals.includes("Source type: transcript") &&
      msgWithOptionals.includes("Source reference: Speaker Jane") &&
      msgWithOptionals.includes("My angle: Contrarian angle") &&
      msgWithOptionals.includes("<source>\nTranscript line 1\n</source>"),
    "buildUserMessage formats lines and wraps source in <source> tags"
  );

  const msgMinimal = buildUserMessage({
    sourceType: "topic",
    sourceText: "Minimal topic text",
  });
  assert(
    msgMinimal.includes("Source type: topic") &&
      !msgMinimal.includes("Source reference:") &&
      !msgMinimal.includes("My angle:") &&
      msgMinimal.includes("<source>\nMinimal topic text\n</source>"),
    "buildUserMessage omits optional lines when not provided"
  );

  // 4. content/writing-instructions.md verification
  const instructionsPath = path.join(
    process.cwd(),
    "content",
    "writing-instructions.md"
  );
  const fileExists = fs.existsSync(instructionsPath);
  assert(fileExists, "content/writing-instructions.md exists");

  if (fileExists) {
    const content = fs.readFileSync(instructionsPath, "utf-8");
    assert(
      content.trim().length > 500,
      "content/writing-instructions.md is non-empty and substantial"
    );
    assert(
      content.includes("[CHECK:"),
      "content/writing-instructions.md contains [CHECK: marker requirement"
    );
    assert(
      content.includes("## Guidance by source type"),
      "content/writing-instructions.md contains ## Guidance by source type"
    );
    assert(
      content.includes("### Topic"),
      "content/writing-instructions.md contains ### Topic"
    );
    assert(
      content.includes("### Document"),
      "content/writing-instructions.md contains ### Document"
    );
    assert(
      content.includes("### Transcript"),
      "content/writing-instructions.md contains ### Transcript"
    );
  }

  if (failed) {
    console.error("\nONE OR MORE DRAFT TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL DRAFT & INSTRUCTION ASSERTIONS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

