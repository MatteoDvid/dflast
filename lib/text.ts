/**
 * Réparation des libellés mal encodés (UTF-8 relu en latin-1/cp1252).
 * Le Sheet contient par exemple "Baume A<nbsp> levres" au lieu de "Baume à lèvres" :
 * l'octet C3 est devenu "Ã" et l'octet A0 un espace insécable.
 *
 * On redécode les paires "Ã"/"Â" + octet de continuation, ce qui couvre tous les
 * caractères latins accentués sans avoir à lister chaque cas.
 *
 * Les regex sont construites via new RegExp avec des échappements \uXXXX : les
 * octets de continuation (U+0080–U+00BF) sont invisibles et ne survivraient pas
 * à une écriture littérale dans le fichier.
 */

// "Ã" (C3) ou "Â" (C2) suivi d'un octet de continuation.
const MOJIBAKE_PAIR = new RegExp('[\u00c2\u00c3][\u0080-\u00bf]', 'g');
// Même chose + "â" (E2, ponctuation typographique) pour le test de présence.
const MOJIBAKE_MARKER = new RegExp('[\u00c2\u00c3\u00e2][\u0080-\u00bf]');
const NBSP = new RegExp('\u00a0', 'g');

export function fixMojibake(input: string): string {
  const s = String(input ?? '');
  if (!MOJIBAKE_MARKER.test(s)) return s;

  const repaired = s.replace(MOJIBAKE_PAIR, (pair) =>
    String.fromCharCode(((pair.charCodeAt(0) & 0x1f) << 6) | (pair.charCodeAt(1) & 0x3f)),
  );

  // Les espaces insécables issus de la réparation redeviennent des espaces.
  return repaired.replace(NBSP, ' ');
}
