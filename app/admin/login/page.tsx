"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data?.error || "Incorrect password");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-none">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-medium leading-[1.2] text-[var(--fg)] mb-6 text-center">
        Admin Access
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="password"
            className="block font-[family-name:var(--font-ui)] text-[13px] font-medium text-[var(--fg)] mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            disabled={submitting}
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted)] font-[family-name:var(--font-ui)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </div>

        <div
          role="alert"
          className="min-h-[24px] my-3 text-[13px] text-[var(--accent-ink)] font-[family-name:var(--font-ui)]"
        >
          {error && <span>{error}</span>}
        </div>

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-[6px] bg-[var(--fg)] text-[var(--bg)] py-2 text-[14px] font-medium font-[family-name:var(--font-ui)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

