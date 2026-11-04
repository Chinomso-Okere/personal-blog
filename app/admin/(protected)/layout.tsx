import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-[18px] font-medium text-[var(--fg)] hover:text-[var(--accent-ink)] transition-colors"
            >
              {siteConfig.name}
            </Link>
            <span className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-ink)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border)]">
              Admin
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

