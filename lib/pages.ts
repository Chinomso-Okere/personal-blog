// Title and description of each section page, shared by the page metadata and
// its branded social card so the two never drift apart.
export const sectionPages = {
  blog: {
    path: "/blog",
    title: "Blog",
    description:
      "Long-form articles on evaluating AI agents, voice systems, and production engineering.",
  },
  writing: {
    path: "/writing",
    title: "Writing",
    description:
      "Research papers co-authored by Chinomso Okere on multi-agent evaluation and causal reasoning, and articles written for publications.",
  },
  about: {
    path: "/about",
    title: "About",
    description:
      "About Chinomso Okere: applied AI researcher, business analyst and founder of Silverpath AI, writing about evaluating AI agents and putting AI into real work.",
  },
  cv: {
    path: "/cv",
    title: "CV",
    description:
      "CV of Chinomso Okere: MBCS, business analyst and applied AI researcher in Scotland, UK.",
  },
  portfolio: {
    path: "/portfolio",
    title: "Portfolio",
    description:
      "Case studies by Chinomso Okere: research, builds and proofs of concept, each with its evidence and what it doesn't show.",
  },
} as const;

/** The /portfolio hero: two display lines (the second in italic clay) and a lede. */
export const PORTFOLIO_HERO = {
  eyebrow: "Portfolio",
  line1: "Work that shows",
  line2: "the answer is right.",
  lede: "I focus on making digital and AI services trustworthy, measurable and useful to the people who rely on them.",
} as const;

/**
 * The web CV's path, or null to hide every link to it (e.g. while the page is
 * being rebuilt). Links to the CV render only when this is set.
 */
export const CV_PATH: string | null = sectionPages.cv.path;

export type SectionPage = keyof typeof sectionPages;

/** The home hero eyebrow, reused as the label on the home card. */
export const HOME_EYEBROW = "Applied AI researcher · Business analyst · Scotland";

/** Portrait used on About, in the post author card and in the Person JSON-LD. */
export const AUTHOR_PHOTO = "/images/chinomso-okere.jpg";
