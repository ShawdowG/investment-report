/**
 * SPEC-025 W9.A — Heuristic parser for ChatGPT response markdown.
 *
 * Takes the markdown blob a user pastes back from a ChatGPT session (after
 * running the §10 prompt from `docs/research-framework.md`) and extracts
 * structured fields into a {@link ParsedThesisFragment}. The output is
 * deliberately sparse — anything we couldn't classify lands in
 * {@link ImportReport.unmatched} so the UI can route it to `analysisNotes`
 * or a new `ResearchNote`.
 *
 * Heuristics:
 * 1. Section headers (h1–h3, case-insensitive) drive routing.
 *    Recognised: bull case / thesis / why I might be right ; bear case /
 *    risks / why I might be wrong / concerns ; fundamentals ; market
 *    position ; valuation ; scenarios ; checklist ; recommendation ;
 *    questions ; core / optional drivers ; light.
 * 2. Under bull-case-like sections, bullets (`-` / `*`) become
 *    {@link ParsedThesisFragment.thesisPoints}.
 * 3. Under bear-case / risks / concerns, bullets are split by leading
 *    keyword (`Valuation:`, `Competition:`, ...) into
 *    {@link Concerns}. Unlabelled bullets land in `concerns.other`
 *    joined with `\n`.
 * 4. Under fundamentals / valuation / market position, the parser tries
 *    keyword-prefixed bullets first (`Revenue growth: ...`) and then
 *    falls back to a GFM table whose rows are `| Field | Value |`.
 * 5. Under scenarios, the parser first tries a GFM table with one row
 *    per scenario kind (worst / bear / base / better / moonshot) and the
 *    framework's column order (kind | business | valuation | price |
 *    probability | meaning). If no table is found, it walks h3/h4
 *    subsections named after the kinds and reads bullets like
 *    `Business: ...`, `Valuation: ...`, `Price target: ...`,
 *    `Probability: ...`.
 * 6. Under checklist, the parser looks for `[x]` / `[ ]` markers
 *    grouped by h3 sub-headers (Green / Yellow / Red / Trim or Sell)
 *    and produces boolean arrays sized to the framework constants
 *    (GREEN_CHECK_COUNT etc.).
 * 7. Unrecognised headers + freeform prose between sections are appended
 *    verbatim to {@link ImportReport.unmatched}.
 *
 * The parser is pure regex / string-processing — no LLM call. It is
 * intentionally forgiving: partial parses are fine, and anything the
 * user disagrees with can be skipped in the diff preview (W9.B).
 *
 * Sample input fragment that the parser will populate:
 *
 *   ## Bull case
 *   - International expansion has runway
 *   - Pricing power intact
 *
 *   ## Bear case
 *   - Valuation: forward P/E is in the top decile
 *   - Competition: hyperscalers are bundling
 *
 *   ## Scenarios
 *   | Kind | Business | Valuation | Price | Probability |
 *   | --- | --- | --- | --- | --- |
 *   | Worst | growth slows | multiple compresses | 50 | 10 |
 *   | Base | management delivers | normal multiple | 100 | 50 |
 *
 *   ## Checklist
 *   ### Green
 *   - [x] Price fell on market weakness
 *   - [ ] Margins are stable or expanding
 *
 * Yields: thesisPoints (2), concerns {valuation, competition}, scenarios
 * (worst + base with priceTarget and probability), greenChecks
 * [true, false, false, ...].
 */

import type {
  ClassifiedThesisPoint,
  Concerns,
  FundamentalsSnapshot,
  MarketPositionNotes,
  Scenario,
  ScenarioKind,
  ValuationNotes,
} from "@/lib/domain/thesis";
import {
  GREEN_CHECK_COUNT,
  RED_CHECK_COUNT,
  TRIM_SELL_CHECK_COUNT,
  YELLOW_CHECK_COUNT,
} from "@/lib/domain/thesis";

export interface ParsedThesisFragment {
  thesisPoints?: string[];
  concerns?: Partial<Concerns>;
  fundamentals?: Partial<FundamentalsSnapshot>;
  marketPosition?: Partial<MarketPositionNotes>;
  valuation?: Partial<ValuationNotes>;
  scenarios?: Partial<Scenario>[];
  classifiedPoints?: ClassifiedThesisPoint[];
  greenChecks?: boolean[];
  yellowChecks?: boolean[];
  redChecks?: boolean[];
  trimSellChecks?: boolean[];
  coreDrivers?: string[];
  optionalDrivers?: string[];
  questions?: string[];
}

export interface ImportReport {
  parsed: ParsedThesisFragment;
  unmatched: string;
  matchedFieldCount: number;
  totalFieldCount: number;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Section detection                                                  */
/* ------------------------------------------------------------------ */

type SectionKind =
  | "bull"
  | "bear"
  | "fundamentals"
  | "marketPosition"
  | "coreDrivers"
  | "optionalDrivers"
  | "valuation"
  | "scenarios"
  | "checklist"
  | "checklistGreen"
  | "checklistYellow"
  | "checklistRed"
  | "checklistTrimSell"
  | "questions"
  | "recommendation"
  | "light"
  | "scenarioWorst"
  | "scenarioBear"
  | "scenarioBase"
  | "scenarioBetter"
  | "scenarioMoonshot"
  | "unknown";

interface Section {
  kind: SectionKind;
  rawHeader: string;
  level: number; // 1..6
  lines: string[]; // body lines (no leading/trailing blanks)
}

/**
 * Classify a heading text into a {@link SectionKind}. The matching is
 * case-insensitive and tolerant of trailing colons / parentheticals like
 * "(§4)".
 */
function classifyHeading(headingRaw: string): SectionKind {
  const h = headingRaw
    .toLowerCase()
    .replace(/[():§\d.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Scenarios subheadings — check before broader rules.
  if (/^worst\s*case$/.test(h) || /^worst$/.test(h)) return "scenarioWorst";
  if (/^bear\s*case$/.test(h) && !/risk|concern/.test(h)) return "scenarioBear";
  if (/^base\s*case$/.test(h) || /^base$/.test(h)) return "scenarioBase";
  if (/^better\s*case$/.test(h) || /^better$/.test(h) || /^bull\s*case\s*\+/.test(h))
    return "scenarioBetter";
  if (/^moonshot/.test(h)) return "scenarioMoonshot";

  if (/^(bull\s*case|thesis|why\s*i\s*might\s*be\s*right|my\s*thesis|thesis\s*points|restate)/.test(h))
    return "bull";

  if (
    /^(bear\s*case|risks?|why\s*i\s*might\s*be\s*wrong|concerns?|what\s*i.*missing|what.*overvaluing)/.test(
      h,
    )
  )
    return "bear";

  if (/^fundamental(s|\s*review)?$/.test(h) || /^fundamental\s*analysis/.test(h))
    return "fundamentals";

  if (/^market\s*position/.test(h) || /^moat/.test(h) || /^competition/.test(h))
    return "marketPosition";

  if (/^core\s*(growth\s*)?drivers?$/.test(h)) return "coreDrivers";
  if (/^optional\s*(upside\s*)?drivers?$/.test(h) || /^optional\s*upside$/.test(h))
    return "optionalDrivers";

  if (/^valuation/.test(h)) return "valuation";

  if (/^scenarios?$/.test(h) || /^scenario\s*analysis/.test(h)) return "scenarios";

  if (/^green(\s*light)?$/.test(h)) return "checklistGreen";
  if (/^yellow(\s*light)?$/.test(h)) return "checklistYellow";
  if (/^red(\s*light)?$/.test(h)) return "checklistRed";
  if (/^trim\s*(or\s*)?sell/.test(h)) return "checklistTrimSell";

  if (
    /^(add\/?hold\/?sell|addholdsell)\s*checklist/.test(h) ||
    /^checklist/.test(h) ||
    /^addhold/.test(h)
  )
    return "checklist";

  if (/^questions?/.test(h) || /^things\s*to\s*monitor/.test(h)) return "questions";
  if (/^recommendation/.test(h) || /^decision\s*framework/.test(h))
    return "recommendation";
  if (/^light$/.test(h) || /^add\s*hold\s*sell\s*light/.test(h)) return "light";

  return "unknown";
}

/**
 * Split a markdown document into top-level sections by ATX headers. The
 * preamble (anything before the first header) is returned under the
 * synthetic `unknown` kind with `level: 0`.
 */
function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  function flush() {
    if (!current) return;
    // Trim leading / trailing blank lines from body.
    while (current.lines.length > 0 && current.lines[0]!.trim() === "") {
      current.lines.shift();
    }
    while (
      current.lines.length > 0 &&
      current.lines[current.lines.length - 1]!.trim() === ""
    ) {
      current.lines.pop();
    }
    sections.push(current);
    current = null;
  }

  for (const rawLine of lines) {
    const headerMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(rawLine);
    if (headerMatch) {
      flush();
      const level = headerMatch[1]!.length;
      const headerText = headerMatch[2]!.trim();
      current = {
        kind: classifyHeading(headerText),
        rawHeader: rawLine,
        level,
        lines: [],
      };
    } else {
      if (!current) {
        current = { kind: "unknown", rawHeader: "", level: 0, lines: [] };
      }
      current.lines.push(rawLine);
    }
  }
  flush();
  return sections;
}

/* ------------------------------------------------------------------ */
/* Bullet / table helpers                                             */
/* ------------------------------------------------------------------ */

/** Extract `- ...` / `* ...` / `1. ...` bullet bodies from a block. */
function extractBullets(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (m) {
      const body = m[1]!.trim();
      if (body.length > 0) out.push(body);
    }
  }
  return out;
}

/**
 * Strip a checkbox prefix and return `{ checked, body }` if present.
 * Returns null if the bullet is not a checkbox.
 */
function parseCheckbox(bullet: string): { checked: boolean; body: string } | null {
  const m = /^\[([xX ])\]\s*(.*)$/.exec(bullet);
  if (!m) return null;
  return { checked: m[1] !== " ", body: m[2]!.trim() };
}

/**
 * Detect a GFM table inside a block of lines. Returns the row cells
 * (excluding the header + separator rows) or null if no table is found.
 * Headers are returned separately.
 */
function extractTable(lines: string[]): { header: string[]; rows: string[][] } | null {
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i]!;
    const next = lines[i + 1]!;
    if (line.includes("|") && /\|[\s:\-]+\|/.test(next)) {
      headerLineIdx = i;
      break;
    }
  }
  if (headerLineIdx === -1) return null;

  const header = splitTableRow(lines[headerLineIdx]!);
  const rows: string[][] = [];
  for (let i = headerLineIdx + 2; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes("|") || line.trim() === "") break;
    rows.push(splitTableRow(line));
  }
  return { header, rows };
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((s) => s.trim());
}

/* ------------------------------------------------------------------ */
/* Field parsers                                                      */
/* ------------------------------------------------------------------ */

/** Patterns matching `Keyword: value` style bullets, case-insensitive. */
function matchKeyword(
  bullet: string,
  keywords: readonly { re: RegExp; key: string }[],
): { key: string; value: string } | null {
  // Handle bold prefixes ("**Valuation:** foo") and headings inside
  // bullets ("- Valuation – foo").
  const cleaned = bullet
    .replace(/^\*\*([^*]+)\*\*/, "$1")
    .replace(/^__([^_]+)__/, "$1");
  for (const { re, key } of keywords) {
    const m = re.exec(cleaned);
    if (m) {
      const value = cleaned.slice(m[0]!.length).replace(/^[\s:–-]+/, "").trim();
      if (value.length > 0) return { key, value };
    }
  }
  return null;
}

const CONCERN_KEYWORDS = [
  { re: /^valuation/i, key: "valuation" },
  { re: /^competition/i, key: "competition" },
  { re: /^macro(economic)?/i, key: "macro" },
  { re: /^execution( risk)?/i, key: "execution" },
] as const;

const FUNDAMENTAL_KEYWORDS = [
  { re: /^revenue\s*(growth)?/i, key: "revenueGrowth" },
  { re: /^margins?/i, key: "margins" },
  { re: /^(free\s*cash\s*flow|fcf)/i, key: "fcf" },
  { re: /^balance\s*sheet/i, key: "balanceSheet" },
  { re: /^(segment|region)(\/region|\/segment)?(\s*growth)?/i, key: "segmentGrowth" },
  { re: /^guidance/i, key: "guidance" },
  { re: /^capital\s*allocation/i, key: "capitalAllocation" },
] as const;

const MARKET_POSITION_KEYWORDS = [
  { re: /^(real\s*)?competition/i, key: "realCompetition" },
  { re: /^dominance(\s*today)?/i, key: "dominanceToday" },
  { re: /^(durability|moat)/i, key: "durability" },
  { re: /^new\s*markets?/i, key: "newMarkets" },
  { re: /^(new\s*areas?\s*proven|proven)/i, key: "newAreasProven" },
] as const;

const VALUATION_KEYWORDS = [
  { re: /^metrics?(\s*tracked)?/i, key: "metricsTracked" },
  { re: /^(growth(\s*assumed)?|implied\s*growth)/i, key: "growthAssumed" },
  { re: /^(margin(\s*assumed)?|implied\s*margin)/i, key: "marginAssumed" },
  { re: /^(multiple(\s*assumed)?|implied\s*multiple)/i, key: "multipleAssumed" },
  { re: /^notes?/i, key: "notes" },
] as const;

const SCENARIO_KIND_BY_LABEL: Record<string, ScenarioKind> = {
  worst: "worst",
  "worst case": "worst",
  bear: "bear",
  "bear case": "bear",
  base: "base",
  "base case": "base",
  better: "better",
  "better case": "better",
  bull: "better",
  "bull case": "better",
  moonshot: "moonshot",
  "moonshot case": "moonshot",
};

const SCENARIO_SECTION_KIND: Partial<Record<SectionKind, ScenarioKind>> = {
  scenarioWorst: "worst",
  scenarioBear: "bear",
  scenarioBase: "base",
  scenarioBetter: "better",
  scenarioMoonshot: "moonshot",
};

/* ------------------------------------------------------------------ */
/* Parse concerns                                                     */
/* ------------------------------------------------------------------ */

function parseConcerns(lines: string[]): Partial<Concerns> | undefined {
  const bullets = extractBullets(lines);
  if (bullets.length === 0) return undefined;
  const out: Partial<Concerns> = {};
  const others: string[] = [];
  for (const bullet of bullets) {
    const matched = matchKeyword(bullet, CONCERN_KEYWORDS);
    if (matched) {
      const key = matched.key as keyof Concerns;
      out[key] = out[key] ? `${out[key]}\n${matched.value}` : matched.value;
    } else {
      others.push(bullet);
    }
  }
  if (others.length > 0) {
    out.other = others.join("\n");
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/* ------------------------------------------------------------------ */
/* Parse keyword-or-table fields (fundamentals / valuation / market)  */
/* ------------------------------------------------------------------ */

type KeywordList = readonly { re: RegExp; key: string }[];

function parseKeywordOrTable<T>(
  lines: string[],
  keywords: KeywordList,
): Partial<T> | undefined {
  const out: Record<string, string> = {};

  // Pass 1: keyword-prefixed bullets.
  const bullets = extractBullets(lines);
  for (const bullet of bullets) {
    const matched = matchKeyword(bullet, keywords);
    if (matched) {
      out[matched.key] = out[matched.key]
        ? `${out[matched.key]}\n${matched.value}`
        : matched.value;
    }
  }

  // Pass 2: a `| Field | Value |` table (only if pass 1 didn't fill).
  if (Object.keys(out).length === 0) {
    const table = extractTable(lines);
    if (table && table.rows.length > 0) {
      // Heuristic: first column is the field name, last is the value.
      for (const row of table.rows) {
        if (row.length < 2) continue;
        const label = row[0]!;
        // Concatenate the remaining columns so a 4-column table like
        // "Area | What to check | What good looks like | Red flag"
        // still yields useful prose under one key.
        const value = row.slice(1).join(" · ");
        for (const { re, key } of keywords) {
          if (re.test(label)) {
            out[key] = value;
            break;
          }
        }
      }
    }
  }

  return Object.keys(out).length > 0 ? (out as Partial<T>) : undefined;
}

/* ------------------------------------------------------------------ */
/* Parse scenarios                                                    */
/* ------------------------------------------------------------------ */

/**
 * Try to extract a 0..1 probability from a free-text cell. Accepts
 * "50%", "0.5", "50". Returns undefined if no plausible number is found.
 */
function parseProbability(cell: string): number | undefined {
  const m = /(-?\d+(?:\.\d+)?)\s*%?/.exec(cell);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  // If the source looked like 0.5 (no %), assume fractional and scale.
  if (n <= 1 && !cell.includes("%") && cell.trim() !== m[1]) return n * 100;
  if (n <= 1 && !cell.includes("%")) return n * 100;
  return n;
}

/** Parse a price target — accepts "$120", "120", "USD 120". */
function parsePrice(cell: string): number | undefined {
  const m = /\$?\s*(-?\d+(?:[\.,]\d+)?)/.exec(cell.replace(/[\s,]/g, ""));
  if (!m) return undefined;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function scenarioFromTableRow(
  row: string[],
  header: string[],
): Partial<Scenario> | null {
  if (row.length === 0) return null;
  const labelCell = row[0]!.toLowerCase().replace(/[*_`]/g, "").trim();
  const kind = SCENARIO_KIND_BY_LABEL[labelCell];
  if (!kind) return null;

  const sc: Partial<Scenario> = { kind };
  // Match the framework's canonical column order: kind | business |
  // valuation | price | probability | meaning. Header introspection
  // makes the parser tolerant of column reordering.
  const headerKeys = header.map((h) => h.toLowerCase());

  function findIdx(...needles: string[]): number {
    for (let i = 1; i < headerKeys.length; i++) {
      const cell = headerKeys[i]!;
      if (needles.some((n) => cell.includes(n))) return i;
    }
    return -1;
  }

  const businessIdx = findIdx("business");
  const valuationIdx = findIdx("valuation");
  const priceIdx = findIdx("price", "target");
  const probabilityIdx = findIdx("probability", "prob", "likelihood");
  const meaningIdx = findIdx("meaning", "what it means", "result");

  if (businessIdx > 0 && row[businessIdx]) sc.businessAssumptions = row[businessIdx];
  if (valuationIdx > 0 && row[valuationIdx]) sc.valuationAssumptions = row[valuationIdx];
  if (priceIdx > 0 && row[priceIdx]) {
    const p = parsePrice(row[priceIdx]!);
    if (p !== undefined) sc.priceTarget = p;
  }
  if (probabilityIdx > 0 && row[probabilityIdx]) {
    const pr = parseProbability(row[probabilityIdx]!);
    if (pr !== undefined) sc.probability = pr;
  }
  if (meaningIdx > 0 && row[meaningIdx]) sc.meaning = row[meaningIdx];

  // Fallback: if header didn't expose the canonical names, fill in
  // positional defaults so a vanilla 5-col table still works.
  if (
    sc.businessAssumptions === undefined &&
    sc.valuationAssumptions === undefined &&
    sc.priceTarget === undefined
  ) {
    if (row[1]) sc.businessAssumptions = row[1];
    if (row[2]) sc.valuationAssumptions = row[2];
    if (row[3]) {
      const p = parsePrice(row[3]);
      if (p !== undefined) sc.priceTarget = p;
    }
    if (row[4]) {
      const pr = parseProbability(row[4]);
      if (pr !== undefined) sc.probability = pr;
    }
    if (row[5]) sc.meaning = row[5];
  }

  return sc;
}

const SCENARIO_BULLET_KEYWORDS = [
  { re: /^business(\s*assumption(s)?)?/i, key: "businessAssumptions" },
  { re: /^valuation(\s*assumption(s)?)?/i, key: "valuationAssumptions" },
  { re: /^(price\s*target|target\s*price|price)/i, key: "priceTarget" },
  { re: /^(probability|likelihood|odds)/i, key: "probability" },
  { re: /^(what\s*it\s*means|meaning|result|implication)/i, key: "meaning" },
] as const;

function scenarioFromBullets(
  kind: ScenarioKind,
  lines: string[],
): Partial<Scenario> | null {
  const bullets = extractBullets(lines);
  if (bullets.length === 0) {
    // Some ChatGPT outputs put a single prose paragraph under the subhead.
    const prose = lines.join("\n").trim();
    if (prose.length === 0) return null;
    return { kind, businessAssumptions: prose };
  }
  const sc: Partial<Scenario> = { kind };
  let matchedAny = false;
  for (const bullet of bullets) {
    const matched = matchKeyword(bullet, SCENARIO_BULLET_KEYWORDS);
    if (!matched) continue;
    matchedAny = true;
    if (matched.key === "priceTarget") {
      const n = parsePrice(matched.value);
      if (n !== undefined) sc.priceTarget = n;
    } else if (matched.key === "probability") {
      const n = parseProbability(matched.value);
      if (n !== undefined) sc.probability = n;
    } else {
      (sc as Record<string, unknown>)[matched.key] = matched.value;
    }
  }
  if (!matchedAny) {
    // Treat the whole block as the business assumption.
    sc.businessAssumptions = bullets.join("\n");
  }
  return sc;
}

/* ------------------------------------------------------------------ */
/* Parse checklists                                                   */
/* ------------------------------------------------------------------ */

/**
 * Collect checkbox states from a block of lines. Returns the booleans
 * in source order; the caller pads / truncates to the framework length.
 */
function collectChecks(lines: string[]): boolean[] {
  const bullets = extractBullets(lines);
  const out: boolean[] = [];
  for (const bullet of bullets) {
    const cb = parseCheckbox(bullet);
    if (cb) out.push(cb.checked);
  }
  return out;
}

function padChecks(values: boolean[], length: number): boolean[] {
  const out = new Array<boolean>(length).fill(false);
  for (let i = 0; i < Math.min(values.length, length); i++) {
    out[i] = values[i]!;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Top-level driver                                                   */
/* ------------------------------------------------------------------ */

function pushUnmatched(buf: string[], section: Section): void {
  if (section.rawHeader) buf.push(section.rawHeader);
  for (const line of section.lines) buf.push(line);
  buf.push("");
}

interface FieldCounters {
  matched: number;
  total: number;
}

function bumpField(counters: FieldCounters, filled: boolean): void {
  counters.total += 1;
  if (filled) counters.matched += 1;
}

/**
 * Heuristic parser for ChatGPT response markdown — see the module
 * docstring for the recognised section names and column shapes. The
 * function always returns a value; failures show up as empty fragment
 * fields plus a warning + unmatched markdown.
 */
export function parseChatGPTResponse(markdown: string): ImportReport {
  const warnings: string[] = [];
  const unmatchedBuf: string[] = [];
  const parsed: ParsedThesisFragment = {};
  const counters: FieldCounters = { matched: 0, total: 0 };

  if (!markdown || markdown.trim().length === 0) {
    return {
      parsed,
      unmatched: "",
      matchedFieldCount: 0,
      totalFieldCount: 0,
      warnings: ["Empty input"],
    };
  }

  const sections = splitIntoSections(markdown);

  // Group scenario subsections so we can pick the table OR the bullets
  // form, not both.
  const scenarioBucket: Section[] = [];
  // Group checklist subsections so a single "## Checklist" parent can
  // contain ### Green / ### Yellow / ### Red / ### Trim or sell.
  let inChecklist = false;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!;

    // Preamble (text before any header) is unmatched unless it was the
    // only thing the user pasted.
    if (section.level === 0) {
      // Treat preamble bullets as thesis points if we have NO other
      // bull-case section.
      const hasBullCase = sections.some((s) => s.kind === "bull");
      const bullets = extractBullets(section.lines);
      if (!hasBullCase && bullets.length > 0) {
        parsed.thesisPoints = bullets;
        bumpField(counters, true);
      } else {
        pushUnmatched(unmatchedBuf, section);
      }
      continue;
    }

    // Track scenarios sub-headers under the top-level scenarios section
    // (h2 + h3 stitching).
    if (
      section.kind === "scenarioWorst" ||
      section.kind === "scenarioBear" ||
      section.kind === "scenarioBase" ||
      section.kind === "scenarioBetter" ||
      section.kind === "scenarioMoonshot"
    ) {
      scenarioBucket.push(section);
      continue;
    }

    // Checklist sub-headers absorbed by parent checklist parsing.
    if (
      section.kind === "checklistGreen" ||
      section.kind === "checklistYellow" ||
      section.kind === "checklistRed" ||
      section.kind === "checklistTrimSell"
    ) {
      const checks = collectChecks(section.lines);
      if (section.kind === "checklistGreen") {
        parsed.greenChecks = padChecks(checks, GREEN_CHECK_COUNT);
        bumpField(counters, checks.length > 0);
      } else if (section.kind === "checklistYellow") {
        parsed.yellowChecks = padChecks(checks, YELLOW_CHECK_COUNT);
        bumpField(counters, checks.length > 0);
      } else if (section.kind === "checklistRed") {
        parsed.redChecks = padChecks(checks, RED_CHECK_COUNT);
        bumpField(counters, checks.length > 0);
      } else {
        parsed.trimSellChecks = padChecks(checks, TRIM_SELL_CHECK_COUNT);
        bumpField(counters, checks.length > 0);
      }
      continue;
    }

    switch (section.kind) {
      case "bull": {
        const bullets = extractBullets(section.lines);
        if (bullets.length > 0) {
          parsed.thesisPoints = bullets;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "bear": {
        const c = parseConcerns(section.lines);
        if (c) {
          parsed.concerns = c;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "fundamentals": {
        const f = parseKeywordOrTable<FundamentalsSnapshot>(
          section.lines,
          FUNDAMENTAL_KEYWORDS,
        );
        if (f) {
          parsed.fundamentals = f;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "marketPosition": {
        const mp = parseKeywordOrTable<MarketPositionNotes>(
          section.lines,
          MARKET_POSITION_KEYWORDS,
        );
        if (mp) {
          parsed.marketPosition = mp;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "valuation": {
        const v = parseKeywordOrTable<ValuationNotes>(section.lines, VALUATION_KEYWORDS);
        if (v) {
          parsed.valuation = v;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "scenarios": {
        // Try a table first.
        const table = extractTable(section.lines);
        const scenarios: Partial<Scenario>[] = [];
        if (table) {
          for (const row of table.rows) {
            const sc = scenarioFromTableRow(row, table.header);
            if (sc) scenarios.push(sc);
          }
        }
        if (scenarios.length > 0) {
          parsed.scenarios = scenarios;
          bumpField(counters, true);
        } else {
          // No table — leave room for subsections that follow.
          if (section.lines.length > 0) {
            const prose = section.lines.join("\n").trim();
            if (prose.length > 0) {
              warnings.push("Scenarios section had prose but no table — kept as unmatched");
              pushUnmatched(unmatchedBuf, section);
            }
          }
        }
        break;
      }
      case "checklist": {
        // Section may contain its own checkboxes or be a parent for the
        // green/yellow/red subsections that follow. Try to harvest any
        // raw checkboxes here, but real per-color parsing happens above.
        inChecklist = true;
        if (parsed.greenChecks === undefined) {
          const checks = collectChecks(section.lines);
          if (checks.length > 0) {
            // Best-effort: dump into greenChecks if user didn't sub-divide.
            parsed.greenChecks = padChecks(checks, GREEN_CHECK_COUNT);
            bumpField(counters, true);
          }
        }
        break;
      }
      case "questions": {
        const bullets = extractBullets(section.lines);
        if (bullets.length > 0) {
          parsed.questions = bullets;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "coreDrivers": {
        const bullets = extractBullets(section.lines);
        if (bullets.length > 0) {
          parsed.coreDrivers = bullets;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "optionalDrivers": {
        const bullets = extractBullets(section.lines);
        if (bullets.length > 0) {
          parsed.optionalDrivers = bullets;
          bumpField(counters, true);
        } else {
          pushUnmatched(unmatchedBuf, section);
        }
        break;
      }
      case "recommendation":
      case "light": {
        // We don't auto-classify lights — they live behind the manual
        // green/yellow/red switch in the form. Route to unmatched so the
        // user can paste them into analysisNotes.
        pushUnmatched(unmatchedBuf, section);
        break;
      }
      default: {
        pushUnmatched(unmatchedBuf, section);
        break;
      }
    }
  }

  // Resolve scenario subsections if the scenarios section didn't yield
  // a table.
  if (!parsed.scenarios && scenarioBucket.length > 0) {
    const scenarios: Partial<Scenario>[] = [];
    for (const section of scenarioBucket) {
      const kind = SCENARIO_SECTION_KIND[section.kind];
      if (!kind) continue;
      const sc = scenarioFromBullets(kind, section.lines);
      if (sc) scenarios.push(sc);
    }
    if (scenarios.length > 0) {
      parsed.scenarios = scenarios;
      bumpField(counters, true);
    }
  } else if (parsed.scenarios && scenarioBucket.length > 0) {
    // Both a table AND subsections — keep the table version, route
    // subsections into unmatched so the user can review.
    for (const section of scenarioBucket) {
      pushUnmatched(unmatchedBuf, section);
    }
  } else if (!parsed.scenarios) {
    // No scenarios at all but we saw subsections without a parent.
    for (const section of scenarioBucket) {
      pushUnmatched(unmatchedBuf, section);
    }
  }

  // Warnings for known partial-parse cases.
  if (parsed.scenarios) {
    for (const sc of parsed.scenarios) {
      if (sc.priceTarget === undefined) {
        warnings.push(`Scenario '${sc.kind}' has no price target`);
      }
    }
  }

  // Suppress unused-flag linter complaint.
  void inChecklist;

  const unmatched = unmatchedBuf.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    parsed,
    unmatched,
    matchedFieldCount: counters.matched,
    totalFieldCount: Math.max(counters.total, counters.matched),
    warnings,
  };
}
