/**
 * Server Component: converts markdown body to React elements at build time.
 * Handles: h1-h3, bullet lists, pipe tables, bold (**text**), paragraphs.
 * No external markdown library needed.
 */

interface MdRendererProps {
  markdown: string;
  className?: string;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function alignFor(dividers: string[], idx: number): "left" | "right" | "center" {
  const raw = dividers[idx] ?? "";
  if (raw.startsWith(":") && raw.endsWith(":")) return "center";
  if (raw.endsWith(":")) return "right";
  return "left";
}

export function MdRenderer({ markdown, className }: MdRendererProps) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(<ul key={`ul-${listKey++}`} className="my-2 space-y-1 pl-4">{listItems}</ul>);
      listItems = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Pipe table: detect header row followed by divider
    if (line.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushList();
      const headerCells = line.split("|").map((c) => c.trim()).filter(Boolean);
      const dividerCells = lines[i + 1].split("|").map((c) => c.trim()).filter(Boolean);
      i += 2;
      const bodyRows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].includes("|") &&
        lines[i].trim() &&
        !lines[i].trim().startsWith("## ")
      ) {
        bodyRows.push(lines[i].split("|").map((c) => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={`tbl-${i}`} className="my-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    style={{ textAlign: alignFor(dividerCells, ci) }}
                    className="px-3 py-2 font-medium"
                  >
                    {formatInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-t border-border">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{ textAlign: alignFor(dividerCells, ci) }}
                      className="px-3 py-1.5"
                    >
                      {formatInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(<h3 key={i} className="mb-1 mt-4 text-sm font-semibold">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(<h2 key={i} className="mb-2 mt-5 text-base font-semibold">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      elements.push(<h1 key={i} className="mb-2 mt-4 text-lg font-bold">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ")) {
      listItems.push(
        <li key={i} className="text-sm text-foreground/90">
          {formatInline(line.slice(2))}
        </li>
      );
    } else if (!line.trim()) {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="my-1.5 text-sm text-foreground/90">
          {formatInline(line)}
        </p>
      );
    }

    i++;
  }
  flushList();

  return <div className={className}>{elements}</div>;
}
