import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Admin is never indexed; set here as well as on the admin root layout.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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

