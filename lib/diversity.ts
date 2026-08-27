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

/** Hash 32 bits stable (FNV-1a) : même chaîne → même graine, à travers les déploiements. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mélange déterministe (Fisher-Yates + PRNG mulberry32 amorcé).
 * Même graine → même ordre : un voyage donné reste stable (et le cache IA reste
 * valable), mais deux voyages différents voient le catalogue dans un ordre
 * différent. La position d'un produit dans le Sheet n'influence donc plus sa
 * probabilité d'être sélectionné.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
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
