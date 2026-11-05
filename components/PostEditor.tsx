"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ALLOWED_TAGS } from "@/lib/tags";
import {
  generateSlug,
  validatePostInput,
  buildPostFile,
  type PostInputFields,
} from "@/lib/post-input";
import { calculateReadingTime } from "@/lib/reading-time";
import { formatDate } from "@/lib/format";

interface PostEditorProps {
  editSlug?: string;
}

export function PostEditor({ editSlug }: PostEditorProps = {}) {
  const isEditMode = Boolean(editSlug);
  const [loadingPost, setLoadingPost] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wasInitiallyPublished, setWasInitiallyPublished] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState(editSlug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [date, setDate] = useState("");

  // Set default date to local calendar date on mount (only for new posts)
  useEffect(() => {
    if (isEditMode) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(`${y}-${m}-${d}`);
  }, [isEditMode]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);

  // Paste box
  const [pasteText, setPasteText] = useState("");
  const [parsingPaste, setParsingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [lastPreviewedFields, setLastPreviewedFields] = useState<string | null>(null);

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    stage:
      | "idle"
      | "committing"
      | "committed"
      | "polling"
      | "live"
      | "timed_out"
      | "saved_draft"
      | "updated_live";
    message: string;
    link?: string;
  }>({ stage: "idle", message: "" });
  const [publishError, setPublishError] = useState<string | null>(null);

  // Overwrite confirmation dialog state
  const [overwriteConfirm, setOverwriteConfirm] = useState<{
    slug: string;
    existingPublished: boolean;
  } | null>(null);

  // Snapshot to clear dirty flag on commit
  const [lastCommittedSerialized, setLastCommittedSerialized] = useState<string | null>(null);

  // Polling interval ref and cleanup
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearPollInterval() {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      clearPollInterval();
    };
  }, []);

  // Fetch existing post in edit mode
  useEffect(() => {
    if (!editSlug) return;
    const targetSlug = editSlug;
    let active = true;

    async function fetchPost() {
      setLoadingPost(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(targetSlug)}`);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (active) setLoadError(data?.error || "Failed to load post.");
          return;
        }

        if (active && data?.fields) {
          const f = data.fields;
          setTitle(f.title || "");
          setSlug(f.slug || editSlug);
          setDate(f.date || "");
          setDescription(f.description || "");
          setTags(Array.isArray(f.tags) ? f.tags : []);
          setCoverImage(f.coverImage || "");
          setCoverImageAlt(f.coverImageAlt || "");
          setOriginalUrl(f.originalUrl || "");
          setBody(f.body || "");
          setPublished(Boolean(f.published));
          setWasInitiallyPublished(Boolean(f.published));

          const loadedFields: PostInputFields = {
            title: f.title || "",
            slug: f.slug || editSlug,
            date: f.date || "",
            description: f.description || "",
            tags: Array.isArray(f.tags) ? f.tags : [],
            coverImage: f.coverImage?.trim() || undefined,
            coverImageAlt: f.coverImageAlt?.trim() || undefined,
            originalUrl: f.originalUrl?.trim() || undefined,
            body: f.body || "",
            published: Boolean(f.published),
          };
          const loadedSerialized = JSON.stringify(loadedFields);
          setLastCommittedSerialized(loadedSerialized);

          // Amendment 6: Render preview automatically once post has loaded
          if (f.body && f.body.trim()) {
            try {
              const prevRes = await fetch("/api/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: f.body }),
              });
              const prevData = await prevRes.json().catch(() => null);
              if (active && prevRes.ok && prevData?.html) {
                setPreviewHtml(prevData.html);
                setLastPreviewedFields(loadedSerialized);
              }
            } catch {
              // Ignore preview fetch failure on load
            }
          }
        }
      } catch {
        if (active) setLoadError("Network error while loading post.");
      } finally {
        if (active) setLoadingPost(false);
      }
    }

    fetchPost();
    return () => {
      active = false;
    };
  }, [editSlug]);

  // Current post fields object
  const currentFields: PostInputFields = useMemo(
    () => ({
      title,
      slug,
      date,
      description,
      tags,
      coverImage: coverImage.trim() || undefined,
      coverImageAlt: coverImageAlt.trim() || undefined,
      originalUrl: originalUrl.trim() || undefined,
      body,
      published,
    }),
    [
      title,
      slug,
      date,
      description,
      tags,
      coverImage,
      coverImageAlt,
      originalUrl,
      body,
      published,
    ]
  );

  const currentSerialized = useMemo(
    () => JSON.stringify(currentFields),
    [currentFields]
  );

  // Warn on tab closing if there are unsaved edits
  const isDirty = useMemo(() => {
    if (
      !title.trim() &&
      !body.trim() &&
      !description.trim() &&
      !pasteText.trim()
    ) {
      return false;
    }
    if (
      lastCommittedSerialized &&
      lastCommittedSerialized === currentSerialized
    ) {
      return false;
    }
    return true;
  }, [
    title,
    body,
    description,
    pasteText,
    lastCommittedSerialized,
    currentSerialized,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Auto-slug when title changes unless manually edited or in edit mode
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isEditMode && !slugManuallyEdited) {
      setSlug(generateSlug(newTitle));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isEditMode) return;
    setSlugManuallyEdited(true);
    setSlug(e.target.value);
  }

  // Toggle tag chip
  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else if (tags.length < 3) {
      setTags([...tags, tag]);
    }
  }

  // Handle Paste box parsing via /api/parse
  async function handleApplyPaste() {
    if (!pasteText.trim()) return;

    setParsingPaste(true);
    setPasteError(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPasteError(data?.error || "Failed to parse pasted text.");
        return;
      }

      if (data.parsed && data.fields) {
        if (data.fields.title) {
          setTitle(data.fields.title);
          setSlug(data.fields.slug || generateSlug(data.fields.title));
        } else if (data.fields.slug) {
          setSlug(data.fields.slug);
        }
        if (data.fields.date) setDate(data.fields.date);
        if (data.fields.description) setDescription(data.fields.description);
        if (Array.isArray(data.fields.tags)) setTags(data.fields.tags);
        if (data.fields.coverImage !== undefined) setCoverImage(data.fields.coverImage || "");
        if (data.fields.coverImageAlt !== undefined) setCoverImageAlt(data.fields.coverImageAlt || "");
        if (data.fields.originalUrl !== undefined) setOriginalUrl(data.fields.originalUrl || "");
        if (typeof data.fields.published === "boolean") setPublished(data.fields.published);
        setBody(data.body || "");
      } else {
        // Plain text paste without front matter - populate body
        setBody(data.body || pasteText);
      }

      setPasteText("");
    } catch {
      setPasteError("An unexpected network error occurred while parsing.");
    } finally {
      setParsingPaste(false);
    }
  }

  const isPreviewOutOfDate = Boolean(
    previewHtml && lastPreviewedFields && lastPreviewedFields !== currentSerialized
  );
  const hasCurrentPreview = Boolean(
    previewHtml && lastPreviewedFields === currentSerialized
  );

  async function pollForLive(postSlug: string) {
    clearPollInterval();
    setPublishStatus({
      stage: "polling",
      message: "Committed ✓. Vercel is deploying (about a minute)...",
      link: `/blog/${postSlug}`,
    });

    const maxAttempts = 36;
    let attempts = 0;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/blog/${postSlug}?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.status === 200) {
          clearPollInterval();
          setPublishStatus({
            stage: "live",
            message: "Live ✓",
            link: `/blog/${postSlug}`,
          });
          return;
        }
      } catch {
        // Continue polling on error
      }

      if (attempts >= maxAttempts) {
        clearPollInterval();
        setPublishStatus({
          stage: "timed_out",
          message: "Still deploying. Check the link in a minute.",
          link: `/blog/${postSlug}`,
        });
      }
    }, 5000);
  }

  async function handlePublish(overwrite = false) {
    if (
      !validationResult.success ||
      !body.trim() ||
      publishing ||
      !hasCurrentPreview
    ) {
      return;
    }

    clearPollInterval();
    setPublishing(true);
    setPublishError(null);
    setOverwriteConfirm(null);
    setPublishStatus({ stage: "committing", message: "Committing…" });

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: currentFields,
          overwrite,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 409 && data?.exists) {
        setOverwriteConfirm({
          slug: data.slug,
          existingPublished: Boolean(data.existingPublished),
        });
        setPublishStatus({ stage: "idle", message: "" });
        setPublishing(false);
        return;
      }

      if (!res.ok) {
        setPublishError(data?.error || "Publishing failed.");
        setPublishStatus({ stage: "idle", message: "" });
        setPublishing(false);
        return;
      }

      // Successful commit
      setLastCommittedSerialized(currentSerialized);

      if (!currentFields.published) {
        setPublishStatus({
          stage: "saved_draft",
          message: "Saved as draft. Not public.",
        });
      } else if (data.wasPublished) {
        setPublishStatus({
          stage: "updated_live",
          message:
            "Committed ✓. The updated version goes live in about a minute.",
          link: `/blog/${data.slug}`,
        });
      } else {
        // New post or newly published: poll for live!
        pollForLive(data.slug);
      }
    } catch {
      setPublishError(
        "An unexpected network error occurred while publishing."
      );
      setPublishStatus({ stage: "idle", message: "" });
    } finally {
      setPublishing(false);
    }
  }

  // Request preview from /api/preview
  async function handlePreview() {
    if (!body.trim()) {
      setPreviewError("Please enter post body content to preview.");
      return;
    }

    setPreviewing(true);
    setPreviewError(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPreviewError(data?.error || "Failed to render preview.");
        return;
      }

      setPreviewHtml(data.html);
      setLastPreviewedFields(currentSerialized);
    } catch {
      setPreviewError("An unexpected network error occurred while rendering preview.");
    } finally {
      setPreviewing(false);
    }
  }

  // Generate file representation
  const generatedFileText = buildPostFile(currentFields);

  // Form validation status
  const validationResult = validatePostInput(currentFields);

  const hasCheckMarker = body.includes("[CHECK:");

  if (loadingPost) {
    return (
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-12 text-center font-[family-name:var(--font-ui)] text-[14px] text-[var(--muted)]">
        Loading post…
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-[10px] border border-[var(--accent)] bg-[var(--bg)] p-6 text-center font-[family-name:var(--font-ui)] text-[14px] font-medium text-[var(--accent-ink)]"
      >
        {loadError}
      </div>
    );
  }

  function handleBackToAllPosts(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDirty) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) {
        e.preventDefault();
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          onClick={handleBackToAllPosts}
          className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-[13px] text-[var(--muted)] hover:text-[var(--accent-ink)] transition-colors"
        >
          ← All posts
        </Link>
      </div>

      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium leading-[1.2] text-[var(--fg)]">
          {isEditMode ? "Edit Post" : "New Post"}
        </h1>
      </div>

      {/* Paste a full post box */}
      {!isEditMode && (
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-[18px] font-medium text-[var(--fg)] mb-2">
            Paste a full post
          </h2>
          <p className="font-[family-name:var(--font-ui)] text-[13px] text-[var(--muted)] mb-4">
            Paste a draft with YAML front matter (<code>--- ... ---</code>) to auto-fill fields, or paste raw markdown to populate the body.
          </p>

          <textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="---&#10;title: &quot;Post title&quot;&#10;date: &quot;2026-11-04&quot;&#10;description: &quot;Summary sentence.&quot;&#10;tags: [&quot;AI Evaluation&quot;]&#10;---&#10;&#10;Post body..."
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[var(--fg)] placeholder:text-[var(--muted)] leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />

          {pasteError && (
            <div role="alert" className="mt-2 text-[13px] font-medium text-[var(--accent-ink)] font-[family-name:var(--font-ui)]">
              {pasteError}
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={handleApplyPaste}
              disabled={parsingPaste || !pasteText.trim()}
              className="rounded-[6px] bg-[var(--fg)] px-4 py-2 text-[13px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
            >
              {parsingPaste ? "Parsing..." : "Parse and populate"}
            </button>
          </div>
        </section>
      )}

      {/* Unresolved marker warning */}
      {hasCheckMarker && (
        <div
          role="alert"
          className="rounded-[6px] border border-[var(--accent)] bg-[var(--bg)] p-3.5 text-[13px] text-[var(--accent-ink)] font-[family-name:var(--font-ui)] font-medium"
        >
          {validationResult.success === false && validationResult.error.includes("[CHECK:")
            ? validationResult.error
            : "Resolve every [CHECK: ...] marker before publishing."}
        </div>
      )}

      {/* Post Editor Fields Form */}
      <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="postTitle" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Title <span className="text-[var(--muted)] font-normal">(1–120 characters)</span>
          </label>
          <input
            id="postTitle"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={handleTitleChange}
            placeholder="e.g. Evaluating Multi-Agent Systems in Practice"
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[16px] font-medium font-[family-name:var(--font-display)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {/* Slug */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="postSlug" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)]">
              Slug <span className="text-[var(--muted)] font-normal">{isEditMode ? "(locked)" : "(1–80 chars, lowercase hyphenated)"}</span>
            </label>
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--muted)]">
              Path: /blog/{slug || "..."}
            </span>
          </div>
          <input
            id="postSlug"
            type="text"
            required
            maxLength={80}
            value={slug}
            disabled={isEditMode}
            readOnly={isEditMode}
            onChange={handleSlugChange}
            placeholder="evaluating-multi-agent-systems-in-practice"
            className={`w-full rounded-[6px] border border-[var(--border)] px-3 py-2 text-[13px] font-[family-name:var(--font-mono)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              isEditMode
                ? "bg-[var(--surface)] opacity-70 cursor-not-allowed"
                : "bg-[var(--bg)]"
            }`}
          />
          {isEditMode && (
            <p className="mt-1 font-[family-name:var(--font-ui)] text-[12px] text-[var(--muted)]">
              Slug cannot be changed after creation.
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="postDate" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Date <span className="text-[var(--muted)] font-normal">(YYYY-MM-DD)</span>
          </label>
          <input
            id="postDate"
            type="text"
            required
            pattern="^\d{4}-\d{2}-\d{2}$"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full max-w-[200px] rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-[family-name:var(--font-mono)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="postDesc" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)]">
              Description <span className="text-[var(--muted)] font-normal">(one-line summary)</span>
            </label>
            <span
              className={`font-[family-name:var(--font-mono)] text-[12px] ${
                description.length > 160
                  ? "text-[var(--accent-ink)] font-semibold"
                  : "text-[var(--muted)]"
              }`}
            >
              {description.length}/160 {description.length > 160 && "(warning: over 160 chars)"}
            </span>
          </div>
          <textarea
            id="postDesc"
            rows={2}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A single plain sentence summarizing the post for cards and search results."
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[14px] font-[family-name:var(--font-ui)] text-[var(--fg)] placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {/* Tags */}
        <fieldset>
          <legend className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Tags <span className="text-[var(--muted)] font-normal">(select up to 3)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_TAGS.map((tag) => {
              const isSelected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-[6px] text-[12px] font-[family-name:var(--font-ui)] border transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--bg)] text-[var(--accent-ink)] font-semibold"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Cover Image & Alt Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="coverImage" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
              Cover image URL <span className="text-[var(--muted)] font-normal">(optional, https:// or /images/…)</span>
            </label>
            <input
              id="coverImage"
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/cover.jpg or /images/cover.jpg"
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-[family-name:var(--font-ui)] text-[var(--fg)] placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="coverImageAlt" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
              Cover alt text <span className="text-[var(--muted)] font-normal">{coverImage.trim() ? "(required with cover URL)" : "(optional)"}</span>
            </label>
            <input
              id="coverImageAlt"
              type="text"
              value={coverImageAlt}
              onChange={(e) => setCoverImageAlt(e.target.value)}
              placeholder="Descriptive explanation for screen readers"
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-[family-name:var(--font-ui)] text-[var(--fg)] placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>
        </div>

        {/* Originally Published At */}
        <div>
          <label htmlFor="originalUrl" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Originally published at <span className="text-[var(--muted)] font-normal">(optional canonical URL, https://)</span>
          </label>
          <input
            id="originalUrl"
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://ieee.org/paper/... or external publication link"
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-[family-name:var(--font-ui)] text-[var(--fg)] placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor="postBody" className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Body <span className="text-[var(--muted)] font-normal">(Markdown, max 200,000 characters)</span>
          </label>
          <textarea
            id="postBody"
            rows={18}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start writing or paste post markdown body..."
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-4 font-[family-name:var(--font-jetbrains-mono)] text-[13px] leading-relaxed text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        {/* Status Radio */}
        <fieldset>
          <legend className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
            Status
          </legend>
          <div className="flex gap-4">
            <label
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-[13px] font-[family-name:var(--font-ui)] cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] ${
                !published
                  ? "border-[var(--accent)] bg-[var(--bg)] text-[var(--accent-ink)] font-semibold"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={!published}
                onChange={() => setPublished(false)}
                className="sr-only"
              />
              <span>Draft</span>
            </label>

            <label
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-[13px] font-[family-name:var(--font-ui)] cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] ${
                published
                  ? "border-[var(--accent)] bg-[var(--bg)] text-[var(--accent-ink)] font-semibold"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={published}
                onChange={() => setPublished(true)}
                className="sr-only"
              />
              <span>Publish</span>
            </label>
          </div>

          {isEditMode && wasInitiallyPublished && !published && (
            <p className="mt-2 text-[13px] font-[family-name:var(--font-ui)] font-semibold text-[var(--accent-ink)]">
              Note: Saving with Draft status will unpublish the live post.
            </p>
          )}
        </fieldset>

        {/* Buttons & Validation Status */}
        <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !body.trim()}
            className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--fg)] hover:bg-[var(--bg)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {previewing ? "Rendering preview..." : previewHtml ? "Update preview" : "Preview"}
          </button>

          <button
            type="button"
            onClick={() => handlePublish(isEditMode ? true : false)}
            disabled={
              !validationResult.success ||
              !body.trim() ||
              publishing ||
              !hasCurrentPreview
            }
            className="rounded-[6px] bg-[var(--fg)] px-5 py-2.5 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {publishing
              ? "Saving…"
              : isEditMode
              ? published
                ? "Update & publish"
                : "Save draft"
              : published
              ? "Publish post"
              : "Save draft"}
          </button>

          {!previewHtml && (
            <span className="text-[12px] font-[family-name:var(--font-ui)] text-[var(--muted)]">
              Preview the post before publishing
            </span>
          )}

          {isPreviewOutOfDate && (
            <span className="text-[12px] font-[family-name:var(--font-ui)] text-[var(--accent-ink)]">
              Update the preview before publishing
            </span>
          )}

          {validationResult.success ? (
            <span
              role="status"
              className="text-[13px] font-[family-name:var(--font-ui)] text-[var(--muted)]"
            >
              Ready to publish
            </span>
          ) : (
            <span
              role="alert"
              className="text-[13px] font-medium font-[family-name:var(--font-ui)] text-[var(--accent-ink)]"
            >
              {validationResult.error}
            </span>
          )}

          {previewError && (
            <span role="alert" className="text-[13px] font-medium text-[var(--accent-ink)] font-[family-name:var(--font-ui)]">
              {previewError}
            </span>
          )}
        </div>

        {/* Overwrite Confirmation Panel */}
        {overwriteConfirm && (
          <div
            role="alert"
            className="rounded-[8px] border border-[var(--accent)] bg-[var(--bg)] p-4 space-y-3 font-[family-name:var(--font-ui)]"
          >
            <p className="text-[14px] font-medium text-[var(--fg)]">
              A post with this slug already exists. Overwrite it?
            </p>
            {overwriteConfirm.existingPublished && !published && (
              <p className="text-[13px] text-[var(--accent-ink)] font-semibold">
                This will unpublish the live post.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePublish(true)}
                className="rounded-[6px] bg-[var(--accent-ink)] text-[var(--bg)] px-4 py-1.5 text-[13px] font-medium hover:opacity-90 cursor-pointer"
              >
                Overwrite
              </button>
              <button
                type="button"
                onClick={() => setOverwriteConfirm(null)}
                className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] px-4 py-1.5 text-[13px] font-medium hover:bg-[var(--bg)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Publish Status Feedback */}
        {publishStatus.message && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 text-[14px] font-[family-name:var(--font-ui)] font-medium text-[var(--fg)]"
          >
            <span>{publishStatus.message}</span>
            {publishStatus.link && (
              <a
                href={publishStatus.link}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-ink)] underline font-medium"
              >
                View post ↗
              </a>
            )}
            <Link
              href="/admin"
              className="text-[var(--muted)] hover:text-[var(--accent-ink)] underline transition-colors"
            >
              Back to all posts
            </Link>
          </div>
        )}

        {publishError && (
          <div
            role="alert"
            className="text-[14px] font-[family-name:var(--font-ui)] font-medium text-[var(--accent-ink)]"
          >
            {publishError}
          </div>
        )}
      </section>

      {/* Rendered Preview Section */}
      {previewHtml && (
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-10 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="font-[family-name:var(--font-display)] text-[20px] font-medium text-[var(--fg)]">
              Preview
            </h2>
            {isPreviewOutOfDate ? (
              <span className="font-[family-name:var(--font-ui)] text-[12px] font-medium text-[var(--accent-ink)] bg-[var(--bg)] px-2.5 py-1 rounded-[4px] border border-[var(--accent)]">
                Preview is out of date
              </span>
            ) : (
              <span className="font-[family-name:var(--font-ui)] text-[12px] text-[var(--muted)]">
                Up to date
              </span>
            )}
          </div>

          {/* Render in exact article styling matching real blog post */}
          <article className="article max-w-[680px] mx-auto">
            {tags.length > 0 && <div className="eyebrow">{tags[0]}</div>}
            <h1>{title || "Untitled Post"}</h1>
            <div className="meta">
              <span>{formatDate(date)}</span>
              <span className="dot" aria-hidden="true"></span>
              <span>{calculateReadingTime(body)}</span>
            </div>
            <div className="rule" aria-hidden="true"></div>

            {coverImage.trim() && (
              <figure className="my-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage.trim()}
                  alt={coverImageAlt.trim() || ""}
                  className="w-full h-auto rounded-[10px] border border-[var(--border)] my-0"
                />
              </figure>
            )}

            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </article>
        </section>
      )}

      {/* Collapsible Generated File Inspector */}
      <details className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <summary className="font-[family-name:var(--font-ui)] text-[14px] font-medium text-[var(--fg)] cursor-pointer select-none">
          Generated file inspector (view raw markdown output)
        </summary>
        <div className="mt-4 space-y-2">
          <p className="font-[family-name:var(--font-ui)] text-[12px] text-[var(--muted)]">
            This is the exact content that Phase 4 will commit to <code>content/posts/{slug || "&lt;slug&gt;"}.md</code> on GitHub.
          </p>
          <pre className="p-4 rounded-[6px] bg-[var(--code-bg)] text-[var(--code-fg)] font-[family-name:var(--font-jetbrains-mono)] text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-[var(--border)]">
            {generatedFileText}
          </pre>
        </div>
      </details>
    </div>
  );
}
