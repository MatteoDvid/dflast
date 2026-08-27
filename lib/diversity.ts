// Helpers de diversité des recommandations.
// Deux fonctions pures, sans dépendance : testables et réutilisables.

type WithLabel = { label: string };
type WithCategory = { category?: string };

const DIACRITICS = /[̀-ͯ]/g;

/**
 * Clé de "famille produit" : ignore les marqueurs de gamme/prix.
 * "Doudoune homme prix 1" / "prix 2" / "prix 3"  → même famille
 * "Sac a dos Waterproof bas de gamme" / "haute gamme" → même famille
 * Le genre (homme/femme/enfant) est conservé : ce sont bien des produits distincts.
 */
export function familyKey(label: string): string {
  return String(label ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/\b(prix|price)\s*\d+\b/g, ' ')
    .replace(/\b(bas|entree|milieu|moyenne|haute|haut)\s+(de\s+)?gamme\b/g, ' ')
    .replace(/\bpremium\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Ne garde qu'une variante par famille (la première rencontrée, donc la mieux classée). */
export function dedupeByFamily<T extends WithLabel>(products: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of products) {
    const key = familyKey(p.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Entrelace les produits par catégorie (round-robin) en conservant l'ordre de
 * pertinence à l'intérieur de chaque catégorie. Aucun produit n'est perdu :
 * on remonte simplement le meilleur de chaque catégorie avant les seconds choix,
 * pour que les N premiers affichés couvrent un maximum de catégories.
 */
export function interleaveByCategory<T extends WithCategory>(products: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const p of products) {
    const cat = p.category || 'autre';
    const bucket = buckets.get(cat);
    if (bucket) bucket.push(p);
    else buckets.set(cat, [p]);
  }
  const out: T[] = [];
  let round = 0;
  let remaining = products.length;
  while (remaining > 0) {
    for (const bucket of buckets.values()) {
      const item = bucket[round];
      if (item !== undefined) {
        out.push(item);
        remaining--;
      }
    }
    round++;
  }
  return out;
}
