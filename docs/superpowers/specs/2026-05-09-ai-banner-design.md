# AI Destination Banner — Design Spec
**Date:** 2026-05-09  
**Feature:** Bannière IA décorative en tête de la page résultats  
**Status:** Approved

---

## Objectif

Afficher une image générée par IA (gpt-image-2) en bannière pleine largeur en haut de la page `/results`, représentant la destination du voyage. L'image est générée une seule fois par destination et mise en cache dans Vercel Blob — les utilisateurs suivants pour la même ville reçoivent l'URL permanente sans appel IA.

---

## Architecture

```
Wizard (sessionStorage)
  ↓ city + region + countryCode
Results page
  ↓ POST /api/destination-image { city?, region?, countryCode }
API route
  ├─ Compute cache key (city > region > country)
  ├─ list() Vercel Blob avec ce préfixe
  │   ├─ Trouvé → return { url } (cache hit, 0 génération)
  │   └─ Non trouvé
  │       ├─ Appel gpt-image-2 (1536×1024, qualité high)
  │       ├─ Download binaire depuis URL temporaire OpenAI
  │       ├─ put() vers Vercel Blob (clé prédictible, permanent)
  │       └─ return { url } permanente
Results page
  └─ Bannière pleine largeur avec gradient overlay + texte destination
```

---

## Clés de cache Vercel Blob

Les clés sont normalisées (lowercase, sans accents, tirets) :

| Niveau | Exemple de clé |
|--------|---------------|
| Ville | `destination-images/paris-fr.png` |
| Région | `destination-images/region-bretagne-fr.png` |
| Pays | `destination-images/country-fr.png` |

**Règle de sélection :** on utilise le niveau le plus précis disponible dans les données sessionStorage. Si `city` est absent, on descend à `region`, puis à `countryCode`.

---

## Prompt gpt-image-2

```
A breathtaking, cinematic travel photography shot of {subject}.
Stunning natural light, no text, no people, photorealistic, 8k quality.
```

Où `{subject}` vaut :
- `{city}, {country}` si ville disponible
- `the {region} region, {country}` si seulement région disponible
- `{country}` si seulement le pays est connu

Paramètres API : `model: gpt-image-2`, `size: 1536x1024`, `quality: high`.

---

## Fichiers modifiés

### `app/api/geocode/route.ts`
- Extraire `item.address?.state` depuis la réponse Nominatim
- Ajouter `region: string` au type de retour et à la réponse JSON

### `app/api/destination-image/route.ts`
Réécriture complète :
1. Accepte `POST { city?, region?, countryCode: string }`
2. Valide que `countryCode` est présent (requis minimum)
3. `slugify()` helper : lowercase + strip accents + remplace espaces par `-`
4. Construit `cacheKey` selon le niveau disponible
5. `list({ prefix: cacheKey })` via `@vercel/blob`
6. Si résultat non vide → retourne `{ url: blobs[0].url }`
7. Sinon : appel OpenAI SDK `openai.images.generate({ model: 'gpt-image-2', size: '1536x1024', quality: 'high', response_format: 'b64_json' })`
8. `Buffer.from(data[0].b64_json, 'base64')` — binaire disponible directement, pas de re-fetch
9. `put(cacheKey, buffer, { access: 'public', contentType: 'image/png', addRandomSuffix: false })`
10. Retourne `{ url: blob.url }`
11. Si `OPENAI_API_KEY` absent → retourne `{ url: null }` (pas d'erreur 500)

### `app/voyage/page.tsx`
- Au `setSelectedLocation(suggestion)` : inclure `suggestion.region` dans l'objet stocké dans sessionStorage

### `app/results/page.tsx`
- Supprimer tous les conditionnels `NEXT_PUBLIC_ENABLE_AI_IMAGES`
- La bannière est **toujours rendue** (3 états : skeleton / image / gradient fallback)
- L'appel POST passe `{ city: tripData.destinationCity, region: tripData.region, countryCode: tripData.destinationCountry }`
- Hauteur bannière : `280px` mobile, `380px` desktop
- Structure : image `background-image` pleine largeur + gradient overlay `from-black/70 to-transparent` + texte destination centré en bas à gauche

### `next.config.js` (nouveau fichier)
```js
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};
module.exports = nextConfig;
```

---

## Setup requis (une fois)

1. `npm install @vercel/blob`
2. Créer un store Vercel Blob depuis le dashboard (Storage → Create → Blob)
3. Ajouter `BLOB_READ_WRITE_TOKEN` dans `.env.local` et dans Vercel Environment Variables

---

## Variables d'environnement

| Variable | Rôle | Action |
|----------|------|--------|
| `BLOB_READ_WRITE_TOKEN` | Auth Vercel Blob | **Ajouter** |
| `OPENAI_API_KEY` | Génération image | Déjà présente |
| `NEXT_PUBLIC_ENABLE_AI_IMAGES` | Feature flag obsolète | **Supprimer** |
| `ENABLE_AI_IMAGES` | Feature flag obsolète | **Supprimer** |

---

## Comportement frontend

| État | Rendu |
|------|-------|
| Chargement | Skeleton animé (`animate-pulse`), fond gris, hauteur fixe |
| Image disponible | `background-image` pleine largeur, gradient overlay sombre, nom destination + tagline |
| Erreur ou `url: null` | Dégradé statique bleu-indigo, même layout texte — expérience dégradée propre |

---

## Hors scope

- Invalidation / régénération du cache (images permanentes, pas d'expiration)
- Dashboard admin pour visualiser les images générées
- Génération côté serveur pendant `/api/recommend` (ajout de latence, hors besoin)
- Édition ou modération des images générées
