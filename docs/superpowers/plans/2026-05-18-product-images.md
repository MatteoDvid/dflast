# Product Images — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer une image AI par produit (gpt-image-2, fond blanc, style e-commerce), la stocker dans Vercel Blob, et la servir via l'API recommend existante.

**Architecture:** Un script batch local lit les produits depuis Google Sheets, génère les images manquantes via OpenAI avec un délai de 2s entre chaque, et les stocke sous `product-images/{asin}.png` dans Vercel Blob (avec `addRandomSuffix: false` pour des URLs déterministes). Le recommend API ajoute un seul appel `list()` au Blob en début de handler pour construire un Map `asin → url`, puis surcharge `p.imageUrl` avant de retourner la réponse.

**Tech Stack:** `@vercel/blob` (v2.3.3, déjà installé), `openai` SDK (v6.10.0, déjà installé), `npx tsx` (runner TypeScript), Node 20 `--env-file` pour les env vars locales.

---

## Fichiers touchés

| Fichier | Action | Rôle |
|---------|--------|------|
| `lib/image-cache.ts` | Modifier | Ajouter `getProductImageMap()` |
| `scripts/generate-product-images.ts` | Créer | Script batch de génération |
| `app/api/recommend/route.ts` | Modifier | Injecter les URLs Blob dans la réponse |

---

### Task 1 : Ajouter `getProductImageMap()` dans `lib/image-cache.ts`

**Files:**
- Modify: `lib/image-cache.ts`

- [ ] **Step 1 : Ajouter la fonction à la fin du fichier**

Ouvrir `lib/image-cache.ts`. Le fichier contient déjà `list` dans l'import de `@vercel/blob` (ligne 1). Ajouter à la fin :

```ts
export async function getProductImageMap(): Promise<Map<string, string>> {
  try {
    const { blobs } = await list({ prefix: 'product-images/' });
    const map = new Map<string, string>();
    for (const b of blobs) {
      const asin = b.pathname.replace('product-images/', '').replace('.png', '');
      if (asin) map.set(asin, b.url);
    }
    return map;
  } catch {
    return new Map();
  }
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add lib/image-cache.ts
git commit -m "feat: add getProductImageMap() to image-cache"
```

---

### Task 2 : Créer `scripts/generate-product-images.ts`

**Files:**
- Create: `scripts/generate-product-images.ts`

- [ ] **Step 1 : Récupérer les env vars Vercel en local**

```bash
npx vercel env pull .env.local
```

Vérifier que `.env.local` contient `OPENAI_API_KEY` et `BLOB_READ_WRITE_TOKEN`. Si l'une est manquante, la récupérer dans le dashboard Vercel → Settings → Environment Variables.

- [ ] **Step 2 : Créer le script**

Créer `scripts/generate-product-images.ts` :

```ts
import OpenAI from 'openai';
import { readProductsFromCacheOrSheet } from '../lib/sheets';
import { getCachedImageUrl, storeCachedImage } from '../lib/image-cache';

const args = process.argv.slice(2);
const force = args.includes('--force');
const asinFilter = args.find((a) => a.startsWith('--asin='))?.split('=')[1];
const DELAY_MS = 2000;

function buildProductKey(asin: string): string {
  return `product-images/${asin}.png`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateImage(label: string, openai: OpenAI): Promise<Buffer> {
  const prompt = `Product photo of ${label}, isolated on pure white background, clean e-commerce style, no text, photorealistic`;

  const response = await openai.images.generate({
    model: 'gpt-image-2' as any,
    prompt,
    n: 1,
    size: '1024x1024' as any,
    quality: 'low' as any,
  });

  const b64 = (response as any).data[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from OpenAI');
  return Buffer.from(b64, 'base64');
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY manquante. Lancer avec --env-file=.env.local');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('📋 Chargement des produits depuis Google Sheets...');
  const products = await readProductsFromCacheOrSheet();
  const active = products
    .filter((p) => p.status === 'active')
    .filter((p) => !asinFilter || p.asin === asinFilter);

  console.log(`📦 ${active.length} produits actifs à traiter${asinFilter ? ` (filtre: ${asinFilter})` : ''}${force ? ' [--force]' : ''}\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < active.length; i++) {
    const p = active[i];
    const key = buildProductKey(p.asin);
    const prefix = `[${i + 1}/${active.length}] ${p.label} (${p.asin})`;

    if (!force) {
      const existing = await getCachedImageUrl(key);
      if (existing) {
        console.log(`⏭️  ${prefix} — déjà existante, skip`);
        skipped++;
        continue;
      }
    }

    try {
      console.log(`🎨 ${prefix} — génération en cours...`);
      const buffer = await generateImage(p.label, openai);
      const url = await storeCachedImage(key, buffer);
      console.log(`✅ ${prefix} — stockée: ${url}`);
      generated++;
    } catch (err: any) {
      console.error(`❌ ${prefix} — erreur: ${err.message}`);
      errors++;
    }

    if (i < active.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Résumé: ${generated} générées, ${skipped} skippées, ${errors} erreurs`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 3 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 4 : Tester sur un seul produit**

Repérer un ASIN valide dans le Google Sheet (ex: `B08XYZ123`), puis lancer :

```bash
node --env-file=.env.local node_modules/.bin/tsx scripts/generate-product-images.ts --asin=B08XYZ123
```

Expected output :
```
📋 Chargement des produits depuis Google Sheets...
📦 1 produits actifs à traiter (filtre: B08XYZ123)

🎨 [1/1] {label} (B08XYZ123) — génération en cours...
✅ [1/1] {label} (B08XYZ123) — stockée: https://xxxx.public.blob.vercel-storage.com/product-images/B08XYZ123.png

📊 Résumé: 1 générées, 0 skippées, 0 erreurs
```

Ouvrir l'URL retournée dans le navigateur et vérifier que l'image s'affiche.

- [ ] **Step 5 : Tester le skip (relancer sans `--force`)**

```bash
node --env-file=.env.local node_modules/.bin/tsx scripts/generate-product-images.ts --asin=B08XYZ123
```

Expected : `⏭️  [1/1] {label} (B08XYZ123) — déjà existante, skip`

- [ ] **Step 6 : Commit**

```bash
git add scripts/generate-product-images.ts
git commit -m "feat: add batch product image generation script"
```

---

### Task 3 : Injecter les URLs Blob dans `/api/recommend`

**Files:**
- Modify: `app/api/recommend/route.ts`

- [ ] **Step 1 : Ajouter l'import**

En haut de `app/api/recommend/route.ts`, après les imports existants, ajouter :

```ts
import { getProductImageMap } from '@/lib/image-cache';
```

- [ ] **Step 2 : Appeler `getProductImageMap()` dans le handler**

Dans la fonction `POST`, juste avant le bloc de déduplication/formatage (la ligne `const seen = new Set<string>()`), ajouter :

```ts
const productImageMap = await getProductImageMap();
```

- [ ] **Step 3 : Utiliser la map dans le `.map()`**

Dans le `.map((p) => ({ ... }))`, remplacer :

```ts
imageUrl: p.imageUrl,
```

par :

```ts
imageUrl: productImageMap.get(p.asin) ?? p.imageUrl,
```

- [ ] **Step 4 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 5 : Tester l'endpoint en dev**

```bash
npm run dev
```

Dans un autre terminal, envoyer une requête POST à l'API avec un wizardState minimal. Adapter les valeurs selon les données réelles du Sheet :

```bash
curl -s -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "destinationCountry": "FR",
    "travelers": 1,
    "ages": [30],
    "animals": 0
  }' | npx --yes jq '.[0:3] | .[] | {label, asin, imageUrl}'
```

Expected : les 3 premiers produits affichés avec leur `imageUrl`. Le produit dont tu as généré l'image à Task 2 doit avoir une URL Vercel Blob (`https://xxxx.public.blob.vercel-storage.com/product-images/{asin}.png`).

- [ ] **Step 6 : Commit**

```bash
git add app/api/recommend/route.ts
git commit -m "feat: inject Vercel Blob product image URLs in recommend API"
```

---

### Task 4 : Batch complet et vérification finale

- [ ] **Step 1 : Lancer le batch sur tous les produits**

```bash
node --env-file=.env.local node_modules/.bin/tsx scripts/generate-product-images.ts
```

Le script tourne environ 2-3 minutes pour 50 produits. Suivre la progression dans les logs.

- [ ] **Step 2 : Vérifier dans le dashboard Vercel Blob**

Dashboard Vercel → Storage → Blob Store → parcourir le dossier `product-images/`. Vérifier que les fichiers `{asin}.png` sont présents.

- [ ] **Step 3 : Vérifier l'affichage sur la page résultats**

```bash
npm run dev
```

Compléter le wizard et vérifier que les images produits s'affichent sur `/results`. Si une image ne s'affiche pas, vérifier dans le Network DevTools que la requête vers Vercel Blob aboutit (status 200).

- [ ] **Step 4 : Si des erreurs pendant le batch, relancer uniquement les ratés**

Pour régénérer un produit spécifique qui a échoué :

```bash
node --env-file=.env.local node_modules/.bin/tsx scripts/generate-product-images.ts --asin=ASIN_EN_ERREUR
```

Pour tout regénérer (ex: si tu veux changer le prompt) :

```bash
node --env-file=.env.local node_modules/.bin/tsx scripts/generate-product-images.ts --force
```
