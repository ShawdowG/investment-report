'use strict';
/**
 * Assembles a complete report markdown string from structured data.
 *
 * @param {object} params
 * @param {string} params.date        - YYYY-MM-DD
 * @param {string} params.slot        - eu | us-open | pre-close
 * @param {object} params.snapshot    - gamma_snapshot.json object (v2)
 * @param {object} params.analysis    - LLM-generated narrative fields
 * @param {string} params.analysis.regime
 * @param {string} params.analysis.summary
 * @param {string[]} params.analysis.alpha
 * @param {string[]} params.analysis.beta
 * @param {string[]} params.analysis.pulse
 * @param {object} params.analysis.discussion
 * @param {string} params.analysis.discussion.agreement
 * @param {string} params.analysis.discussion.disagreement
 * @param {string} params.analysis.discussion.resolution
 * @returns {string} Full report markdown
 */
function assembleMarkdown({ date, slot, snapshot, analysis }) {
  const TITLE_MAP = {
    eu:          'EU/Nordic Morning',
    'us-open':   'US Open +15m',
    'pre-close': 'US Pre-close',
  };

  const title = TITLE_MAP[slot] || slot;
  const { regime, summary, alpha, beta, pulse, discussion } = analysis;
  const prices = snapshot.prices || {};
  const macro = snapshot.macro || {};
  const watchlist = snapshot.watchlist || Object.keys(prices);

  // Build tickers frontmatter (use watchlist order)
  const tickerList = watchlist.filter(t => prices[t]).join(', ');

  // Build GAMMA table (Ticker | Price | Δ$ | Δ%)
  const gammaRows = watchlist
    .filter(t => prices[t])
    .map(t => {
      const p = prices[t];
      const pctStr = p.changePct >= 0
        ? `+${p.changePct.toFixed(2)}%`
        : `${p.changePct.toFixed(2)}%`;
      const priceStr = p.price.toFixed(2);
      const changeStr = p.change >= 0
        ? `+${p.change.toFixed(2)}`
        : `${p.change.toFixed(2)}`;
      return `${t} | ${priceStr} | ${changeStr} | ${pctStr}`;
    })
    .join('\n');

  // Sort movers by abs % for checklist
  const movers = watchlist
    .filter(t => prices[t])
    .map(t => ({ ticker: t, ...prices[t] }))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const topMovers = movers.slice(0, 5);
  const topGainers = movers.filter(m => m.changePct > 0).slice(0, 3);
  const topLosers = movers.filter(m => m.changePct < 0).reverse().slice(0, 2);

  const moverSummary = topMovers
    .map(m => `**${m.ticker}** (${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}%)`)
    .join(', ');

  // Macro string
  const macroLines = [];
  if (macro.VIX && macro.VIX.price) macroLines.push(`VIX: ${macro.VIX.price.toFixed(1)}`);
  if (macro.DXY && macro.DXY.price) macroLines.push(`DXY: ${macro.DXY.price.toFixed(2)}`);
  if (macro.US10Y && macro.US10Y.price) macroLines.push(`US10Y: ${macro.US10Y.price.toFixed(2)}%`);
  const macroStr = macroLines.length ? macroLines.join(', ') : 'Not available';

  // Proxy mapping notes
  const proxyNotes = [];
  if (prices['NVO'] && !prices['NOVO-B.CO']) proxyNotes.push('NVO (Novo Nordisk ADR)');
  if (prices['ADBE'] && !prices['ADBE.VI']) proxyNotes.push('ADBE (US ADR)');
  const proxyStr = proxyNotes.length ? proxyNotes.join(', ') : 'None';

  // Missing macro fields
  const missingMacro = ['VIX', 'DXY', 'US10Y'].filter(k => !macro[k] || !macro[k].price);
  const missingStr = missingMacro.length ? missingMacro.join(', ') + ' unavailable' : 'All macro fields available';

  // Format alpha/beta bullets
  const fmtBullets = (arr) => (arr || []).map(b => `- ${b.replace(/^[-•]\s*/, '')}`).join('\n');

  // Action checklist — top movers + macro + pulse
  const checklistItems = [
    `Track leader retention: ${topGainers.map(m => `**${m.ticker}** (+${m.changePct.toFixed(2)}%)`).join(', ')}.`,
    topLosers.length ? `Monitor laggards: ${topLosers.map(m => `**${m.ticker}** (${m.changePct.toFixed(2)}%)`).join(', ')}.` : null,
    macroLines.length ? `Cross-check macro context: ${macroStr}.` : null,
    ...(pulse || []).map(p => p.replace(/^[-•]\s*/, '')),
  ].filter(Boolean);

  const md = `---
date: ${date}
slot: ${slot}
title: ${title}
regime: ${regime}
summary: ${summary}
tickers: [${tickerList}]
---

# ${title} — ${date}

- **Regime:** ${regime}
- **Main driver:** ${summary}
- **Posture:** ${(beta[0] || '').replace(/^[-•]\s*/, '')}

## 1) GAMMA — Data Pack
Ticker | Price | Δ$ | Δ%
---|---:|---:|---:
${gammaRows}

## 2) ALPHA — Strategic View
${fmtBullets(alpha)}

## 3) BETA — Tactical View
${fmtBullets(beta)}

## 4) Agent Discussion
- **Agreement:** ${discussion.agreement}
- **Disagreement:** ${discussion.disagreement}
- **Resolution:** ${discussion.resolution}

## 5) Unified Action Checklist
${checklistItems.map(i => `- ${i}`).join('\n')}

## 6) Source & Verification Notes
- Snapshot source: data/gamma_snapshot.json generated ${snapshot.generatedAt}.
- Proxy mapping: ${proxyStr}.
- Macro: ${macroStr}.
- ${missingStr}.
`;

  return md;
}

module.exports = { assembleMarkdown };
