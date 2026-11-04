import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PostEditor } from "@/components/PostEditor";
import { SLUG_REGEX } from "@/lib/manage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface EditPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditPage({ params }: EditPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { slug } = await params;
  if (!SLUG_REGEX.test(slug)) {
    notFound();
  }

  return <PostEditor editSlug={slug} />;
}

