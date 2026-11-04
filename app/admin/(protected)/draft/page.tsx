import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DraftEditor } from "@/components/DraftEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDraftPage() {
  // Defense in depth: Verify session directly in server component
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <DraftEditor />;
}

