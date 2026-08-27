#!/usr/bin/env node
/**
 * Normalise et audite les liens / ASIN Amazon du catalogue (export CSV du Google Sheet).
 *
 *   node scripts/normalize-amazon-links.mjs "DF - Items - DF.csv"
 *   node scripts/normalize-amazon-links.mjs "DF - Items - DF.csv" --out data/catalog-normalized.csv
 *
 * Sortie :
 *   - rapport console (ASIN manquants, invalides, placeholders, doublons, params de session)
 *   - CSV normalise avec 3 colonnes ajoutees : asin_normalized, amazon_url_canonical, issue
 *
 * Aucun appel reseau : la normalisation ne depend d'aucune session Amazon.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASIN_RE = /^[A-Z0-9]{10}$/;
const PLACEHOLDERS = new Set(['test', 'none', 'na', 'n/a', '-', 'todo', 'x', 'xxx', 'null']);

// Parametres purement lies a la session / navigation / tracking : a jeter
const SESSION_PARAMS = [
  'tag', 'ref', 'ref_', 'psc', 'th', 'qid', 'sr', 'keywords', 'crid', 'sprefix',
  'linkCode', 'linkId', 'creativeASIN', 'camp', 'creative', 'smid', 'dib', 'dib_tag',
  'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r', 'content-id',
  'ascsubtag', 'ie', 'hvadid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign',
];

const INVISIBLE = /[​-‍﻿ ]/g;

function extractAsin(raw) {
  const s = String(raw ?? '').replace(INVISIBLE, '').trim();
  if (!s) return { asin: null, reason: 'EMPTY' };

  // 1) ASIN nu
  const bare = s.toUpperCase();
  if (ASIN_RE.test(bare)) return { asin: bare, reason: null };
  if (PLACEHOLDERS.has(s.toLowerCase())) return { asin: null, reason: 'PLACEHOLDER' };

  // 2) URL Amazon, tous formats et tous marketplaces
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    /\/gp\/offer-listing\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/d\/([A-Z0-9]{10})(?:[/?]|$)/i,
    /[?&]asin=([A-Z0-9]{10})/i,
    /[?&]creativeASIN=([A-Z0-9]{10})/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return { asin: m[1].toUpperCase(), reason: null };
  }
  // 3) Lien court : non resolvable hors ligne
  if (/amzn\.(to|eu|asia)/i.test(s)) return { asin: null, reason: 'SHORTLINK_A_RESOUDRE' };
  if (/amazon\./i.test(s)) return { asin: null, reason: 'URL_AMAZON_SANS_ASIN' };
  return { asin: null, reason: 'FORMAT_INCONNU' };
}

function marketplaceOf(raw) {
  const m = String(raw ?? '').match(/amazon\.([a-z.]{2,6})\//i);
  return m ? m[1].toLowerCase() : null;
}

function sessionParamsFound(raw) {
  const s = String(raw ?? '');
  if (!s.includes('?')) return [];
  const found = [];
  for (const kv of s.slice(s.indexOf('?') + 1).split('&')) {
    const k = kv.split('=')[0];
    if (SESSION_PARAMS.includes(k)) found.push(k);
  }
  return found;
}

// --- CSV minimal (gere les guillemets) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const csvCell = (v) => (/[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? ''));

// --- main ---
const [, , inputArg, ...rest] = process.argv;
const input = inputArg || 'DF - Items - DF.csv';
const outIdx = rest.indexOf('--out');
const output = outIdx >= 0 ? rest[outIdx + 1] : path.join('data', 'catalog-normalized.csv');
const mktIdx = rest.indexOf('--marketplace');
const marketplaceRef = (mktIdx >= 0 ? rest[mktIdx + 1] : 'fr').toLowerCase();

const rows = parseCsv(fs.readFileSync(input, 'utf-8'));
const header = rows[0].map((h) => h.trim());
const norm = (h) => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_-]/g, '');
const findCol = (...names) => header.findIndex((h) => names.includes(norm(h)));

const asinCol = findCol('asin', 'sku');
const urlCol = findCol('url', 'lien', 'lienamazon', 'urlamazon', 'amazonurl', 'link', 'lienproduit');
const labelCol = findCol('label', 'nom', 'name', 'libelle');
if (asinCol < 0 && urlCol < 0) {
  console.error('Aucune colonne asin/url trouvee. En-tetes : ' + header.join(' | '));
  process.exit(1);
}

const issues = { EMPTY: [], PLACEHOLDER: [], SHORTLINK_A_RESOUDRE: [], URL_AMAZON_SANS_ASIN: [], FORMAT_INCONNU: [] };
const byAsin = new Map();
const sessionNoise = [];
const foreignMarketplace = [];
const out = [[...header, 'asin_normalized', 'amazon_url_canonical', 'issue']];

rows.slice(1).forEach((r, i) => {
  const line = i + 2;
  const label = labelCol >= 0 ? (r[labelCol] || '').trim() : 'ligne ' + line;
  const source = (urlCol >= 0 && (r[urlCol] || '').trim()) || (asinCol >= 0 ? r[asinCol] : '');
  const { asin, reason } = extractAsin(source);

  const noise = sessionParamsFound(source);
  if (noise.length) sessionNoise.push({ line, label, params: noise.join(',') });
  const mkt = marketplaceOf(source);
  if (mkt && mkt !== marketplaceRef) foreignMarketplace.push({ line, label, marketplace: mkt });

  if (asin) {
    if (!byAsin.has(asin)) byAsin.set(asin, []);
    byAsin.get(asin).push({ line, label });
  } else if (reason) {
    issues[reason].push({ line, label, value: String(source).slice(0, 60) });
  }
  out.push([...r, asin ?? '', asin ? 'https://www.amazon.' + marketplaceRef + '/dp/' + asin : '', reason ?? '']);
});

const duplicates = [...byAsin.entries()].filter(([, v]) => v.length > 1);
const total = rows.length - 1;
const valid = [...byAsin.values()].reduce((n, v) => n + v.length, 0);

console.log('\nFichier : ' + input);
console.log('   ' + total + ' lignes | ' + valid + ' ASIN exploitables | ' + byAsin.size + ' ASIN uniques\n');

const show = (title, arr, fmt) => {
  if (!arr.length) return;
  console.log('[!] ' + title + ' (' + arr.length + ')');
  arr.slice(0, 10).forEach((x) => console.log('    ' + fmt(x)));
  if (arr.length > 10) console.log('    ... +' + (arr.length - 10));
  console.log('');
};

show('ASIN vides', issues.EMPTY, (x) => 'L' + x.line + ' ' + x.label);
show('ASIN placeholder (test / NONE / ...)', issues.PLACEHOLDER, (x) => 'L' + x.line + ' ' + x.label + ' -> "' + x.value + '"');
show('Liens courts amzn.to / amzn.eu a resoudre', issues.SHORTLINK_A_RESOUDRE, (x) => 'L' + x.line + ' ' + x.label + ' -> ' + x.value);
show('URL Amazon sans ASIN detectable', issues.URL_AMAZON_SANS_ASIN, (x) => 'L' + x.line + ' ' + x.label + ' -> ' + x.value);
show('Format non reconnu', issues.FORMAT_INCONNU, (x) => 'L' + x.line + ' ' + x.label + ' -> "' + x.value + '"');
show('ASIN en doublon (la dedup n\'en garde qu\'un seul !)', duplicates, ([a, v]) => a + ' x' + v.length + ' -> ' + v.map((x) => x.label).slice(0, 4).join(' / '));
show('Parametres de session/tracking dans l\'URL (nettoyes)', sessionNoise, (x) => 'L' + x.line + ' ' + x.label + ' -> ' + x.params);
show('Marketplace different de .' + marketplaceRef, foreignMarketplace, (x) => 'L' + x.line + ' ' + x.label + ' -> amazon.' + x.marketplace);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, out.map((r) => r.map(csvCell).join(',')).join('\n'), 'utf-8');
console.log('CSV normalise ecrit : ' + output);

const blocking = issues.EMPTY.length + issues.PLACEHOLDER.length + issues.FORMAT_INCONNU.length + duplicates.length;
console.log(blocking ? blocking + ' lignes a corriger avant import.\n' : 'Catalogue propre.\n');
