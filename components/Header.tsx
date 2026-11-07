import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { ExternalArrow } from "./ExternalArrow";

export function Header() {
  const { portfolio } = siteConfig.links;

  return (
    <header className="masthead">
      <div className="masthead__in">
        <Link href="/" className="brand">
          {siteConfig.name}
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/blog">Blog</Link>
          <Link href="/writing">Writing</Link>
          {portfolio &&
            (portfolio.startsWith("/") ? (
              <Link href={portfolio}>Portfolio</Link>
            ) : (
              <a href={portfolio} target="_blank" rel="noopener noreferrer">
                Portfolio
                <ExternalArrow />
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ))}
          <Link href="/about">About</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
