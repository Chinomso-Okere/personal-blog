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
      "About Chinomso Okere: business analyst and applied AI researcher writing about evaluating AI agents and putting AI into real work.",
  },
} as const;

export type SectionPage = keyof typeof sectionPages;

/** The home hero eyebrow, reused as the label on the home card. */
export const HOME_EYEBROW = "Applied AI researcher · Business analyst · Scotland";
