# Results Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer la page `/results` avec une section statique Indispensables, des produits groupés par catégorie (depuis le champ `category` du Google Sheet), et des badges Essentiel / Recommandé IA sur chaque carte produit.

**Architecture:** Le champ `category` (string libre) est ajouté à `ProductRecordSchema` et parsé depuis le Sheet, puis passé dans la réponse API avec `mustHave` (booléen). La page résultats affiche d'abord une section Indispensables statique cochable, puis les produits groupés par catégorie selon `CATEGORY_ORDER`. Les constantes de catégorie vivent dans `lib/constants.ts`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Zod, jsPDF, TailwindCSS, React hooks

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `lib/schemas.ts` | Modify | Ajouter `category` + `mustHave` à `ProductRecordSchema` et `ProductResponseSchema` |
| `lib/sheets.ts` | Modify | Parser la colonne `category` dans `HEADER_SYNONYMS` + `mapRow` |
| `app/api/recommend/route.ts` | Modify | Inclure `category` + `mustHave` dans le `.map()` de réponse |
| `lib/constants.ts` | Modify | Ajouter `INDISPENSABLES`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `CATEGORY_ICONS` |
| `app/results/page.tsx` | Modify | Redesign: section Indispensables + groupes catégories + badges + `ProductCard` |

---

## Task 1: Mettre à jour `lib/schemas.ts`

**Files:**
- Modify: `lib/schemas.ts`

- [ ] **Step 1: Lire le fichier**

```bash
head -70 lib/schemas.ts
```

Repérer `ProductRecordSchema` (ligne ~42) et `ProductResponseSchema` (ligne ~63).

- [ ] **Step 2: Ajouter `category` à `ProductRecordSchema`**

Trouver:
```typescript
    imageUrl: z.string().url().optional(),
  })
  .refine((p) => p.ageMin <= p.ageMax, {
```

Remplacer par:
```typescript
    imageUrl: z.string().url().optional(),
    category: z.string().optional(),
  })
  .refine((p) => p.ageMin <= p.ageMax, {
```

- [ ] **Step 3: Ajouter `category` et `mustHave` à `ProductResponseSchema`**

Trouver:
```typescript
export const ProductResponseSchema = z.object({
  label: z.string(),
  asin: z.string(),
  marketplace: Iso2CountrySchema,
  explain: z.array(z.string()),
  imageUrl: z.string().url().optional(),
});
```

Remplacer par:
```typescript
export const ProductResponseSchema = z.object({
  label: z.string(),
  asin: z.string(),
  marketplace: Iso2CountrySchema,
  explain: z.array(z.string()),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  mustHave: z.boolean().optional(),
});
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas.ts
git commit -m "feat: add category and mustHave to product schemas"
```

---

## Task 2: Mettre à jour `lib/sheets.ts`

**Files:**
- Modify: `lib/sheets.ts`

- [ ] **Step 1: Ajouter `category` dans `HEADER_SYNONYMS`**

Trouver:
```typescript
  imageUrl: ['imageurl', 'image url', 'image_url', 'image-url', 'imagelien', 'image lien', 'image_lien', 'image-lien', 'url image', 'lien image'],
};
```

Remplacer par:
```typescript
  imageUrl: ['imageurl', 'image url', 'image_url', 'image-url', 'imagelien', 'image lien', 'image_lien', 'image-lien', 'url image', 'lien image'],
  category: ['category', 'categorie', 'catégorie'],
};
```

- [ ] **Step 2: Ajouter `category` dans `mapRow`**

Trouver:
```typescript
    const candidate = {
      label: (r[idx('label')] || r[idx('Nom' as any)] || '').toString().trim(),
      asin: (r[idx('asin')] || '').toString().trim(),
      status: normalizeStatus(r[idx('status')]),
      mustHave: normalizeBoolean(r[idx('mustHave')]),
      priority: toInt(r[idx('priority')], 0),
      audience: normalizeAudience(r[idx('audience')]),
      ageMin: toInt(r[idx('ageMin')] ?? r[idx('age min' as any)], 0),
      ageMax: toInt(r[idx('ageMax')] ?? r[idx('age max' as any)], 120),
      tags: tags as any,
      countryCodes: parseCountries(r[idx('countryCodes')]),
      imageUrl,
    };
```

Remplacer par:
```typescript
    const candidate = {
      label: (r[idx('label')] || r[idx('Nom' as any)] || '').toString().trim(),
      asin: (r[idx('asin')] || '').toString().trim(),
      status: normalizeStatus(r[idx('status')]),
      mustHave: normalizeBoolean(r[idx('mustHave')]),
      priority: toInt(r[idx('priority')], 0),
      audience: normalizeAudience(r[idx('audience')]),
      ageMin: toInt(r[idx('ageMin')] ?? r[idx('age min' as any)], 0),
      ageMax: toInt(r[idx('ageMax')] ?? r[idx('age max' as any)], 120),
      tags: tags as any,
      countryCodes: parseCountries(r[idx('countryCodes')]),
      imageUrl,
      category: (r[idx('category')] || '').toString().trim().toLowerCase() || undefined,
    };
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add lib/sheets.ts
git commit -m "feat: parse category column from Google Sheet"
```

---

## Task 3: Mettre à jour `app/api/recommend/route.ts`

**Files:**
- Modify: `app/api/recommend/route.ts`

- [ ] **Step 1: Ajouter `category` et `mustHave` dans le `.map()` de réponse**

Trouver:
```typescript
      .map((p) => ({
        label: p.label,
        asin: p.asin,
        marketplace,
        imageUrl: p.imageUrl,
        explain: [
          `destination=${wizard.destinationCountry}`,
          `marketplace=${marketplace}`,
          `ageRange=${groupMinAge}-${groupMaxAge}`,
          ...(p.mustHave ? ['mustHave=true'] : []),
          `priority=${p.priority}`,
          `ai=${aiResult.source}`,
          ...(aiResult.reason ? [`aiReason=${aiResult.reason}`] : []),
        ],
      }));
```

Remplacer par:
```typescript
      .map((p) => ({
        label: p.label,
        asin: p.asin,
        marketplace,
        imageUrl: p.imageUrl,
        category: p.category,
        mustHave: p.mustHave,
        explain: [
          `destination=${wizard.destinationCountry}`,
          `marketplace=${marketplace}`,
          `ageRange=${groupMinAge}-${groupMaxAge}`,
          ...(p.mustHave ? ['mustHave=true'] : []),
          `priority=${p.priority}`,
          `ai=${aiResult.source}`,
          ...(aiResult.reason ? [`aiReason=${aiResult.reason}`] : []),
        ],
      }));
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add app/api/recommend/route.ts
git commit -m "feat: include category and mustHave in recommend API response"
```

---

## Task 4: Mettre à jour `lib/constants.ts`

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Ajouter les constantes en fin de fichier**

Ouvrir `lib/constants.ts`. Il se termine actuellement autour de la ligne 57 après `getCategoryFromTag`. Ajouter après la dernière ligne :

```typescript

export const INDISPENSABLES = [
  { label: 'Passeport', icon: '🛂' },
  { label: "Pièce d'identité", icon: '🪪' },
  { label: 'Téléphone chargé', icon: '📱' },
  { label: 'Chargeur universel', icon: '🔌' },
  { label: 'Carte bancaire internationale', icon: '💳' },
  { label: 'Assurance voyage', icon: '🏥' },
  { label: 'Billets / réservations', icon: '✈️' },
  { label: 'Médicaments personnels', icon: '💊' },
] as const;

export const CATEGORY_ORDER = [
  'securite',
  'sante',
  'vetements',
  'chaussures',
  'accessoires',
  'bagagerie',
  'electronique',
  'sport',
  'confort',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  securite: 'Sécurité',
  sante: 'Santé',
  vetements: 'Vêtements',
  chaussures: 'Chaussures',
  accessoires: 'Accessoires',
  bagagerie: 'Bagagerie',
  electronique: 'Électronique',
  sport: 'Sport',
  confort: 'Confort',
};

export const CATEGORY_ICONS: Record<string, string> = {
  securite: '🔒',
  sante: '💊',
  vetements: '🧥',
  chaussures: '👟',
  accessoires: '🎒',
  bagagerie: '🧳',
  electronique: '⚡',
  sport: '🏃',
  confort: '😌',
};
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add INDISPENSABLES, CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS constants"
```

---

## Task 5: Refonte `app/results/page.tsx`

**Files:**
- Modify: `app/results/page.tsx`

### Step 1 — Ajouter les imports constants

- [ ] **Step 1: Ajouter l'import des constantes**

Trouver:
```typescript
import { config } from '@/lib/config';
```

Remplacer par:
```typescript
import { config } from '@/lib/config';
import {
  INDISPENSABLES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/lib/constants';
```

### Step 2 — Mettre à jour le type `ProductItem`

- [ ] **Step 2: Ajouter `category` et `mustHave` au type**

Trouver:
```typescript
type ProductItem = {
  label: string;
  asin: string;
  marketplace: string;
  price?: string;
  originalPrice?: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  availability?: string;
  inStock?: boolean;
};
```

Remplacer par:
```typescript
type ProductItem = {
  label: string;
  asin: string;
  marketplace: string;
  price?: string;
  originalPrice?: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  availability?: string;
  inStock?: boolean;
  category?: string;
  mustHave?: boolean;
};
```

### Step 3 — Ajouter le state Indispensables

- [ ] **Step 3: Ajouter `checkedIndispensables` state**

Trouver:
```typescript
  const [tripCountryCode, setTripCountryCode] = useState('');
```

Remplacer par:
```typescript
  const [tripCountryCode, setTripCountryCode] = useState('');
  const [checkedIndispensables, setCheckedIndispensables] = useState<Set<string>>(new Set());
```

### Step 4 — Mapper `category` et `mustHave` depuis l'API

- [ ] **Step 4: Ajouter category et mustHave dans la transformation des produits**

Trouver:
```typescript
        const transformedProducts: ProductItem[] = apiProducts.map((product: any, index: number) => ({
          label: product.label || 'Produit sans nom',
          asin: product.asin || `unknown-${index}`,
          marketplace: product.marketplace || 'FR',
          imageUrl: product.imageUrl,
          price: undefined,
          originalPrice: undefined,
          description: `Recommandé pour votre voyage.`,
          availability: "Voir sur Amazon",
          inStock: true
        }));
```

Remplacer par:
```typescript
        const transformedProducts: ProductItem[] = apiProducts.map((product: any, index: number) => ({
          label: product.label || 'Produit sans nom',
          asin: product.asin || `unknown-${index}`,
          marketplace: product.marketplace || 'FR',
          imageUrl: product.imageUrl,
          price: undefined,
          originalPrice: undefined,
          description: `Recommandé pour votre voyage.`,
          availability: "Voir sur Amazon",
          inStock: true,
          category: product.category,
          mustHave: product.mustHave,
        }));
```

### Step 5 — Ajouter le composant `ProductCard` et la fonction `groupByCategory`

- [ ] **Step 5: Ajouter `groupByCategory` et `ProductCard` avant le composant principal**

Juste avant la ligne `export default function ResultsPage() {`, ajouter :

```typescript
function groupByCategory(products: ProductItem[]): { category: string; items: ProductItem[] }[] {
  const map = new Map<string, ProductItem[]>();
  for (const p of products) {
    const cat = p.category || 'autre';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const ordered: { category: string; items: ProductItem[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) ordered.push({ category: cat, items: map.get(cat)! });
  }
  for (const [cat, items] of map) {
    if (!(CATEGORY_ORDER as readonly string[]).includes(cat)) {
      ordered.push({ category: cat, items });
    }
  }
  return ordered;
}

function ProductCard({
  product,
  isPlanned,
  onTogglePlanned,
}: {
  product: ProductItem;
  isPlanned: boolean;
  onTogglePlanned: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex gap-4">
      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.label}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center">
            <div>📦</div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
            {product.label}
          </h3>
          {product.mustHave ? (
            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              Essentiel
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              Recommandé IA
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={`/api/affiliate/${product.asin}?marketplace=${product.marketplace}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-xs font-medium px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            Voir sur Amazon
          </a>
          <button
            onClick={onTogglePlanned}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: isPlanned ? '#099142' : '#e5e7eb',
              color: isPlanned ? '#fff' : '#374151',
            }}
          >
            {isPlanned ? 'Prévu ✓' : 'Pas prévu'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 6 — Remplacer le contenu principal (zone 8 colonnes)

- [ ] **Step 6: Remplacer le bloc "Résultats" (lg:col-span-8)**

Trouver le bloc entier qui commence par :
```tsx
          {/* Résultats (Upstream Layout) */}
          <div className="lg:col-span-8">
            <div className="mb-4 sm:mb-6 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Votre checklist personnalisée</h1>
              <p className="text-sm sm:text-base text-gray-600 px-2 sm:px-0">
                Recommandations personnalisées pour votre voyage à {tripSummary.destination}.
                Ces produits ont été sélectionnés selon vos activités et votre destination.
              </p>
            </div>

            <div className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-gray-900 px-1">
              Produits conseillés :
            </div>

            {apiLoading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                <p className="text-gray-600">Génération de vos recommandations personnalisées...</p>
              </div>
            )}

            {!apiLoading && products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Aucune recommandation trouvée pour ce voyage.</p>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              {!apiLoading && products.map((product, index) => (
                <div key={product.asin} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Image produit */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.label}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 80px, 96px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-gray-400 text-xs text-center">
                              <div>📦</div>
                              <div className="text-[10px] mt-1">Image à venir</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-tight">
                          {product.label}
                        </h3>
                        {product.price && (
                          <div className="text-left sm:text-right sm:ml-4">
                            <div className="font-bold text-gray-900">{product.price}</div>
                            {product.originalPrice && (
                              <div className="text-sm text-gray-500 line-through">{product.originalPrice}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 sm:mb-4 leading-relaxed">
                        {product.description}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded self-start">
                          Recommandation IA
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
                          <a
                            href={`/api/affiliate/${product.asin}?marketplace=${product.marketplace}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1 w-full sm:w-auto"
                            style={{ backgroundColor: '#1a1a1a' }}
                          >
                            <span className="hidden sm:inline">Voir plus sur amazon</span>
                            <span className="sm:hidden">Voir sur Amazon</span>
                          </a>

                          <button
                            onClick={() => toggleProductPlanned(product.asin)}
                            className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 w-full sm:w-auto"
                            style={{
                              backgroundColor: plannedProducts.has(product.asin) ? '#099142' : '#666666'
                            }}
                          >
                            {plannedProducts.has(product.asin) ? 'Déjà prévu ✓' : 'Pas prévu'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge IA pour les produits prioritaires */}
                  {product.description?.includes('mustHave=true') && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg" style={{ backgroundColor: '#E8F5E8', border: '1px solid #099142' }}>
                      <div className="font-medium text-xs sm:text-sm" style={{ color: '#099142' }}>
                        ⭐ Produit essentiel identifié par l&apos;IA
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
```

Remplacer par:
```tsx
          {/* Résultats */}
          <div className="lg:col-span-8">

            {/* Section Indispensables */}
            <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <h2 className="font-bold text-gray-900 text-base mb-4">
                ✈️ Indispensables pour tout voyage
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INDISPENSABLES.map((item) => {
                  const checked = checkedIndispensables.has(item.label);
                  return (
                    <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setCheckedIndispensables((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.label)) next.delete(item.label);
                            else next.add(item.label);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded accent-green-600 cursor-pointer"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          checked ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-gray-900'
                        }`}
                      >
                        {item.icon} {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Loading */}
            {apiLoading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                <p className="text-gray-600">Génération de vos recommandations personnalisées...</p>
              </div>
            )}

            {/* Vide */}
            {!apiLoading && products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Aucune recommandation trouvée pour ce voyage.</p>
              </div>
            )}

            {/* Produits groupés par catégorie */}
            {!apiLoading && groupByCategory(products).map(({ category, items }) => (
              <div key={category} className="mb-6">
                <h2 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <span>{CATEGORY_LABELS[category] ?? category}</span>
                  <span className="text-gray-400 text-sm font-normal">({items.length})</span>
                </h2>
                <div className="space-y-3">
                  {items.map((product) => (
                    <ProductCard
                      key={product.asin}
                      product={product}
                      isPlanned={plannedProducts.has(product.asin)}
                      onTogglePlanned={() => toggleProductPlanned(product.asin)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
```

### Step 7 — Vérification

- [ ] **Step 7: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 8: Vérifier lint**

```bash
npm run lint
```

Expected: aucune erreur.

- [ ] **Step 9: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat: redesign results page with categories, indispensables section, and product badges"
```

---

## Vérification manuelle post-implémentation

1. `npm run dev` (si pas déjà en cours)
2. Passer par le wizard `/voyage`, soumettre
3. Sur `/results` :
   - La section "Indispensables pour tout voyage" apparaît en haut du contenu
   - Cocher un item → il se barre, décocher → il revient
   - Les produits sont groupés par catégorie (🧥 Vêtements, 👟 Chaussures, etc.)
   - Les catégories sans produits sont absentes
   - Badge "Essentiel" (vert) sur les `mustHave`, badge "Recommandé IA" (bleu) sur les autres
   - Boutons "Voir sur Amazon" et "Prévu ✓ / Pas prévu" fonctionnels
