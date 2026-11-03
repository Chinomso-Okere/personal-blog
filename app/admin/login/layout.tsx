import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      {children}
    </main>
  );
}

