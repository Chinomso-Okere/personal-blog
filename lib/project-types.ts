// Project types and statuses, kept apart from lib/projects.ts (which reads
// files) so the social-card code can use the labels without the loader.
export const PROJECT_TYPES = ["research", "build", "proof-of-concept"] as const;
export const PROJECT_STATUSES = [
  "Published",
  "Accepted",
  "Live",
  "Proof of concept",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// View-transition names for the case-study header. Phase 3 cards use the same
// names so a card's title and cover morph into the header on navigation.
export function projectTitleTransition(slug: string): string {
  return `project-title-${slug}`;
}

export function projectCoverTransition(slug: string): string {
  return `project-cover-${slug}`;
}

/** Display label per type: kicker, social card label, JSON-LD genre. */
export const TYPE_LABELS: Record<ProjectType, string> = {
  research: "Research",
  build: "Build",
  "proof-of-concept": "Proof of concept",
};
