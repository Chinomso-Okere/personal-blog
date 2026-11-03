import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter, type Highlighter } from "shiki";
import type { Root as MdastRoot, Node as MdastNode } from "mdast";
import type { Root as HastRoot, Element as HastElement, Node as HastNode } from "hast";

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
              settings: { foreground: "#E0A05A" },
            },
            {
              scope: ["string", "string.quoted"],
              settings: { foreground: "#B8C08A" },
            },
            {
              scope: ["entity.name.function", "support.function"],
              settings: { foreground: "#ECD9AC" },
            },
            {
              scope: ["comment", "punctuation.definition.comment"],
              settings: { foreground: "#8C8066", fontStyle: "italic" },
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

function remarkEnhancements() {
  return (tree: MdastRoot) => {
    let firstP = true;
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

const sanitizeSchema: SanitizeOptions = {
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

export async function renderMarkdown(content: string): Promise<string> {
  const highlighter = await getHighlighter();

  const file = await unified()
    .use(remarkParse)
    .use(remarkEnhancements)
    .use(remarkRehype)
    .use(rehypeShiki, highlighter)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(content);

  return String(file);
}
