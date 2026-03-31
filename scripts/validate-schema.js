#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const slotSet = new Set(['eu', 'us-open', 'pre-close']);
const errors = [];

const isString = (v) => typeof v === 'string';
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isIsoDate = (v) => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isIsoDateTime = (v) => isString(v) && !Number.isNaN(Date.parse(v));

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const raw = content.slice(4, end).split('\n');
  const obj = {};
  for (const line of raw) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    }
    obj[k] = v;
  }
  return obj;
}

function validateMover(m, ctx) {
  if (!m || typeof m !== 'object') return `${ctx}: mover must be object`;
  if (!isString(m.ticker)) return `${ctx}: mover.ticker missing`;
  if (!isString(m.name)) return `${ctx}: mover.name missing`;
  if (!isString(m.price)) return `${ctx}: mover.price missing`;
  if (!(typeof m.pct === 'number' || m.pct === null)) return `${ctx}: mover.pct must be number|null`;
  if (!isString(m.change)) return `${ctx}: mover.change missing`;
  if (!(typeof m.changeAbs === 'number' || m.changeAbs === null)) return `${ctx}: mover.changeAbs must be number|null`;
  return null;
}

function validateNewsRow(n, ctx) {
  if (!n || typeof n !== 'object') return `${ctx}: news row must be object`;
  if (!isString(n.headline) || !n.headline.trim()) return `${ctx}: news.headline required`;
  if (n.ticker !== undefined && !isString(n.ticker)) return `${ctx}: news.ticker must be string`;
  if (n.source !== undefined && !isString(n.source)) return `${ctx}: news.source must be string`;
  if (n.url !== undefined && !isString(n.url)) return `${ctx}: news.url must be string`;
  if (n.publishedAt !== undefined && !isIsoDateTime(n.publishedAt)) return `${ctx}: news.publishedAt must be ISO datetime`;
  return null;
}

function validateItem(item, ctx) {
  if (!item || typeof item !== 'object') return [`${ctx}: item must be object`];
  const itemErrors = [];
  if (!isString(item.file) || !item.file.endsWith('.md')) itemErrors.push(`${ctx}: file missing/invalid`);
  if (!isString(item.htmlFile) || !item.htmlFile.endsWith('.html')) itemErrors.push(`${ctx}: htmlFile missing/invalid`);
  if (!isString(item.title) || !item.title.trim()) itemErrors.push(`${ctx}: title required`);
  if (!isString(item.summary)) itemErrors.push(`${ctx}: summary required`);
  if (!isIsoDate(item.date)) itemErrors.push(`${ctx}: date invalid`);
  if (!slotSet.has(item.slot)) itemErrors.push(`${ctx}: slot invalid`);
  if (!isStringArray(item.tickers)) itemErrors.push(`${ctx}: tickers must be string[]`);
  if (!isString(item.regime)) itemErrors.push(`${ctx}: regime must be string`);

  if (!item.sections || typeof item.sections !== 'object') {
    itemErrors.push(`${ctx}: sections required`);
  } else {
    for (const key of ['gamma', 'alpha', 'beta', 'pulse']) {
      if (!isStringArray(item.sections[key])) itemErrors.push(`${ctx}: sections.${key} must be string[]`);
    }
  }

  if (!Array.isArray(item.movers)) {
    itemErrors.push(`${ctx}: movers must be array`);
  } else {
    item.movers.forEach((m, idx) => {
      const err = validateMover(m, `${ctx}: movers[${idx}]`);
      if (err) itemErrors.push(err);
    });
  }

  if (item.news !== undefined) {
    if (!Array.isArray(item.news)) {
      itemErrors.push(`${ctx}: news must be array when present`);
    } else {
      item.news.forEach((n, idx) => {
        const err = validateNewsRow(n, `${ctx}: news[${idx}]`);
        if (err) itemErrors.push(err);
      });
    }
  }

  if (isString(item.file) && isString(item.htmlFile)) {
    const expectedHtml = item.file.replace(/\.md$/, '.html');
    if (expectedHtml !== item.htmlFile) itemErrors.push(`${ctx}: htmlFile must match file basename`);
  }

  return itemErrors;
}

function validateSearchIndex() {
  const p = path.join(root, 'data', 'search-index.json');
  if (!fs.existsSync(p)) {
    errors.push('data/search-index.json missing');
    return;
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    errors.push('search-index: must be object');
    return;
  }
  if (!isIsoDateTime(raw.generatedAt)) errors.push('search-index.generatedAt invalid');
  if (typeof raw.count !== 'number') errors.push('search-index.count must be number');
  if (!Array.isArray(raw.items)) {
    errors.push('search-index.items must be array');
    return;
  }
  if (typeof raw.count === 'number' && raw.count !== raw.items.length) {
    errors.push(`search-index.count mismatch (${raw.count} vs ${raw.items.length})`);
  }
  raw.items.forEach((item, idx) => {
    errors.push(...validateItem(item, `search-index.items[${idx}]`));
  });
}

function validateByDate() {
  const dir = path.join(root, 'data', 'by-date');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const p = path.join(dir, f);
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(arr)) {
      errors.push(`by-date/${f}: must be array`);
      continue;
    }
    arr.forEach((item, idx) => {
      errors.push(...validateItem(item, `by-date/${f}[${idx}]`));
    });
  }
}

function validateFrontmatter() {
  const dir = path.join(root, 'reports', 'daily');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const full = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = parseFrontmatter(full);
    if (!fm) {
      errors.push(`${f}: missing frontmatter`);
      continue;
    }
    if (!isIsoDate(fm.date)) errors.push(`${f}: frontmatter.date invalid`);
    if (!slotSet.has(fm.slot)) errors.push(`${f}: frontmatter.slot invalid`);
    if (!isString(fm.title) || !fm.title.trim()) errors.push(`${f}: frontmatter.title required`);
    if (!isString(fm.summary)) errors.push(`${f}: frontmatter.summary required`);
    if (!Array.isArray(fm.tickers)) errors.push(`${f}: frontmatter.tickers must be array`);
  }
}

validateSearchIndex();
validateByDate();
validateFrontmatter();

if (errors.length) {
  console.error('Schema validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Schema validation passed.');
