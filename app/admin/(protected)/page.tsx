import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listPosts } from "@/lib/manage";
import { AdminPostList } from "@/components/AdminPostList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  // Defense in depth: Verify session directly in page component
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";

  if (!token || !owner || !repo) {
    return (
      <AdminPostList
        initialPosts={[]}
        totalCount={0}
        configError="GitHub integration is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO."
      />
    );
  }

  let posts: import("@/lib/manage").PostListItem[] = [];
  let totalCount = 0;
  let configError: string | undefined;

  try {
    const result = await listPosts({
      token,
      owner,
      repo,
      branch,
    });
    posts = result.posts;
    totalCount = result.totalCount;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load posts from GitHub.";
    configError = `Unable to list posts from GitHub: ${message}`;
  }

  return (
    <AdminPostList
      initialPosts={posts}
      totalCount={totalCount}
      configError={configError}
    />
  );
}
