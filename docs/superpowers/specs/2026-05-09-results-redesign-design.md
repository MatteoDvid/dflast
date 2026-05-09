# Results Page Redesign — Design Spec
**Date:** 2026-05-09
**Feature:** Refonte page résultats — catégories, section Indispensables, badges Essentiel / IA
**Status:** Approved

---

## Objectif

Restructurer la page `/results` pour afficher :
1. Une section statique **Indispensables pour tout voyage** (checklist non-affiliée, cochable)
2. Les produits recommandés **groupés par catégorie** (depuis le champ `category` du Google Sheet)
3. Des **badges** sur chaque carte produit : "Essentiel" (mustHave=true) ou "Recommandé IA"

---

## Architecture

```
lib/schemas.ts          — ajouter category?: string aux deux schemas produit
lib/sheets.ts           — parser la colonne category depuis le Sheet
app/api/recommend/      — passer category dans la réponse
lib/constants.ts        — INDISPENSABLES[], CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_ICONS
app/results/page.tsx    — refonte UI: section Indispensables + groupes catégories + badges
```

---

## Fichiers modifiés

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `lib/schemas.ts` | Modify | Ajouter `category?: string` à `ProductRecordSchema` et `ProductResponseSchema` |
| `lib/sheets.ts` | Modify | Ajouter `category` dans `HEADER_SYNONYMS` + dans `mapRow` |
| `app/api/recommend/route.ts` | Modify | Inclure `category: p.category` dans le `.map()` de réponse |
| `lib/constants.ts` | Modify | Ajouter `INDISPENSABLES`, `CATEGORY_LABELS`, `CATEGORY_ORDER`, `CATEGORY_ICONS` |
| `app/results/page.tsx` | Modify | Redesign complet du contenu principal |

---

## Détail par fichier

### `lib/schemas.ts`

**`ProductRecordSchema`** — ajouter après `imageUrl` :
```typescript
category: z.string().optional(),
```

**`ProductResponseSchema`** — ajouter après `imageUrl` :
```typescript
category: z.string().optional(),
mustHave: z.boolean().optional(),
```

---

### `lib/sheets.ts`

**`HEADER_SYNONYMS`** — ajouter l'entrée :
```typescript
category: ['category', 'categorie', 'catégorie'],
```

**`mapRow` candidate object** — ajouter après `imageUrl` :
```typescript
category: (r[idx('category')] || '').toString().trim().toLowerCase() || undefined,
```

---

### `app/api/recommend/route.ts`

Dans le `.map((p) => ({ ... }))` de la réponse finale, ajouter :
```typescript
category: p.category,
mustHave: p.mustHave,
```

---

### `lib/constants.ts`

Ajouter en fin de fichier :

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

---

### `app/results/page.tsx`

#### Nouveaux types et states

Ajouter dans le type `ProductItem` existant :
```typescript
category?: string;
mustHave?: boolean;
```

Ajouter un state pour les Indispensables cochés :
```typescript
const [checkedIndispensables, setCheckedIndispensables] = useState<Set<string>>(new Set());
```

#### Fonction de groupement

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
  // Catégories non listées dans CATEGORY_ORDER → à la fin
  for (const [cat, items] of map) {
    if (!CATEGORY_ORDER.includes(cat as any)) ordered.push({ category: cat, items });
  }
  return ordered;
}
```

#### Layout du contenu principal (zone 8 colonnes)

Remplacer le bloc actuel ("Produits conseillés" + flat list) par :

**1. Section Indispensables**
```tsx
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
              setCheckedIndispensables(prev => {
                const next = new Set(prev);
                if (next.has(item.label)) next.delete(item.label);
                else next.add(item.label);
                return next;
              });
            }}
            className="w-4 h-4 rounded accent-green-600 cursor-pointer"
          />
          <span className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-gray-700'} group-hover:text-gray-900 transition-colors`}>
            {item.icon} {item.label}
          </span>
        </label>
      );
    })}
  </div>
</div>
```

**2. Produits groupés par catégorie**
```tsx
{groupByCategory(products).map(({ category, items }) => (
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
```

#### Composant `ProductCard` (inline dans le fichier)

```tsx
function ProductCard({
  product,
  isPlanned,
  onTogglePlanned,
}: {
  product: ProductItem;
  isPlanned: boolean;
  onTogglePlanned: () => void;
}) {
  const isMustHave = product.mustHave === true;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex gap-4">
      {/* Image */}
      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.label} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center">
            <div>📦</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">{product.label}</h3>
          {isMustHave ? (
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


---

## Comportement

| Scénario | Résultat |
|----------|---------|
| Produit sans `category` dans le Sheet | Affiché dans un groupe "autre" à la fin |
| Catégorie entière absente des résultats | Section non affichée (pas de groupe vide) |
| Tous les Indispensables cochés | Tous barrés, section reste visible |
| `mustHave=true` | Badge vert "Essentiel", pas de badge bleu |
| `mustHave=false` | Badge bleu "Recommandé IA" |

---

## Hors scope

- Filtres/tri par catégorie (navigation tabs)
- Pagination des résultats
- Prix Amazon en temps réel (PA-API)
- Sections catégories pliables/dépliables
