"use client";

import { useMemo } from "react";
import { renderSafeMarkdown } from "@/lib/security/markdown";

interface MarkdownBodyProps {
  source: string;
  className?: string;
}

/**
 * Renders imported and user-authored markdown for research surfaces. Raw HTML,
 * executable URL schemes, event handlers, and other active content are removed
 * before the result reaches `dangerouslySetInnerHTML`. External links open in
 * a separate, opener-isolated tab; relative links stay inside the application.
 */
export function MarkdownBody({ source, className }: MarkdownBodyProps) {
  const html = useMemo(() => renderSafeMarkdown(source), [source]);
  return (
    <div
      className={`markdown-body ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
