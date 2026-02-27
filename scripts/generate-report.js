#!/usr/bin/env node
'use strict';
/**
 * Generate a daily investment report from a market snapshot.
 *
 * Pipeline:
 *   gamma_snapshot.json  →  Claude Haiku (narrative only)  →  markdown report
 *
 * Usage:
 *   node scripts/generate-report.js [eu|us-open|pre-close] [options]
 *
 * Options:
 *   --snapshot  PATH   Path to gamma_snapshot.json (default: data/gamma_snapshot.json)
 *   --date      DATE   Override date YYYY-MM-DD (defaults to snapshot.date or today)
 *   --output    PATH   Output markdown file (default: reports/daily/{date}-{slot}.md)
 *   --dry-run          Print assembled markdown to stdout, do not write file
 *
 * Environment:
 *   ANTHROPIC_API_KEY  Required (or set in .env)
 */

const fs   = require('node:fs');
const path = require('node:path');

// Load .env if present
try {
  require('dotenv').config();
} catch (_) {}

const Anthropic = require('@anthropic-ai/sdk');
const { assembleMarkdown } = require('./lib/assemble-markdown.js');

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let slot = 'eu';
let snapshotPath = 'data/gamma_snapshot.json';
let dateOverride = null;
let outputPath = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--snapshot') { snapshotPath = args[++i]; }
  else if (a === '--date')     { dateOverride = args[++i]; }
  else if (a === '--output')   { outputPath = args[++i]; }
  else if (a === '--dry-run')  { dryRun = true; }
  else if (['eu', 'us-open', 'pre-close'].includes(a)) { slot = a; }
  else {
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }
}

const VALID_SLOTS = new Set(['eu', 'us-open', 'pre-close']);
if (!VALID_SLOTS.has(slot)) {
  console.error(`Invalid slot "${slot}". Must be one of: eu, us-open, pre-close`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load snapshot
// ---------------------------------------------------------------------------
const ROOT = process.cwd();
const resolvedSnapshot = path.isAbsolute(snapshotPath)
  ? snapshotPath
  : path.join(ROOT, snapshotPath);

if (!fs.existsSync(resolvedSnapshot)) {
  console.error(`Snapshot not found: ${resolvedSnapshot}`);
  console.error('Run first: python scripts/fetch-snapshot.py ' + slot);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(resolvedSnapshot, 'utf8'));

// Validate snapshot schema version
if (!snapshot.prices || typeof snapshot.prices !== 'object') {
  console.error('Invalid snapshot: missing "prices" object. Re-run fetch-snapshot.py.');
  process.exit(1);
}

const date = dateOverride || snapshot.date || new Date().toISOString().slice(0, 10);
const snapshotSlot = snapshot.slot || slot;
const effectiveSlot = slot !== 'eu' ? slot : snapshotSlot;

// Resolve output path
if (!outputPath && !dryRun) {
  outputPath = path.join(ROOT, 'reports', 'daily', `${date}-${effectiveSlot}.md`);
}

console.log(`\nGenerating report: ${date} / ${effectiveSlot}`);
console.log(`Snapshot: ${resolvedSnapshot} (${Object.keys(snapshot.prices).length} tickers)`);

// ---------------------------------------------------------------------------
// Build market context for LLM (minimal, factual)
// ---------------------------------------------------------------------------
const prices = snapshot.prices;
const macro  = snapshot.macro || {};

// Sort movers by absolute % change (biggest movers first)
const moverList = Object.values(prices)
  .filter(p => typeof p.changePct === 'number')
  .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

// Top 10 movers for LLM context
const topMovers = moverList.slice(0, 10).map(m => ({
  ticker:    m.symbol,
  name:      m.name,
  price:     m.price,
  change:    m.change,
  changePct: m.changePct,
}));

// Build macro string
const macroContext = [];
if (macro.VIX   && macro.VIX.price)   macroContext.push(`VIX ${macro.VIX.price.toFixed(1)} (${macro.VIX.changePct >= 0 ? '+' : ''}${macro.VIX.changePct.toFixed(2)}%)`);
if (macro.DXY   && macro.DXY.price)   macroContext.push(`DXY ${macro.DXY.price.toFixed(2)} (${macro.DXY.changePct >= 0 ? '+' : ''}${macro.DXY.changePct.toFixed(2)}%)`);
if (macro.US10Y && macro.US10Y.price) macroContext.push(`US10Y ${macro.US10Y.price.toFixed(2)}% yield (${macro.US10Y.changePct >= 0 ? '+' : ''}${macro.US10Y.changePct.toFixed(2)}%)`);
const macroStr = macroContext.length ? macroContext.join(' | ') : 'Macro data unavailable';

// Slot label
const SLOT_LABELS = {
  eu:          'EU/Nordic Morning session (09:30 Oslo)',
  'us-open':   'US Open +15m session',
  'pre-close': 'US Pre-close session (~1h before close)',
};

const userPrompt = `Market data for ${date} — ${SLOT_LABELS[effectiveSlot]}:

Top movers (sorted by absolute % change):
${topMovers.map(m => `  ${m.ticker} (${m.name}): ${m.price.toFixed(2)} | change ${m.change >= 0 ? '+' : ''}${m.change.toFixed(2)} | ${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}%`).join('\n')}

Macro: ${macroStr}

Generate a concise, trader-focused analysis. Be specific — reference actual tickers and percentages from the data above. Avoid generic statements.`;

// ---------------------------------------------------------------------------
// Call Claude Haiku with structured output (tool_use)
// ---------------------------------------------------------------------------
async function generateAnalysis() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY. Set it in .env or environment.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log('\nCalling Claude Haiku for narrative analysis...');

  const systemPrompt = `You are a concise market analyst writing daily investment reports.
You receive factual market data and generate structured analysis.
Always reference specific tickers, prices, and percentage moves from the data provided.
Write in clear, direct language — no fluff, no filler.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    tools: [{
      name: 'report_analysis',
      description: 'Generate structured analysis for an investment report session',
      input_schema: {
        type: 'object',
        properties: {
          regime: {
            type: 'string',
            description: 'Market regime in 3-8 words (e.g. "Broad risk-on follow-through", "Risk-off: defensive rotation")',
          },
          summary: {
            type: 'string',
            description: 'One precise sentence describing the dominant market dynamic and who is leading/lagging.',
          },
          alpha: {
            type: 'array',
            items: { type: 'string' },
            minItems: 3,
            maxItems: 4,
            description: 'Strategic framing bullets. Each bullet is one specific observation about structure, regime, or risk (not tactical calls).',
          },
          beta: {
            type: 'array',
            items: { type: 'string' },
            minItems: 3,
            maxItems: 4,
            description: 'Tactical action bullets. Each bullet is a specific, actionable instruction referencing actual tickers.',
          },
          pulse: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 2,
            description: 'Breadth and liquidity note(s). Reference index breadth, sector participation, or cross-asset confirmation.',
          },
          discussion: {
            type: 'object',
            description: 'Multi-agent discussion summary',
            properties: {
              agreement: {
                type: 'string',
                description: 'What both agents agree on (1 sentence)',
              },
              disagreement: {
                type: 'string',
                description: 'Where agents disagree on timing or magnitude (1 sentence)',
              },
              resolution: {
                type: 'string',
                description: 'Agreed resolution or posture (1 sentence)',
              },
            },
            required: ['agreement', 'disagreement', 'resolution'],
          },
        },
        required: ['regime', 'summary', 'alpha', 'beta', 'pulse', 'discussion'],
      },
    }],
    tool_choice: { type: 'tool', name: 'report_analysis' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract tool result
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    console.error('Unexpected response from Haiku — no tool_use block.');
    console.error(JSON.stringify(response.content, null, 2));
    process.exit(1);
  }

  const analysis = toolUse.input;

  // Log token usage
  const usage = response.usage;
  console.log(`  Input tokens:  ${usage.input_tokens}`);
  console.log(`  Output tokens: ${usage.output_tokens}`);
  console.log(`  Total:         ${usage.input_tokens + usage.output_tokens}`);

  return analysis;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  const analysis = await generateAnalysis();

  const markdown = assembleMarkdown({
    date,
    slot: effectiveSlot,
    snapshot,
    analysis,
  });

  if (dryRun) {
    console.log('\n--- DRY RUN OUTPUT ---\n');
    console.log(markdown);
    return;
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Warn if file already exists
  if (fs.existsSync(outputPath)) {
    console.warn(`\nWARN: Overwriting existing report: ${outputPath}`);
  }

  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`\nReport written → ${outputPath}`);
  console.log('Next steps:');
  console.log('  node scripts/validate-reports.js');
  console.log('  node scripts/build-index.js');
  console.log('  git add reports/daily/ data/ && git commit -m "Add report" && git push');
})();
