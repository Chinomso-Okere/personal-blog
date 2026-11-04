import { publishPost, PublishValidationError } from "../lib/publish.ts";
import { mapGitHubError, GitHubApiError } from "../lib/github.ts";

async function runTests() {
  console.log("=== RUNNING PUBLISH FLOW & GITHUB API TESTS ===\n");

  let failed = false;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed = true;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  const dummyToken = "ghp_SecretToken1234567890ABCDEF";
  const dummyEnv = {
    token: dummyToken,
    owner: "testowner",
    repo: "testrepo",
    branch: "main",
  };

  const baseValidFields = {
    title: "Testing Applied AI & Évaluation — Real World Cases",
    slug: "testing-applied-ai-evaluation-real-world-cases",
    date: "2026-11-04",
    description: "An evidence-based assessment of agentic workflows.",
    tags: ["AI Evaluation"],
    body: "First paragraph with an em dash — and accented characters like résumé.\n\nSecond paragraph.",
    published: true,
  };

  // 1. Path traversal and invalid slugs rejected, no fetch called
  let fetchCallCount = 0;
  const trackingFetch = async () => {
    fetchCallCount++;
    return new Response("{}", { status: 200 });
  };

  for (const badSlug of ["../evil", "a/b", "A_b", "invalid slug!"]) {
    let thrownError = null;
    try {
      await publishPost(
        {
          fields: { ...baseValidFields, slug: badSlug },
          env: dummyEnv,
        },
        { customFetch: trackingFetch }
      );
    } catch (err) {
      thrownError = err;
    }
    assert(
      thrownError instanceof PublishValidationError,
      `Invalid/traversal slug "${badSlug}" throws PublishValidationError`
    );
  }
  assert(fetchCallCount === 0, "No network request made for invalid slugs");

  // 2. Input validation failures throw PublishValidationError, no fetch called
  let checkMarkerError = null;
  try {
    await publishPost(
      {
        fields: {
          ...baseValidFields,
          body: "Line 1\n[CHECK: verify this citation]\nLine 3",
        },
        env: dummyEnv,
      },
      { customFetch: trackingFetch }
    );
  } catch (err) {
    checkMarkerError = err;
  }
  assert(
    checkMarkerError instanceof PublishValidationError &&
      checkMarkerError.message.includes("[CHECK:"),
    "Unresolved [CHECK: marker in body throws PublishValidationError"
  );

  let emptyTitleError = null;
  try {
    await publishPost(
      {
        fields: {
          ...baseValidFields,
          title: "",
        },
        env: dummyEnv,
      },
      { customFetch: trackingFetch }
    );
  } catch (err) {
    emptyTitleError = err;
  }
  assert(
    emptyTitleError instanceof PublishValidationError,
    "Empty title in validatePostInput throws PublishValidationError"
  );
  assert(fetchCallCount === 0, "No network request made on validation errors");

  // 3. Existing file without overwrite returns exists: true and makes NO PUT
  let getCalled = false;
  let putCalled = false;
  const mockExistingFetch = async (url, options) => {
    const method = options?.method || "GET";
    if (method === "GET") {
      getCalled = true;
      // Return existing post where published: true
      const existingMarkdown = `---
title: "Existing Post"
slug: "${baseValidFields.slug}"
date: "2026-11-01"
description: "Existing desc"
tags: []
published: true
---

Old body.`;
      const base64 = Buffer.from(existingMarkdown, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({
          sha: "existing_sha_12345",
          content: base64,
          encoding: "base64",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "PUT") {
      putCalled = true;
      return new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: 404 });
  };

  const existsResult = await publishPost(
    {
      fields: baseValidFields,
      overwrite: false,
      env: dummyEnv,
    },
    { customFetch: mockExistingFetch }
  );

  assert(
    existsResult.status === "exists" &&
      existsResult.existingPublished === true &&
      getCalled &&
      !putCalled,
    "Existing post without overwrite returns exists status with existingPublished and makes no PUT"
  );

  // 4. Overwrite sends existing sha and returns wasPublished: true
  let sentPutPayload = null;
  const mockOverwriteFetch = async (url, options) => {
    const method = options?.method || "GET";
    if (method === "GET") {
      const existingMarkdown = `---
title: "Existing Post"
slug: "${baseValidFields.slug}"
date: "2026-11-01"
description: "Existing desc"
tags: []
published: true
---

Old body.`;
      const base64 = Buffer.from(existingMarkdown, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({
          sha: "sha_to_overwrite_999",
          content: base64,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "PUT") {
      sentPutPayload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          commit: { sha: "new_commit_sha_888" },
          content: { sha: "new_content_sha_777" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  const overwriteResult = await publishPost(
    {
      fields: baseValidFields,
      overwrite: true,
      env: dummyEnv,
    },
    { customFetch: mockOverwriteFetch }
  );

  assert(
    overwriteResult.status === "committed" &&
      overwriteResult.overwritten === true &&
      overwriteResult.wasPublished === true &&
      sentPutPayload?.sha === "sha_to_overwrite_999",
    "Overwrite sends existing SHA and returns wasPublished: true"
  );

  // 5. wasPublished is false when existing file had published: false
  const mockDraftToPublishedFetch = async (url, options) => {
    const method = options?.method || "GET";
    if (method === "GET") {
      const draftMarkdown = `---
title: "Draft Post"
slug: "${baseValidFields.slug}"
date: "2026-11-01"
description: "Draft desc"
tags: []
published: false
---

Draft body.`;
      const base64 = Buffer.from(draftMarkdown, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({
          sha: "draft_sha_111",
          content: base64,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "PUT") {
      return new Response(
        JSON.stringify({
          commit: { sha: "commit_sha_222" },
          content: { sha: "content_sha_333" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  const draftToLiveResult = await publishPost(
    {
      fields: { ...baseValidFields, published: true },
      overwrite: true,
      env: dummyEnv,
    },
    { customFetch: mockDraftToPublishedFetch }
  );

  assert(
    draftToLiveResult.status === "committed" &&
      draftToLiveResult.wasPublished === false &&
      draftToLiveResult.published === true,
    "wasPublished is false when updating an existing draft post to published: true"
  );

  // 6. Base64 encoding decodes to exact file text, including UTF-8 characters "é" and "—"
  let putContentBase64 = null;
  const mockPutCaptureFetch = async (url, options) => {
    if (options?.method === "GET") return new Response("{}", { status: 404 });
    if (options?.method === "PUT") {
      const body = JSON.parse(options.body);
      putContentBase64 = body.content;
      return new Response(
        JSON.stringify({
          commit: { sha: "c_sha" },
          content: { sha: "f_sha" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  await publishPost(
    {
      fields: baseValidFields,
      env: dummyEnv,
    },
    { customFetch: mockPutCaptureFetch }
  );

  const decodedContent = Buffer.from(putContentBase64, "base64").toString(
    "utf-8"
  );
  assert(
    decodedContent.includes("Évaluation") &&
      decodedContent.includes("—") &&
      decodedContent.includes("résumé"),
    "PUT body base64 decodes to exact UTF-8 content with accents and em dashes intact"
  );

  // 7. Commit message formatting ("Publish:", "Update:", "Draft:", 72 chars max)
  let capturedMessage = "";
  const mockMsgFetch = async (url, options) => {
    if (options?.method === "GET") return new Response("{}", { status: 404 });
    if (options?.method === "PUT") {
      const body = JSON.parse(options.body);
      capturedMessage = body.message;
      return new Response(
        JSON.stringify({
          commit: { sha: "c_sha" },
          content: { sha: "f_sha" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  // 7a. New published post
  await publishPost(
    {
      fields: { ...baseValidFields, title: "Short Title\nWith Newline" },
      env: dummyEnv,
    },
    { customFetch: mockMsgFetch }
  );
  assert(
    capturedMessage === "Publish: Short Title With Newline",
    "New published post generates 'Publish: <title>' message with newlines stripped"
  );

  // 7b. Draft post
  await publishPost(
    {
      fields: {
        ...baseValidFields,
        published: false,
        title: "X".repeat(100),
      },
      env: dummyEnv,
    },
    { customFetch: mockMsgFetch }
  );
  assert(
    capturedMessage.startsWith("Draft: ") &&
      capturedMessage.length <= 72 + "Draft: ".length,
    "Draft post generates 'Draft: <title>' capped at 72 chars"
  );

  // 8. GitHub error mapping returns GitHubApiError instances and never leaks the token
  for (const status of [401, 403, 404, 409, 422, 429, 500]) {
    const error = mapGitHubError(status, dummyToken);
    assert(
      error instanceof GitHubApiError,
      `mapGitHubError(${status}) returns a GitHubApiError instance`
    );
    assert(
      !error.message.includes(dummyToken),
      `mapGitHubError for status ${status} never contains token`
    );
  }

  // 9. Mocked fetch throwing a generic error propagates as a non-validation, non-GitHub error
  const genericErrorFetch = async () => {
    throw new Error("fetch failed");
  };
  let genericThrown = null;
  try {
    await publishPost(
      { fields: baseValidFields, env: dummyEnv },
      { customFetch: genericErrorFetch }
    );
  } catch (err) {
    genericThrown = err;
  }
  assert(
    genericThrown instanceof Error &&
      !(genericThrown instanceof PublishValidationError) &&
      !(genericThrown instanceof GitHubApiError) &&
      genericThrown.message === "fetch failed",
    "Mocked fetch throwing generic error propagates as non-validation, non-GitHub error"
  );

  if (failed) {
    console.error("\nONE OR MORE PUBLISH TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL PUBLISH & GITHUB API ASSERTIONS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

