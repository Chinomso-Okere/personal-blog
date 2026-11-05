import { ViewTransition } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {/* Cross-fades page content on client navigation; header stays put. */}
        <ViewTransition>{children}</ViewTransition>
      </main>
      <Footer />
    </div>
  );
}
