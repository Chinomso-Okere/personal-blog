import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PostEditor } from "@/components/PostEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewPostPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <PostEditor />;
}

