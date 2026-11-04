"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { PostListItem } from "@/lib/manage";

interface AdminPostListProps {
  initialPosts: PostListItem[];
  totalCount: number;
  configError?: string;
}

export function AdminPostList({
  initialPosts,
  totalCount: initialTotalCount,
  configError,
}: AdminPostListProps) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);

  // Loading state tracking
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PostListItem | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  // Close dialog on Escape key and focus input on open
  useEffect(() => {
    if (!deleteTarget) return;

    // Focus input on dialog open
    confirmInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setDeleteTarget(null);
        setDeleteInput("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteTarget, deleting]);

  async function handleTogglePublish(post: PostListItem) {
    if (pendingSlug || !post.hasValidSlug) return;

    setPendingSlug(post.slug);
    setErrorMessage(null);
    setStatusMessage(null);

    const nextPublished = !post.published;

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.error || "Failed to update publication status.");
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.slug === post.slug ? { ...p, published: nextPublished } : p
        )
      );

      setStatusMessage(
        nextPublished
          ? `Post "${post.title}" published ✓. Vercel is redeploying.`
          : `Post "${post.title}" unpublished ✓. Vercel is redeploying.`
      );
    } catch {
      setErrorMessage("Network error while updating post status.");
    } finally {
      setPendingSlug(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleteInput !== deleteTarget.slug || deleting) return;

    setDeleting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(deleteTarget.slug)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.error || "Failed to delete post.");
        return;
      }

      setPosts((prev) => prev.filter((p) => p.slug !== deleteTarget.slug));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setStatusMessage(
        `Post "${deleteTarget.title}" deleted ✓. Vercel is redeploying.`
      );
      setDeleteTarget(null);
      setDeleteInput("");
    } catch {
      setErrorMessage("Network error while deleting post.");
    } finally {
      setDeleting(false);
    }
  }

  if (configError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-[var(--fg)]">
            Posts
          </h1>
          <Link
            href="/admin/new"
            className="rounded-[6px] bg-[var(--fg)] px-4 py-2 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            New post →
          </Link>
        </div>
        <div
          role="alert"
          className="rounded-[8px] border border-[var(--accent)] bg-[var(--bg)] p-4 text-[14px] font-[family-name:var(--font-ui)] text-[var(--accent-ink)]"
        >
          {configError}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-[var(--fg)]">
            Posts
          </h1>
          {totalCount > posts.length && (
            <p className="mt-1 font-[family-name:var(--font-ui)] text-[13px] text-[var(--muted)]">
              Showing 100 of {totalCount} posts
            </p>
          )}
        </div>
        <Link
          href="/admin/new"
          className="rounded-[6px] bg-[var(--fg)] px-4 py-2 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          New post →
        </Link>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[13px] font-[family-name:var(--font-ui)] font-medium text-[var(--fg)]"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-[6px] border border-[var(--accent)] bg-[var(--bg)] p-3.5 text-[13px] font-[family-name:var(--font-ui)] font-medium text-[var(--accent-ink)]"
        >
          {errorMessage}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="font-[family-name:var(--font-ui)] text-[14px] text-[var(--muted)]">
            No posts found in the repository.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="divide-y divide-[var(--border)]">
            {posts.map((post) => {
              const isItemPending = pendingSlug === post.slug;

              return (
                <div
                  key={post.filename}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {post.invalid ? (
                        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[14px] font-medium text-[var(--fg)]">
                          {post.filename}
                        </span>
                      ) : (
                        <Link
                          href={`/admin/edit/${encodeURIComponent(post.slug)}`}
                          className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--fg)] hover:text-[var(--accent-ink)] transition-colors"
                        >
                          {post.title}
                        </Link>
                      )}

                      {/* Status badge */}
                      {post.loadError ? (
                        <span className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-[var(--muted)]">
                          Retry
                        </span>
                      ) : post.invalid ? (
                        <span className="rounded-[4px] border border-[var(--accent)] bg-[var(--bg)] px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-[var(--accent-ink)]">
                          Invalid
                        </span>
                      ) : post.published ? (
                        <span className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-[var(--fg)]">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-[var(--muted)]">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-ui)] text-[12px] text-[var(--muted)]">
                      <span>{post.date}</span>
                      {post.hasValidSlug && !post.invalid && !post.loadError && (
                        <>
                          <span>•</span>
                          <span className="font-[family-name:var(--font-jetbrains-mono)]">
                            {post.slug}
                          </span>
                        </>
                      )}
                      {post.note && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--accent-ink)] font-medium">
                            {post.note}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    {post.hasValidSlug && !post.invalid && !post.loadError && (
                      <>
                        <Link
                          href={`/admin/edit/${encodeURIComponent(post.slug)}`}
                          className="rounded-[5px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(post)}
                          disabled={isItemPending}
                          className="rounded-[5px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isItemPending
                            ? "Saving…"
                            : post.published
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      </>
                    )}

                    {post.hasValidSlug && !post.loadError ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(post);
                          setDeleteInput("");
                        }}
                        className="rounded-[5px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[12px] font-medium text-[var(--accent-ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="font-[family-name:var(--font-ui)] text-[12px] text-[var(--muted)]">
                        No actions
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--fg)]/40 p-4"
        >
          <div className="w-full max-w-md rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 font-[family-name:var(--font-ui)]">
            <h2 className="font-[family-name:var(--font-display)] text-[18px] font-medium text-[var(--fg)]">
              Delete Post
            </h2>

            <p className="text-[13px] text-[var(--fg)] leading-relaxed">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.title}</strong>? This commits a file deletion
              to GitHub and cannot be undone.
            </p>

            <div>
              <label
                htmlFor="confirmSlugInput"
                className="block text-[12px] text-[var(--muted)] mb-1.5"
              >
                Type <code className="text-[var(--accent-ink)] font-bold">{deleteTarget.slug}</code> to confirm:
              </label>
              <input
                ref={confirmInputRef}
                id="confirmSlugInput"
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={deleteTarget.slug}
                className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteInput("");
                }}
                disabled={deleting}
                className="rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-[13px] font-medium text-[var(--fg)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteInput !== deleteTarget.slug || deleting}
                className="rounded-[6px] bg-[var(--accent-ink)] px-4 py-2 text-[13px] font-medium text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {deleting ? "Deleting…" : "Delete post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

