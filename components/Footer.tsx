import { siteConfig } from "@/lib/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="foot">
      <div className="site-container">
        <div className="foot__in">
          <p className="foot__bio">
            <strong>{siteConfig.name}</strong> — {siteConfig.bio}
          </p>
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
            {siteConfig.links.email && (
              <a href={siteConfig.links.email}>Email</a>
            )}
          </nav>
        </div>
        <p className="foot__c">
          © {currentYear} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
