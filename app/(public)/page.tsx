export default function HomePage() {
  return (
    <div className="site-container py-12 md:py-16">
      <div className="article-col">
        <span className="font-[family-name:var(--font-ui)] text-[12px] font-semibold tracking-[0.1em] uppercase text-[var(--accent-ink)]">
          [Placeholder Eyebrow]
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,44px)] font-medium leading-[1.15] tracking-[-0.015em] my-4 text-[var(--fg)] text-balance">
          [Placeholder Heading — Home page intro to be supplied by author]
        </h1>
        <p className="font-[family-name:var(--font-display)] text-[20px] leading-[1.55] text-[var(--fg)] my-4">
          [Placeholder Lead — This is placeholder copy for the introductory
          statement. Real biographical and technical context will be placed here
          during review.]
        </p>
        <p className="font-[family-name:var(--font-display)] text-[18px] leading-[1.64] text-[var(--fg)] my-4">
          [Placeholder Body — Checkpoint (a) establishes the design tokens,
          typography scale, masthead navigation, footer, and theme toggle. Recent
          blog post cards will be wired in Checkpoint (b).]
        </p>
      </div>
    </div>
  );
}
