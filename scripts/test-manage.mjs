import {
  listPosts,
  getPost,
  togglePublishPost,
  deletePost,
  PostNotFoundError,
} from "../lib/manage.ts";
import { PublishValidationError } from "../lib/publish.ts";
import { mapGitHubError, GitHubApiError } from "../lib/github.ts";

async function runTests() {
  console.log("=== RUNNING POST MANAGEMENT & ADMIN API TESTS ===\n");

  let failed = false;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed = true;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  const dummyToken = "ghp_SecretTokenManage1234567890";
  const dummyEnv = {
    token: dummyToken,
    owner: "testowner",
    repo: "testrepo",
    branch: "main",
  };

  // 1. List ignores .gitkeep and non-.md files, survives bad front-matter and invalid slug filename
  const mockDirectoryItems = [
    { name: ".gitkeep", path: "content/posts/.gitkeep", sha: "sha_gitkeep", type: "file" },
    { name: "config.json", path: "content/posts/config.json", sha: "sha_json", type: "file" },
    { name: "subfolder", path: "content/posts/subfolder", sha: "sha_dir", type: "dir" },
    { name: "post-one.md", path: "content/posts/post-one.md", sha: "sha_1", type: "file" },
    { name: "post-two.md", path: "content/posts/post-two.md", sha: "sha_2", type: "file" },
    { name: "corrupt-file.md", path: "content/posts/corrupt-file.md", sha: "sha_corrupt", type: "file" },
    { name: "network-error.md", path: "content/posts/network-error.md", sha: "sha_net", type: "file" },
    { name: "BAD_SLUG_NAME!.md", path: "content/posts/BAD_SLUG_NAME!.md", sha: "sha_badslug", type: "file" },
  ];

  const mockFileContents = {
    "content/posts/post-one.md": `---
title: "Post One"
slug: "post-one"
date: "2026-11-01"
description: "Description one"
tags: ["AI Evaluation"]
published: true
---

Body one`,
    "content/posts/post-two.md": `---
title: "Post Two"
slug: "post-two"
date: "2026-11-03"
description: "Description two"
tags: ["Agent Architectures"]
published: false
---

Body two`,
    "content/posts/corrupt-file.md": `---
title: "Broken YAML
date: [impossible
---
Unclosed front matter`,
  };

  const listMockFetch = async (url) => {
    // Directory listing
    if (url.includes("/contents/content/posts?")) {
      return new Response(JSON.stringify(mockDirectoryItems), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("network-error.md")) {
      return new Response("Internal Server Error", { status: 500 });
    }

    // Individual file fetches
    for (const [filePath, content] of Object.entries(mockFileContents)) {
      if (url.includes(filePath)) {
        const base64 = Buffer.from(content, "utf-8").toString("base64");
        return new Response(
          JSON.stringify({
            sha: "sha_" + filePath,
            content: base64,
            encoding: "base64",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("{}", { status: 404 });
  };

  const listResult = await listPosts(dummyEnv, { customFetch: listMockFetch });

  assert(
    !listResult.posts.some((p) => p.filename === ".gitkeep"),
    "listPosts strictly ignores .gitkeep"
  );
  assert(
    !listResult.posts.some((p) => p.filename === "config.json"),
    "listPosts strictly ignores non-.md files"
  );
  assert(
    !listResult.posts.some((p) => p.filename === "subfolder"),
    "listPosts strictly ignores subdirectories"
  );

  const corruptPost = listResult.posts.find((p) => p.filename === "corrupt-file.md");
  assert(
    corruptPost &&
      corruptPost.invalid === true &&
      corruptPost.hasValidSlug === true &&
      corruptPost.note === "Fix or remove this file on GitHub.",
    "listPosts survives bad front-matter file and marks it Invalid with note"
  );

  const badSlugPost = listResult.posts.find((p) => p.filename === "BAD_SLUG_NAME!.md");
  assert(
    badSlugPost &&
      badSlugPost.invalid === true &&
      badSlugPost.hasValidSlug === false &&
      badSlugPost.note === "Fix or remove this file on GitHub.",
    "listPosts marks invalid slug filename as Invalid with hasValidSlug: false"
  );

  const netErrorPost = listResult.posts.find((p) => p.filename === "network-error.md");
  assert(
    netErrorPost &&
      netErrorPost.loadError === true &&
      netErrorPost.invalid === false &&
      netErrorPost.note === "Could not load. Refresh to retry." &&
      netErrorPost.hasValidSlug === true,
    "listPosts marks network/fetch error as loadError: true, NOT invalid"
  );

  const postTwo = listResult.posts.find((p) => p.slug === "post-two");
  const postOne = listResult.posts.find((p) => p.slug === "post-one");
  assert(
    postTwo && postOne && listResult.posts.indexOf(postTwo) < listResult.posts.indexOf(postOne),
    "listPosts sorts posts newest first by date"
  );

  // 2. 100 posts cap
  const hundredPlusItems = Array.from({ length: 110 }, (_, i) => ({
    name: `post-${String(i).padStart(3, "0")}.md`,
    path: `content/posts/post-${String(i).padStart(3, "0")}.md`,
    sha: `sha_${i}`,
    type: "file",
  }));

  const capMockFetch = async (url) => {
    if (url.includes("/contents/content/posts?")) {
      return new Response(JSON.stringify(hundredPlusItems), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const sample = `---\ntitle: "Post"\ndate: "2026-11-01"\npublished: true\n---\nBody`;
    const base64 = Buffer.from(sample, "utf-8").toString("base64");
    return new Response(
      JSON.stringify({ sha: "sha", content: base64 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const capResult = await listPosts(dummyEnv, { customFetch: capMockFetch });
  assert(
    capResult.totalCount === 110 && capResult.posts.length === 100,
    "listPosts processes only first 100 posts and preserves totalCount of 110"
  );

  // 3. Traversal and invalid slugs rejected with no fetch called
  let fetchCalls = 0;
  const noCallFetch = async () => {
    fetchCalls++;
    return new Response("{}", { status: 200 });
  };

  for (const badSlug of ["../evil", "a/b", "A_b", "invalid slug!"]) {
    let getRejected = false;
    try {
      await getPost(badSlug, dummyEnv, { customFetch: noCallFetch });
    } catch (err) {
      if (err instanceof PublishValidationError) getRejected = true;
    }

    let toggleRejected = false;
    try {
      await togglePublishPost({ slug: badSlug, published: true }, dummyEnv, { customFetch: noCallFetch });
    } catch (err) {
      if (err instanceof PublishValidationError) toggleRejected = true;
    }

    let deleteRejected = false;
    try {
      await deletePost({ slug: badSlug }, dummyEnv, { customFetch: noCallFetch });
    } catch (err) {
      if (err instanceof PublishValidationError) deleteRejected = true;
    }

    assert(
      getRejected && toggleRejected && deleteRejected,
      `Traversal/invalid slug "${badSlug}" rejected across all operations with PublishValidationError`
    );
  }
  assert(fetchCalls === 0, "No network request made for traversal slugs");

  // 4. Delete fetches file SHA and title itself, sends DELETE with SHA and title
  let deleteGetCalled = false;
  let deleteSentPayload = null;
  const mockDeleteFetch = async (url, options) => {
    if (options?.method === "GET") {
      deleteGetCalled = true;
      const content = Buffer.from(
        `---\ntitle: "Delete Me Title"\nslug: "delete-target"\ndate: "2026-11-04"\npublished: true\n---\nBody`,
        "utf-8"
      ).toString("base64");
      return new Response(
        JSON.stringify({
          sha: "current_sha_to_delete_555",
          content,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (options?.method === "DELETE") {
      deleteSentPayload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({ commit: { sha: "commit_delete_sha_666" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  const deleteResult = await deletePost(
    { slug: "delete-target" },
    dummyEnv,
    { customFetch: mockDeleteFetch }
  );

  assert(
    deleteGetCalled &&
      deleteSentPayload?.sha === "current_sha_to_delete_555" &&
      deleteSentPayload?.message === "Delete: Delete Me Title" &&
      deleteResult.commitSha === "commit_delete_sha_666",
    "deletePost fetches current SHA and title server-side and sends correct commit message"
  );

  // Missing file on delete throws PostNotFoundError
  let deleteMissingError = null;
  try {
    await deletePost(
      { slug: "nonexistent-post" },
      dummyEnv,
      { customFetch: async () => new Response("{}", { status: 404 }) }
    );
  } catch (err) {
    deleteMissingError = err;
  }
  assert(
    deleteMissingError instanceof PostNotFoundError,
    "deletePost on nonexistent file throws PostNotFoundError"
  );

  // 5. Publish / Unpublish (PATCH) validations & exact body round-trip
  // 5a. Rejects non-boolean published
  let nonBoolError = null;
  try {
    await togglePublishPost(
      // @ts-expect-error test runtime validation
      { slug: "post-one", published: "true" },
      dummyEnv,
      { customFetch: noCallFetch }
    );
  } catch (err) {
    nonBoolError = err;
  }
  assert(
    nonBoolError instanceof PublishValidationError &&
      nonBoolError.message === "Field 'published' must be a boolean.",
    "togglePublishPost rejects non-boolean published with 400 validation error"
  );

  // 5b. Refuses post with disallowed tag (does not silently strip it)
  const disallowedTagPost = `---\ntitle: "Post With Bad Tag"\nslug: "bad-tag-post"\ndate: "2026-11-04"\ndescription: "Desc"\ntags: ["Disallowed Tag"]\npublished: false\n---\nBody`;
  let disallowedTagError = null;
  let putCalledForBadTag = false;
  const mockBadTagFetch = async (url, options) => {
    if (options?.method === "GET") {
      const base64 = Buffer.from(disallowedTagPost, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({ sha: "sha_bad_tag", content: base64 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (options?.method === "PUT") {
      putCalledForBadTag = true;
    }
    return new Response("{}", { status: 200 });
  };

  try {
    await togglePublishPost(
      { slug: "bad-tag-post", published: true },
      dummyEnv,
      { customFetch: mockBadTagFetch }
    );
  } catch (err) {
    disallowedTagError = err;
  }
  assert(
    disallowedTagError instanceof PublishValidationError &&
      disallowedTagError.message.includes("Disallowed Tag") &&
      !putCalledForBadTag,
    "togglePublishPost refuses post with disallowed tag (does not silently strip) and commits nothing"
  );

  // 5c. Refuses post with unresolved [CHECK: marker
  const checkMarkerPost = `---\ntitle: "Post With Check"\nslug: "check-post"\ndate: "2026-11-04"\ndescription: "Desc"\ntags: ["AI Evaluation"]\npublished: false\n---\nBody with [CHECK: verify citation] marker.`;
  let checkMarkerError = null;
  let putCalledForCheck = false;
  const mockCheckFetch = async (url, options) => {
    if (options?.method === "GET") {
      const base64 = Buffer.from(checkMarkerPost, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({ sha: "sha_check", content: base64 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (options?.method === "PUT") {
      putCalledForCheck = true;
    }
    return new Response("{}", { status: 200 });
  };

  try {
    await togglePublishPost(
      { slug: "check-post", published: true },
      dummyEnv,
      { customFetch: mockCheckFetch }
    );
  } catch (err) {
    checkMarkerError = err;
  }
  assert(
    checkMarkerError instanceof PublishValidationError &&
      checkMarkerError.message.includes("[CHECK:") &&
      !putCalledForCheck,
    "togglePublishPost refuses post with unresolved [CHECK: marker and commits nothing"
  );

  // 5d. Successful unpublish round-trips body exactly and flips ONLY published flag
  const originalBody = `First paragraph with em dash — and accented characters like résumé.

\`\`\`python
def calculate_score(prompt: str) -> float:
    return 1.0
\`\`\`

- Bullet item 1
- Bullet item 2`;

  const validLivePost = `---
title: "Valid Live Post"
slug: "valid-live-post"
date: "2026-11-04"
description: "A summary sentence."
tags: ["AI Evaluation"]
coverImage: "https://example.com/cover.jpg"
coverImageAlt: "Cover description"
originalUrl: "https://example.com/original"
published: true
---

${originalBody}`;

  let capturedPutPayload = null;
  const mockToggleFetch = async (url, options) => {
    if (options?.method === "GET") {
      const base64 = Buffer.from(validLivePost, "utf-8").toString("base64");
      return new Response(
        JSON.stringify({ sha: "sha_live_123", content: base64 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (options?.method === "PUT") {
      capturedPutPayload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          commit: { sha: "new_commit_sha_toggle" },
          content: { sha: "new_content_sha_toggle" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };

  const unpublishResult = await togglePublishPost(
    { slug: "valid-live-post", published: false },
    dummyEnv,
    { customFetch: mockToggleFetch }
  );

  const decodedCommittedContent = Buffer.from(
    capturedPutPayload.content,
    "base64"
  ).toString("utf-8");

  assert(
    unpublishResult.published === false &&
      capturedPutPayload.message === "Unpublish: Valid Live Post" &&
      capturedPutPayload.sha === "sha_live_123",
    "togglePublishPost commits unpublish with 'Unpublish: <title>' and existing SHA"
  );

  assert(
    decodedCommittedContent.includes("published: false") &&
      decodedCommittedContent.includes(originalBody) &&
      decodedCommittedContent.includes("—") &&
      decodedCommittedContent.includes("résumé"),
    "togglePublishPost round-trips body exactly and flips only published flag"
  );

  // 6. Token string never appears in mapped GitHubApiError
  for (const status of [401, 403, 404, 409, 422, 429, 500]) {
    const error = mapGitHubError(status, dummyToken);
    assert(
      error instanceof GitHubApiError && !error.message.includes(dummyToken),
      `mapGitHubError(${status}) returns GitHubApiError and never leaks token`
    );
  }

  if (failed) {
    console.error("\nONE OR MORE POST MANAGEMENT TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL POST MANAGEMENT & ADMIN API ASSERTIONS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

