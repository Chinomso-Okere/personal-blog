"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch {
      // Ignore network failure on logout
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="font-[family-name:var(--font-ui)] text-[13px] text-[var(--muted)] hover:text-[var(--accent-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer disabled:opacity-50"
    >
      {loading ? "Signing out..." : "Log out"}
    </button>
  );
}

