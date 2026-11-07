import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter, type Highlighter } from "shiki";
import type { Root as MdastRoot, Node as MdastNode } from "mdast";
import type {
  Root as HastRoot,
  Element as HastElement,
  Node as HastNode,
  Text as HastText,
} from "hast";

const SUPPORTED_LANGS = [
  "python",
  "typescript",
  "javascript",
  "tsx",
  "json",
  "bash",
  "yaml",
  "sql",
  "html",
  "css",
  "markdown",
] as const;

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [
        {
          name: "warm-editorial",
          type: "dark",
          colors: {
            "editor.background": "transparent",
            "editor.foreground": "inherit",
          },
          tokenColors: [
            {
              scope: ["keyword", "storage.type", "storage.modifier"],
              settings: { foreground: "#E59A5E" },
            },
            {
              scope: ["string", "string.quoted"],
              settings: { foreground: "#B8C08A" },
            },
            {
              // Referenced types: base classes, built-in types, type annotations.
              scope: [
                "entity.name.type",
                "entity.other.inherited-class",
                "support.type",
                "support.class",
              ],
              settings: { foreground: "#E3C58A" },
            },
            {
              // Names being defined or called. Shiki themes can only set bold
              // (700), so the mockup's weight 500 is not applied.
              scope: [
                "entity.name.function",
                "support.function",
                "entity.name.type.class",
                "entity.name.class",
              ],
              settings: { foreground: "#F4EAD5" },
            },
            {
              scope: ["comment", "punctuation.definition.comment"],
              settings: { foreground: "#988C72", fontStyle: "italic" },
            },
            {
              scope: ["constant.numeric", "constant.language"],
              settings: { foreground: "#DD9A72" },
            },
          ],
        },
      ],
      langs: Array.from(SUPPORTED_LANGS),
    });
  }
  return highlighterPromise;
}

// Options are an object, not a bare boolean: unified treats `.use(p, true)`
// as "no options" and `.use(p, false)` as "plugin off".
function remarkEnhancements({ lead }: { lead: boolean }) {
  return (tree: MdastRoot) => {
    let firstP = lead;
    for (const node of tree.children) {
      if (node.type === "paragraph" && firstP) {
        firstP = false;
        const n = node as MdastNode & { data?: Record<string, unknown> };
        n.data = n.data || {};
        n.data.hProperties = { className: ["lead"] };
      }
      if (node.type === "blockquote") {
        const n = node as MdastNode & { data?: Record<string, unknown> };
        n.data = n.data || {};
        n.data.hProperties = { className: ["pull"] };
      }
    }
  };
}

function rehypeShiki(highlighter: Highlighter) {
  return (tree: HastRoot) => {
    function walk(
      node: HastNode,
      parent: (HastNode & { children?: HastNode[] }) | null,
      index: number | null
    ) {
      if (
        node.type === "element" &&
        (node as HastElement).tagName === "pre" &&
        parent &&
        index !== null &&
        parent.children
      ) {
        const preEl = node as HastElement;
        const codeNode = preEl.children?.find(
          (c): c is HastElement => c.type === "element" && c.tagName === "code"
        );

        if (codeNode) {
          const className = Array.isArray(codeNode.properties?.className)
            ? codeNode.properties.className.join(" ")
            : String(codeNode.properties?.className || "");
          const langMatch = className.match(/language-([a-z0-9_-]+)/i);
          const rawLang = langMatch ? langMatch[1].toLowerCase() : "";
          const lang = SUPPORTED_LANG_SET.has(rawLang) ? rawLang : "text";

          let rawCode = "";
          for (const child of codeNode.children || []) {
            if (child.type === "text") {
              rawCode += child.value;
            }
          }

          const meta = (codeNode.data as { meta?: string } | undefined)?.meta || "";
          const titleMatch = meta.match(/title=(["'])(.*?)\1/);
          const title = titleMatch ? titleMatch[2] : "";

          const shikiHast = highlighter.codeToHast(rawCode.replace(/\n$/, ""), {
            lang: lang === "text" ? "text" : (lang as (typeof SUPPORTED_LANGS)[number]),
            theme: "warm-editorial",
            transformers: [
              {
                pre(preAst) {
                  delete preAst.properties.style;
                },
              },
            ],
          });

          const preElement = shikiHast.children[0] as HastElement;

          const figureChildren: HastElement[] = [];
          if (title) {
            figureChildren.push({
              type: "element",
              tagName: "div",
              properties: { className: ["cap"] },
              children: [{ type: "text", value: title }],
            });
          }
          figureChildren.push(preElement);

          const figureElement: HastElement = {
            type: "element",
            tagName: "figure",
            properties: { className: ["code"] },
            children: figureChildren,
          };

          parent.children[index] = figureElement;
          return;
        }
      }

      const el = node as HastNode & { children?: HastNode[] };
      if (el.children) {
        for (let i = 0; i < el.children.length; i++) {
          walk(el.children[i], el, i);
        }
      }
    }

    walk(tree, null, null);
  };
}

export interface Heading {
  id: string;
  text: string;
}

function textOf(node: HastNode): string {
  if (node.type === "text") return (node as HastText).value;
  const children = (node as { children?: HastNode[] }).children;
  return children ? children.map(textOf).join("") : "";
}

// IDs are strictly [a-z0-9-]: accents are folded, everything else becomes a hyphen.
function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

function isImageOnlyParagraph(el: HastElement): boolean {
  if (el.tagName !== "p") return false;
  const meaningful = el.children.filter(
    (c) => !(c.type === "text" && c.value.trim() === "")
  );
  return (
    meaningful.length === 1 &&
    meaningful[0].type === "element" &&
    meaningful[0].tagName === "img"
  );
}

function hasClass(el: HastElement, name: string): boolean {
  const cls = el.properties?.className;
  return Array.isArray(cls) && cls.includes(name);
}

function isUntitledCodeFigure(el: HastElement): boolean {
  if (el.tagName !== "figure" || !hasClass(el, "code")) return false;
  const first = el.children.find((c) => c.type === "element") as
    | HastElement
    | undefined;
  return !first || !hasClass(first, "cap");
}

// An empty bar rendered on the server so the Copy button (added client-side
// by CodeCopy) never shifts the layout. Deliberately not .cap: that class means
// "has a filename".
function addCopyBar(el: HastElement) {
  el.children.unshift({
    type: "element",
    tagName: "div",
    properties: { className: ["copybar"] },
    children: [],
  });
}

// Runs AFTER rehype-sanitize. Everything it adds is generated here (slug IDs,
// fixed anchor markup, a data flag, figure wrappers and links around
// already-sanitised images, empty copy bars), so the sanitiser schema stays
// unchanged.
function rehypePostEnhance(headings: Heading[]) {
  return (tree: HastRoot) => {
    const used = new Set<string>();
    let h2Count = 0;

    tree.children = tree.children.map((node) => {
      if (node.type !== "element") return node;
      const el = node as HastElement;

      if (isImageOnlyParagraph(el)) {
        const img = el.children.find(
          (c): c is HastElement => c.type === "element"
        )!;
        // Body figures are below the fold; the cover is the LCP image instead.
        img.properties = { ...img.properties, loading: "lazy", decoding: "async" };
        // Diagrams are unreadable at phone width, so each figure links to the
        // full-size file (src was already checked by the sanitiser).
        return {
          type: "element",
          tagName: "figure",
          properties: { className: ["fig"] },
          children: [
            {
              type: "element",
              tagName: "a",
              properties: {
                className: ["fig__open"],
                href: String(img.properties?.src ?? ""),
                target: "_blank",
                rel: ["noopener", "noreferrer"],
              },
              children: [
                {
                  type: "element",
                  tagName: "div",
                  properties: { className: ["fig__in"] },
                  children: [img],
                },
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["sr-only"] },
                  children: [{ type: "text", value: " (opens full size in new tab)" }],
                },
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["fig__hint"], ariaHidden: "true" },
                  children: [{ type: "text", value: "View full size ↗" }],
                },
              ],
            },
          ],
        } satisfies HastElement;
      }

      if (isUntitledCodeFigure(el)) {
        addCopyBar(el);
        return el;
      }

      if (el.tagName === "p" && hasClass(el, "lead")) {
        if (/^[A-Za-z]/.test(textOf(el).trimStart())) {
          el.properties = { ...el.properties, dataDropcap: "true" };
        }
        return el;
      }

      if (el.tagName === "h2") {
        h2Count += 1;
        const text = textOf(el).trim();
        const base = slugify(text) || `section-${h2Count}`;
        let id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);

        headings.push({ id, text: text || `Section ${h2Count}` });
        el.properties = { ...el.properties, id };
        // Section number marker (01, 02...), hidden from assistive tech.
        el.children.unshift({
          type: "element",
          tagName: "span",
          properties: { className: ["h2-num"], ariaHidden: "true" },
          children: [{ type: "text", value: String(h2Count).padStart(2, "0") }],
        });
        // Appended after the text so the heading's accessible name starts with
        // its own words; CSS positions it in the left margin.
        el.children.push({
          type: "element",
          tagName: "a",
          properties: {
            className: ["anchor"],
            href: `#${id}`,
            ariaLabel: "Link to this section",
          },
          children: [{ type: "text", value: "#" }],
        });
      }

      return el;
    });
  };
}

export const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "figure",
    "figcaption",
    "div",
    "span",
  ],
  attributes: {
    ...defaultSchema.attributes,
    figure: ["className", "class"],
    div: ["className", "class"],
    span: ["className", "class", "style"],
    pre: ["className", "class", "tabIndex"],
    code: ["className", "class"],
    blockquote: ["className", "class"],
    p: ["className", "class"],
    a: [
      ["href", /^https?:\/\/|^mailto:|^#|^\/(?!\/)/],
      "target",
      "rel",
      "className",
      "class",
    ],
    img: [
      ["src", /^https:\/\/|^\/images\//],
      "alt",
      "title",
      "width",
      "height",
      "className",
      "class",
    ],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
};

export interface RenderOptions {
  /**
   * Portfolio case study: no lead paragraph or drop cap, and each H2 with
   * the content up to the next H2 wrapped in <section class="cs-sec"
   * data-reveal>. The section whose heading matches `panelHeading` (ignoring
   * case and curly apostrophes) also gets "cs-sec--limits".
   */
  caseStudy?: { panelHeading: string };
}

function normaliseHeading(text: string): string {
  return text.replace(/[‘’]/g, "'").trim().toLowerCase();
}

// Runs after rehypePostEnhance, so it only regroups already-sanitised nodes
// into generated <section> wrappers; the sanitiser schema is unchanged.
function rehypeCaseStudySections(headings: Heading[], panelHeading: string) {
  return (tree: HastRoot) => {
    const panel = normaliseHeading(panelHeading);
    const children: HastRoot["children"] = [];
    let section: HastElement | null = null;
    let h2Index = 0;

    for (const node of tree.children) {
      if (node.type === "element" && (node as HastElement).tagName === "h2") {
        const heading = headings[h2Index++];
        const className = ["cs-sec"];
        if (heading && normaliseHeading(heading.text) === panel) {
          className.push("cs-sec--limits");
        }
        section = {
          type: "element",
          tagName: "section",
          properties: { className, dataReveal: "" },
          children: [],
        };
        children.push(section);
      }
      if (section) section.children.push(node as HastElement);
      else children.push(node);
    }

    tree.children = children;
  };
}

export async function renderMarkdownWithHeadings(
  content: string,
  options: RenderOptions = {}
): Promise<{ html: string; headings: Heading[] }> {
  const highlighter = await getHighlighter();
  const headings: Heading[] = [];
  const caseStudy = options.caseStudy;

  const processor = unified()
    .use(remarkParse)
    .use(remarkEnhancements, { lead: !caseStudy })
    .use(remarkRehype)
    .use(rehypeShiki, highlighter)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypePostEnhance, headings);
  if (caseStudy) {
    processor.use(rehypeCaseStudySections, headings, caseStudy.panelHeading);
  }
  const file = await processor.use(rehypeStringify).process(content);

  return { html: String(file), headings };
}

export async function renderMarkdown(
  content: string,
  options: RenderOptions = {}
): Promise<string> {
  const { html } = await renderMarkdownWithHeadings(content, options);
  return html;
}
