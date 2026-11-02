import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nonso Okere — AI Technical Blog",
  description:
    "AI technical writing by Nonso Okere. Articles, papers and engineering notes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
