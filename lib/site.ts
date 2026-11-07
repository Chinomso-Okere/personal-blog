export const siteConfig = {
  name: "Chinomso Okere",
  title: "Chinomso Okere",
  tagline: "Applied AI, evidence first.",
  description:
    "Writing by Chinomso Okere on evaluating AI agents and putting AI into real work.",
  bio: "applied AI researcher, business analyst and founder of Silverpath AI, writing about evaluating AI agents and putting AI into real work.",
  // No trailing slash, so `${url}/blog` never becomes "//blog".
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://personal-blog-omega-flax.vercel.app"
  ).replace(/\/+$/, ""),
  links: {
    github: "https://github.com/Chinomso-Okere",
    linkedin: "https://www.linkedin.com/in/chinomso-okere-silverpathai",
    email: "mailto:niqquk@gmail.com",
    // A "/" path renders as an internal link (same tab, no arrow); a full URL
    // as an external one. Empty hides the Portfolio nav item.
    portfolio: "/portfolio",
  },
};
