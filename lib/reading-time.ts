/**
 * Calculates reading time in minutes from a text string.
 * Assumes an average reading speed of 200 words per minute.
 * Pure function: safe for client and server components.
 */
export function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

