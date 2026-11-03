import { siteConfig } from "@/lib/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="foot">
        <div className="foot__bio">
          <b>{siteConfig.name}</b> — {siteConfig.bio}
        </div>
        <nav className="foot__links" aria-label="Footer links">
          {siteConfig.links.linkedin && (
            <a
              href={siteConfig.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          {siteConfig.links.github && (
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          {siteConfig.links.email && <a href={siteConfig.links.email}>Email</a>}
          <span>© {currentYear}</span>
        </nav>
      </div>
    </footer>
  );
}
