/**
 * SPEC-023 W8.G — Copy-to-ChatGPT markdown emitter.
 *
 * Renders a {@link Thesis} as the §1 input-template markdown blob from
 * `docs/research-framework.md`, and builds the full "fact-check my thesis"
 * prompt by prepending the §10 prompt verbatim.
 *
 * The §10 prompt text is duplicated here as a string constant so the markdown
 * emitter has no filesystem / asset dependency — see the docstring on
 * {@link CHATGPT_REVIEW_PROMPT}.
 */

import type { Thesis } from "@/lib/domain/thesis";

/**
 * The verbatim §10 prompt from `docs/research-framework.md`. Update this
 * constant whenever that section of the framework doc changes.
 */
export const CHATGPT_REVIEW_PROMPT = `Act as my long-term stock thesis review partner.

I will give you a ticker, my thesis, my position, and what I am thinking about doing. Your job is to:

1. Restate my thesis clearly.
2. Fact-check it using the latest company reports, filings, market data, macro data, and credible industry sources.
3. Separate core thesis drivers from optional upside.
4. Analyze fundamentals: revenue, margins, free cash flow, balance sheet, guidance, and quality of earnings.
5. Analyze market position, growth runway, moat, competition, and roadmap.
6. Analyze valuation using multiple methods and explain what the current price assumes.
7. Build worst-case, base-case, and better-case scenarios.
8. Create a green/yellow/red checklist for adding, holding, trimming, or stopping an averaging-down plan.
9. Tell me what I may be missing, what I may be overvaluing, and what I should monitor next quarter.

Use clear tables when helpful. Be honest and challenge my assumptions. Do not give me personal financial advice or tell me exactly what to buy or sell. Give me a decision framework.`;

const PLANNED_ACTION_LABEL: Record<NonNullable<Thesis["plannedAction"]>, string> = {
  hold: "hold",
  add: "add",
  trim: "trim",
  sell: "sell",
  watch: "watch",
};

function fmtMoneyRaw(n: number): string {
  // Same shape as the framework template — "$148.20", no thousand-separator.
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function bulletLines(items: readonly string[]): string {
  return items
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => `- ${s}`)
    .join("\n");
}

function findLevelPrice(thesis: Thesis, level: 1 | 2 | 3): string {
  const lvl = thesis.tradeLevels.find(
    (t) => t.kind === "add" && t.level === level,
  );
  return lvl ? fmtMoneyRaw(lvl.price) : "";
}

/**
 * Render a thesis as the §1 input-template markdown. The fields follow the
 * exact order and labels from `docs/research-framework.md` so the user can
 * paste this straight into ChatGPT (or any other LLM) for fact-checking.
 *
 * Missing fields render as empty values rather than being skipped — this
 * makes it obvious to ChatGPT (and the user) which prompts went unanswered.
 */
export function thesisToMarkdown(thesis: Thesis): string {
  const lines: string[] = [];

  lines.push(`Company/ticker: ${thesis.symbol}`);
  lines.push(
    `Current price: ${
      thesis.currentPriceAtCreation !== undefined
        ? fmtMoneyRaw(thesis.currentPriceAtCreation)
        : ""
    }`,
  );
  lines.push(
    `My average entry price: ${
      thesis.avgEntryPrice !== undefined ? fmtMoneyRaw(thesis.avgEntryPrice) : ""
    }`,
  );
  lines.push(
    `Current position size: ${
      thesis.positionSize !== undefined ? String(thesis.positionSize) : ""
    }`,
  );
  lines.push(`Time horizon: ${thesis.timeHorizon ?? ""}`);
  lines.push(
    `Planned action: ${
      thesis.plannedAction ? PLANNED_ACTION_LABEL[thesis.plannedAction] : ""
    }`,
  );
  lines.push("");

  lines.push("My thesis:");
  const thesisBullets = bulletLines(thesis.thesisPoints);
  lines.push(thesisBullets.length > 0 ? thesisBullets : "-");
  lines.push("");

  lines.push("My concerns:");
  lines.push(`- Valuation: ${thesis.concerns.valuation ?? ""}`);
  lines.push(`- Competition: ${thesis.concerns.competition ?? ""}`);
  lines.push(`- Macro: ${thesis.concerns.macro ?? ""}`);
  lines.push(`- Execution: ${thesis.concerns.execution ?? ""}`);
  lines.push(`- Other: ${thesis.concerns.other ?? ""}`);
  lines.push("");

  lines.push("My buying plan:");
  lines.push(`- Add level 1: ${findLevelPrice(thesis, 1)}`);
  lines.push(`- Add level 2: ${findLevelPrice(thesis, 2)}`);
  lines.push(`- Add level 3: ${findLevelPrice(thesis, 3)}`);
  lines.push(
    `- Maximum position size: ${
      thesis.maxPositionSize !== undefined ? fmtMoneyRaw(thesis.maxPositionSize) : ""
    }`,
  );
  lines.push("");

  lines.push("Questions I want answered:");
  const questionBullets = bulletLines(thesis.questions);
  lines.push(questionBullets.length > 0 ? questionBullets : "-");

  return lines.join("\n");
}

/**
 * Build the full ChatGPT review prompt: §10 system instructions, blank line,
 * "Here is my stock thesis:" preamble, and the §1 markdown rendering of the
 * thesis.
 */
export function buildChatGPTPrompt(thesis: Thesis): string {
  const markdown = thesisToMarkdown(thesis);
  return `${CHATGPT_REVIEW_PROMPT}\n\nHere is my stock thesis:\n${markdown}\n`;
}
