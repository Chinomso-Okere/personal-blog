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
    <div className="site-container py-12 md:py-16">
      <div className="article-col">
        <p className="font-[family-name:var(--font-ui)] text-[16px] text-[var(--fg)]">
          Signed in.
        </p>
      </div>
    </div>
  );
}

