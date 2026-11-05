import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1 site-container py-20 md:py-32">
        <div className="article-col text-center">
          <p className="kicker justify-center">
            <span className="kicker__tag">404 · Page Not Found</span>
          </p>
          <h1 className="post__title">This page could not be found.</h1>
          <p className="post__dek mx-auto">
            The link you followed may be broken or the post may have been
            moved.
          </p>
          <div>
            <Link
              href="/blog"
              className="inline-block px-5 py-2.5 rounded-full border border-[var(--border)] text-[var(--fg)] font-[family-name:var(--font-ui)] text-[12px] uppercase tracking-[0.08em] font-medium hover:border-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

