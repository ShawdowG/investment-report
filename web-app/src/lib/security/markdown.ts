import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const MARKDOWN_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

export function renderSafeMarkdown(source: string): string {
  const rendered = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(rendered, {
    allowedTags: MARKDOWN_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      code: ["class"],
      td: ["align"],
      th: ["align"],
    },
    allowedClasses: {
      code: [/^language-[\w-]+$/],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => {
        const href = attribs.href ?? "";
        const isExternal = /^https?:\/\//i.test(href);
        const { target: _target, rel: _rel, ...safeAttribs } = attribs;
        return {
          tagName: "a",
          attribs: isExternal
            ? {
                ...safeAttribs,
                target: "_blank",
                rel: "noopener noreferrer",
              }
            : safeAttribs,
        };
      },
    },
  });
}
