export const ALLOWED_TAGS = [
  "AI Evaluation",
  "Multi-Agent Systems",
  "Causal Reasoning",
  "Voice AI",
  "Responsible AI",
  "AI Implementation",
  "Business Analysis",
  "UK AI",
] as const;

export type AllowedTag = (typeof ALLOWED_TAGS)[number];

