/**
 * Vérifications des helpers de diversité + du nettoyage d'ASIN.
 *   npx tsx scripts/test-diversity.ts
 */
import { readFileSync } from 'fs';
import { familyKey, dedupeByFamily, interleaveByCategory } from '../lib/diversity';

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

console.log(failed === 0 ? '\nTous les tests passent.' : `\n${failed} test(s) en échec.`);
process.exit(failed === 0 ? 0 : 1);
