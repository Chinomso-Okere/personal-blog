"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SOURCE_TYPES,
  ALLOWED_TAGS,
  type SourceType,
  type DraftOutput,
} from "@/lib/draft";

export function DraftEditor() {
  const router = useRouter();

  // Input states
  const [sourceType, setSourceType] = useState<SourceType>("topic");
  const [sourceText, setSourceText] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [angle, setAngle] = useState("");

  // Request & UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result states
  const [draft, setDraft] = useState<DraftOutput | null>(null);
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  // Warn on navigation away while a draft exists
  useEffect(() => {
    if (!draft) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !sourceText.trim()) return;

    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120_000);

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType,
          sourceText,
          sourceRef: sourceRef.trim() || undefined,
          angle: angle.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (res.status === 504) {
        setError("The draft took too long. Try a shorter source.");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to generate draft. Please try again.");
        return;
      }

      setDraft(data.draft);
      setUsage(data.usage);
      setDurationMs(data.durationMs);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort =
        (err as { name?: string })?.name === "AbortError" ||
        controller.signal.aborted;
      if (isAbort) {
        setError("The draft took too long. Try a shorter source.");
      } else {
        setError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tag: string) {
    if (!draft) return;
    const isSelected = draft.tags.includes(tag);
    if (isSelected) {
      setDraft({
        ...draft,
        tags: draft.tags.filter((t) => t !== tag),
      });
    } else {
      if (draft.tags.length < 3) {
        setDraft({
          ...draft,
          tags: [...draft.tags, tag],
        });
      }
    }
  }

  const hasCheckMarker = draft?.body.includes("[CHECK:");

  return (
    <div className="space-y-12">
      {/* Source Input Form */}
      <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h1 className="font-[family-name:var(--font-display)] text-[24px] font-medium leading-[1.2] text-[var(--fg)] mb-6">
          AI Drafting
        </h1>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Source Type */}
          <fieldset>
            <legend className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
              Source type
            </legend>
            <div className="flex flex-wrap gap-3">
              {SOURCE_TYPES.map((type) => (
                <label
                  key={type}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-[13px] font-[family-name:var(--font-ui)] cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] ${
                    sourceType === type
                      ? "border-[var(--accent)] bg-[var(--bg)] text-[var(--accent-ink)] font-semibold"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sourceType"
                    value={type}
                    checked={sourceType === type}
                    onChange={() => setSourceType(type)}
                    className="sr-only"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Source Text */}
          <div>
            <label
              htmlFor="sourceText"
              className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2"
            >
              Source text
            </label>
            <textarea
              id="sourceText"
              rows={8}
              required
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste topic notes, document text, or a video/talk transcript here..."
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted)] font-[family-name:var(--font-ui)] leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Optional Source Reference */}
          <div>
            <label
              htmlFor="sourceRef"
              className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-1"
            >
              Source reference (optional)
            </label>
            <p className="text-[12px] text-[var(--muted)] font-[family-name:var(--font-ui)] mb-2">
              Title, author, speaker name, or URL to attribute.
            </p>
            <input
              id="sourceRef"
              type="text"
              maxLength={500}
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="e.g. Talk by Jane Doe at Conf 2026, https://example.com/paper"
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted)] font-[family-name:var(--font-ui)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Optional Angle */}
          <div>
            <label
              htmlFor="angle"
              className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-1"
            >
              My angle (optional)
            </label>
            <p className="text-[12px] text-[var(--muted)] font-[family-name:var(--font-ui)] mb-2">
              Specific focus, contrarian view, practical takeaway, or personal argument.
            </p>
            <textarea
              id="angle"
              rows={3}
              maxLength={2000}
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. Focus on why the benchmark metrics mislead practitioners..."
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted)] font-[family-name:var(--font-ui)] leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="text-[14px] text-[var(--accent-ink)] font-[family-name:var(--font-ui)] font-medium"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading || !sourceText.trim()}
              className="rounded-[6px] bg-[var(--fg)] px-5 py-2.5 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Drafting..." : "Generate draft"}
            </button>
          </div>
        </form>
      </section>

      {/* Generated Result Area */}
      {draft && (
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-4">
            <h2 className="font-[family-name:var(--font-display)] text-[20px] font-medium text-[var(--fg)]">
              Draft Review
            </h2>
            <span className="text-[12px] text-[var(--muted)] font-[family-name:var(--font-ui)]">
              Editable draft
            </span>
          </div>

          {/* CHECK marker alert */}
          {hasCheckMarker && (
            <div
              role="alert"
              className="rounded-[6px] border border-[var(--accent)] bg-[var(--bg)] p-3.5 text-[13px] text-[var(--accent-ink)] font-[family-name:var(--font-ui)] font-medium"
            >
              Resolve every [CHECK: ...] marker before publishing.
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="draftTitle"
              className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2"
            >
              Title
            </label>
            <input
              id="draftTitle"
              type="text"
              maxLength={120}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[15px] font-medium font-[family-name:var(--font-display)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="draftDesc"
                className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)]"
              >
                Description
              </label>
              <span
                className={`text-[12px] font-[family-name:var(--font-mono)] ${
                  draft.description.length > 160
                    ? "text-[var(--accent-ink)] font-semibold"
                    : "text-[var(--muted)]"
                }`}
              >
                {draft.description.length}/160
              </span>
            </div>
            <textarea
              id="draftDesc"
              rows={2}
              maxLength={200}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[14px] text-[var(--fg)] font-[family-name:var(--font-ui)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Tags */}
          <fieldset>
            <legend className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2">
              Tags (select up to 3)
            </legend>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_TAGS.map((tag) => {
                const isSelected = draft.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-[6px] text-[12px] font-[family-name:var(--font-ui)] border transition-colors cursor-pointer ${
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

          {/* Body */}
          <div>
            <label
              htmlFor="draftBody"
              className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2"
            >
              Body (Markdown)
            </label>
            <textarea
              id="draftBody"
              rows={18}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-4 text-[13px] leading-relaxed font-[family-name:var(--font-jetbrains-mono)] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </div>

          {/* Usage, Timing & Ephemeral notice */}
          <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-[var(--muted)] font-[family-name:var(--font-ui)]">
            <span>
              {usage && durationMs !== null
                ? `Used ${usage.inputTokens.toLocaleString()} input and ${usage.outputTokens.toLocaleString()} output tokens in ${(
                    durationMs / 1000
                  ).toFixed(1)} seconds.`
                : null}
            </span>
            <span className="italic">
              Drafts are not saved. Leaving this page loses them.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

