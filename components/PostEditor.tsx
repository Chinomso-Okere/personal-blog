"use client";

import { useState, useEffect, useMemo } from "react";
import { ALLOWED_TAGS } from "@/lib/tags";
import {
  generateSlug,
  validatePostInput,
  buildPostFile,
  type PostInputFields,
} from "@/lib/post-input";
import { calculateReadingTime } from "@/lib/reading-time";
import { formatDate } from "@/lib/format";

export function PostEditor() {
  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [date, setDate] = useState("");

  // Set default date to local calendar date on mount (prevents UTC offset & hydration mismatch)
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(`${y}-${m}-${d}`);
  }, []);
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

  // Warn on tab closing if there are unsaved edits
  const isDirty = useMemo(() => {
    return Boolean(title.trim() || body.trim() || description.trim() || pasteText.trim());
  }, [title, body, description, pasteText]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Auto-slug when title changes unless manually edited
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(newTitle));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  // Current post fields object
  const currentFields: PostInputFields = useMemo(() => ({
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
  }), [title, slug, date, description, tags, coverImage, coverImageAlt, originalUrl, body, published]);

  // Compare against last previewed state
  const currentSerialized = useMemo(() => JSON.stringify(currentFields), [currentFields]);
  const isPreviewOutOfDate = useMemo(() => {
    return Boolean(previewHtml && lastPreviewedFields && lastPreviewedFields !== currentSerialized);
  }, [previewHtml, lastPreviewedFields, currentSerialized]);

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
  const generatedFileText = useMemo(() => {
    return buildPostFile(currentFields);
  }, [currentFields]);

  // Form validation status
  const validationResult = useMemo(() => {
    return validatePostInput(currentFields);
  }, [currentFields]);

  const hasCheckMarker = body.includes("[CHECK:");

  return (
    <div className="space-y-10">
      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium leading-[1.2] text-[var(--fg)]">
          New Post
        </h1>
      </div>

      {/* Paste a full post box */}
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
              Slug <span className="text-[var(--muted)] font-normal">(1–80 chars, lowercase hyphenated)</span>
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
            onChange={handleSlugChange}
            placeholder="evaluating-multi-agent-systems-in-practice"
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-[family-name:var(--font-mono)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
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
              Cover image URL <span className="text-[var(--muted)] font-normal">(optional, https://)</span>
            </label>
            <input
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/cover.jpg"
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
        </fieldset>

        {/* Preview Button & Validation Status */}
        <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !body.trim()}
            className="rounded-[6px] bg-[var(--fg)] px-5 py-2.5 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {previewing ? "Rendering preview..." : previewHtml ? "Update preview" : "Preview"}
          </button>

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
