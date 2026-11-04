import matter from "gray-matter";

const safeEngines = {
  js: () => {
    throw new Error("Only YAML front matter is supported.");
  },
  javascript: () => {
    throw new Error("Only YAML front matter is supported.");
  },
  coffee: () => {
    throw new Error("Only YAML front matter is supported.");
  },
};

export interface ParsedFrontmatter<T = Record<string, unknown>> {
  data: T;
  content: string;
}

/**
 * Safely parses markdown front matter using gray-matter.
 * Blocks executable engines (js, javascript, coffee) by overriding them to throw.
 * This function is the ONLY place gray-matter is imported across the application.
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  text: string
): ParsedFrontmatter<T> {
  const result = matter(text, {
    engines: safeEngines,
  });

  return {
    data: result.data as T,
    content: result.content,
  };
}

