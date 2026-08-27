/**
 * Vérifications des helpers de diversité + du nettoyage d'ASIN.
 *   npx tsx scripts/test-diversity.ts
 */
import { readFileSync } from 'fs';
import {
  familyKey,
  dedupeByFamily,
  interleaveByCategory,
  seededShuffle,
  hashSeed,
} from '../lib/diversity';
import { fixMojibake } from '../lib/text';

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    failed++;
    console.log('     attendu :', JSON.stringify(expected));
    console.log('     obtenu  :', JSON.stringify(actual));
  }
}

// --- familyKey : libellés réels du Sheet ---
check(
  'familyKey fusionne les 3 gammes de chaussures',
  new Set([
    familyKey('Chaussures de randonnée craponnables prix 1 - Antidérapantes, Respirantes'),
    familyKey('Chaussures de randonnée craponnables prix 2 - Antidérapantes, Respirantes'),
    familyKey('Chaussures de randonnée craponnables prix 3 - Antidérapantes, Respirantes'),
  ]).size,
  1,
);
check(
  'familyKey fusionne bas/moyenne/haute de gamme',
  new Set([
    familyKey('sac a dos Waterproof bas de gamme - Résistant à l\'eau, Léger'),
    familyKey('Sac a dos Waterproof moyenne gamme - Résistant à l\'eau, Léger'),
    familyKey('Sac a dos Waterproof haute gamme - Résistant à l\'eau, Léger'),
  ]).size,
  1, // "bas de gamme", "moyenne gamme", "haute gamme" : même famille
);
check(
  'familyKey garde homme et femme distincts',
  familyKey('Casque de ski adulte prix 1') === familyKey('Casque de ski enfant prix 1'),
  false,
);
check(
  'familyKey fusionne les doublons de libellé',
  familyKey('Bâtons de randonnée prix 1') === familyKey('Bâtons de randonnée prix 2'),
  true,
);
check(
  'familyKey fusionne la variante premium',
  familyKey('Sac à dos waterproof - premium') === familyKey('Sac à dos waterproof - entrée de gamme'),
  true,
);
check(
  'familyKey ne fusionne pas deux produits premium différents',
  familyKey('Masque plongée premium') === familyKey('Couverture survie premium'),
  false,
);
check(
  'familyKey ne fusionne pas deux produits différents',
  familyKey('Poncho de pluie léger') === familyKey('Veste imperméable homme'),
  false,
);

// --- dedupeByFamily ---
const catalogue = [
  { label: 'Doudoune homme prix 1', category: 'vetements' },
  { label: 'Doudoune homme prix 2', category: 'vetements' },
  { label: 'Doudoune homme prix 3', category: 'vetements' },
  { label: 'Casque de ski adulte prix 1', category: 'sport' },
  { label: 'Casque de ski adulte prix 2', category: 'sport' },
  { label: 'Casque de ski enfant prix 1', category: 'sport' },
  { label: 'Power bank 20000mAh', category: 'electronique' },
  { label: 'Trousse de secours', category: 'securite' },
];
check(
  'dedupeByFamily garde la première variante de chaque famille',
  dedupeByFamily(catalogue).map((p) => p.label),
  [
    'Doudoune homme prix 1',
    'Casque de ski adulte prix 1',
    'Casque de ski enfant prix 1',
    'Power bank 20000mAh',
    'Trousse de secours',
  ],
);

// --- interleaveByCategory ---
const ordered = [
  { label: 'v1', category: 'vetements' },
  { label: 'v2', category: 'vetements' },
  { label: 'v3', category: 'vetements' },
  { label: 'e1', category: 'electronique' },
  { label: 'e2', category: 'electronique' },
  { label: 's1', category: 'sport' },
];
check(
  'interleaveByCategory alterne les catégories',
  interleaveByCategory(ordered).map((p) => p.label),
  ['v1', 'e1', 's1', 'v2', 'e2', 'v3'],
);
check(
  'interleaveByCategory ne perd aucun produit',
  interleaveByCategory(ordered).length,
  ordered.length,
);
check('interleaveByCategory gère la liste vide', interleaveByCategory([]), []);
check(
  'interleaveByCategory gère une catégorie absente',
  interleaveByCategory([{ label: 'x' }, { label: 'y', category: 'sport' }]).map((p) => p.label),
  ['x', 'y'],
);

// --- seededShuffle / hashSeed ---
const catalog = Array.from({ length: 200 }, (_, i) => `p${i}`);
check(
  'seededShuffle est déterministe (même graine → même ordre)',
  JSON.stringify(seededShuffle(catalog, 42)) === JSON.stringify(seededShuffle(catalog, 42)),
  true,
);
check(
  'seededShuffle change avec la graine',
  JSON.stringify(seededShuffle(catalog, 42)) === JSON.stringify(seededShuffle(catalog, 43)),
  false,
);
check(
  'seededShuffle ne perd ni ne duplique aucun produit',
  new Set(seededShuffle(catalog, 7)).size,
  catalog.length,
);
check('seededShuffle ne modifie pas le tableau source', catalog[0], 'p0');
check('hashSeed est stable', hashSeed('NO|2027-01-01') === hashSeed('NO|2027-01-01'), true);
check('hashSeed discrimine', hashSeed('NO|2027-01-01') === hashSeed('NO|2027-01-02'), false);

// Le vrai enjeu : les produits ajoutés en bas du Sheet doivent remonter
// aussi souvent que les autres sur l'ensemble des voyages.
const TAIL_START = 150; // les 50 derniers = "produits récemment ajoutés"
let tailInTop60 = 0;
const TRIPS = 200;
for (let t = 0; t < TRIPS; t++) {
  const order = seededShuffle(catalog, hashSeed(`voyage-${t}`));
  const top = order.slice(0, 60);
  tailInTop60 += top.filter((p) => Number(p.slice(1)) >= TAIL_START).length;
}
const tailShare = tailInTop60 / (TRIPS * 60);
check(
  `les 25% de produits les plus récents occupent ~25% du haut de liste (mesuré: ${(tailShare * 100).toFixed(1)}%)`,
  tailShare > 0.2 && tailShare < 0.3,
  true,
);

// --- nettoyage ASIN : on teste la regex telle qu'elle est écrite dans lib/sheets.ts ---
const sheetsSrc = readFileSync(new URL('../lib/sheets.ts', import.meta.url), 'utf-8');
const match = sheetsSrc.match(/asin: \(r\[idx\('asin'\)\] \|\| ''\)[\s\S]{0,200}?\.replace\((\/\[[^)]+?\/g), ''\)/);
if (!match) {
  console.log('FAIL regex de nettoyage ASIN introuvable dans lib/sheets.ts');
  failed++;
} else {
  // eslint-disable-next-line no-eval
  const asinRe: RegExp = eval(match[1]);
  const clean = (raw: string) => raw.replace(asinRe, '').trim();
  check('ASIN nettoyé du U+200E (Étiquettes bagage design)', clean('‎B0BCV6NXWW'), 'B0BCV6NXWW');
  check('ASIN nettoyé du U+200E (Douche portable)', clean('‎B0D4VDYRWB'), 'B0D4VDYRWB');
  check('ASIN nettoyé de l\'espace insécable', clean(' B0DPHJS7X4 '), 'B0DPHJS7X4');
  check('ASIN nettoyé du BOM', clean('﻿B0CG5RFS3Z'), 'B0CG5RFS3Z');
  check('ASIN normal inchangé', clean('B07G5YFS1L'), 'B07G5YFS1L');
}

// --- réparation d'encodage (lib/text.ts) ---
// Les séquences sont construites par code de caractère : "Ã" (C3) suivi d'un
// espace insécable (A0) est le mojibake de "à" tel qu'il existe dans le Sheet.
const C3 = String.fromCharCode(0xc3);
const A0 = String.fromCharCode(0xa0);
const E8 = String.fromCharCode(0xe8);
const E9 = String.fromCharCode(0xe9);
check(
  'encodage réparé: Baume Ã<nbsp> lèvres',
  fixMojibake('Baume ' + C3 + A0 + ' l' + E8 + 'vres hydratant'),
  'Baume ' + String.fromCharCode(0xe0) + ' l' + E8 + 'vres hydratant',
);
check(
  "encodage réparé: Résistant Ã<nbsp> l'eau",
  fixMojibake('R' + E9 + 'sistant ' + C3 + A0 + " l'eau"),
  'R' + E9 + 'sistant ' + String.fromCharCode(0xe0) + " l'eau",
);
check(
  'encodage réparé: Ã© -> é',
  fixMojibake('Cr' + C3 + String.fromCharCode(0xa9) + 'me solaire'),
  'Cr' + E9 + 'me solaire',
);
check('libellé sain inchangé', fixMojibake('Chaussettes en laine m' + E9 + 'rinos'), 'Chaussettes en laine m' + E9 + 'rinos');
check('libellé ASCII inchangé', fixMojibake('Power bank 20000mAh'), 'Power bank 20000mAh');

// --- filtre ASIN invalide, tel qu'écrit dans lib/sheets.ts ---
const asinGuard = sheetsSrc.match(/if \(!(\/\^\[A-Z0-9\]\{10\}\$\/i)\.test\(candidate\.asin\)\)/);
if (!asinGuard) {
  console.log('FAIL garde-fou ASIN introuvable dans lib/sheets.ts');
  failed++;
} else {
  // eslint-disable-next-line no-eval
  const re: RegExp = eval(asinGuard[1]);
  check('ASIN "test" rejeté', re.test('test'), false);
  check('ASIN "NONE" rejeté', re.test('NONE'), false);
  check('ASIN vide rejeté', re.test(''), false);
  check('ASIN valide accepté', re.test('B0DPHJS7X4'), true);
  check('ASIN à 11 caractères rejeté', re.test('B0BCV6NXWWX'), false);
}

console.log(failed === 0 ? '\nTous les tests passent.' : `\n${failed} test(s) en échec.`);
process.exit(failed === 0 ? 0 : 1);
