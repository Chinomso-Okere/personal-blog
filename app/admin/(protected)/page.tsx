import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  // Defense in depth: Verify session directly in page component
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--font-ui)] text-[16px] text-[var(--fg)]">
        Signed in.
      </p>

      <div>
        <Link
          href="/admin/new"
          className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--fg)] px-4 py-2 text-[14px] font-medium font-[family-name:var(--font-ui)] text-[var(--bg)] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          New post →
        </Link>
      </div>
    </div>
  );
}

