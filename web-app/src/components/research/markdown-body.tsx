"use client";

import { useMemo } from "react";
import { marked } from "marked";

interface MarkdownBodyProps {
  source: string;
  className?: string;
}

// Configure marked once at module load — GFM + smartypants-ish line breaks.
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Renders user-authored markdown for /research dispatches and ticker notes.
 * Self-content from localStorage, so HTML is intentionally unsanitised — the
 * threat surface is "user attacks themselves," which is not a real threat.
 * If we ever shift to multi-user content, swap in DOMPurify here.
 */
export function MarkdownBody({ source, className }: MarkdownBodyProps) {
  const html = useMemo(() => marked.parse(source, { async: false }) as string, [source]);
  return (
    <div
      className={`markdown-body ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
