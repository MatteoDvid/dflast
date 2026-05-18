# Product Images — Design Spec
*Date: 2026-05-18*

## Objectif

Générer une image AI par produit (via gpt-image-2, même modèle que les images de destination), la stocker une fois dans Vercel Blob, et la servir à tous les utilisateurs via CDN. Batch one-shot sur les ~50 produits existants, relançable à la demande.

## Architecture

```
scripts/generate-product-images.ts   ← script local, lancé manuellement
  ↓ lit Google Sheet via readProductsFromCacheOrSheet()
  ↓ pour chaque produit actif :
      - vérifie si product-images/{asin}.png existe dans Vercel Blob
      - si non : génère via gpt-image-2, stocke, attend 2s
  → résultat : ~50 PNG dans Vercel Blob

lib/image-cache.ts                   ← ajout getProductImageMap()
  ↓ list({ prefix: 'product-images/' })
  → Map<asin, blobUrl>

app/api/recommend/route.ts           ← appelle getProductImageMap() une fois
  ↓ surcharge p.imageUrl avec l'URL Blob si elle existe
  → les produits retournés ont tous une imageUrl remplie
```

## Détails

### Script batch (`scripts/generate-product-images.ts`)

- Commande : `npx tsx scripts/generate-product-images.ts`
- Flags : `--force` pour régénérer même si l'image existe déjà, `--asin B08XYZ` pour cibler un seul produit
- Prompt image : `"Product photo of {label}, isolated on pure white background, clean e-commerce style, no text, photorealistic"`
- Modèle : `gpt-image-2`, quality `low`, size `1024x1024`
- Delay inter-appels : 2s (respect rate limits OpenAI Tier 1 ~5 img/min)
- Clé Blob : `product-images/{asin}.png` avec `addRandomSuffix: false`
- Logs : progression `[X/N] {label}`, skip si déjà existant, erreur non-bloquante (continue)

### `lib/image-cache.ts` — nouvelle fonction

```ts
export async function getProductImageMap(): Promise<Map<string, string>> {
  const { blobs } = await list({ prefix: 'product-images/' });
  const map = new Map<string, string>();
  for (const b of blobs) {
    const asin = b.pathname.replace('product-images/', '').replace('.png', '');
    map.set(asin, b.url);
  }
  return map;
}
```

### `app/api/recommend/route.ts` — injection des URLs

Appel unique de `getProductImageMap()` au début du handler, avant la construction de la réponse finale. Surcharge `p.imageUrl` si une URL Blob existe pour l'ASIN.

## Contraintes & limites

| Aspect | Valeur | Impact |
|--------|--------|--------|
| Stockage Blob | ~20MB (50 × 400KB) | Négligeable vs 5GB Hobby |
| Rate limit OpenAI | ~5 img/min Tier 1 | Batch ~3min avec délai 2s |
| Latence recommend | +1 appel Blob `list()` | <50ms, CDN Vercel |
| Refresh image | Re-run script + `--force` | Manuel, pas de TTL |

## Fichiers modifiés

- `scripts/generate-product-images.ts` — **nouveau**
- `lib/image-cache.ts` — ajout `getProductImageMap()`
- `app/api/recommend/route.ts` — injection `imageUrl` depuis Blob

## Hors scope

- Écriture des URLs dans Google Sheet
- Génération automatique (cron, webhook)
- Suppression des anciennes images
