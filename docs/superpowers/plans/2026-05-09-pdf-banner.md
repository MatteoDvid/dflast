# PDF Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intégrer la bannière IA destination dans le header du PDF checklist, avec attente de l'image jusqu'à 15s et fallback barre verte.

**Architecture:** `lib/pdf-generator.ts` reçoit `bannerImageUrl?` dans `PDFTripData`, fetch l'image, l'injecte via jsPDF avec un overlay sombre, et retombe sur la barre verte si indisponible. `app/results/page.tsx` ajoute un `imageRef` (toujours à jour contrairement au state dans un closure), un `waitForImage()` qui poll le ref max 15s, et un state `pdfLoading` pour le spinner bouton.

**Tech Stack:** jsPDF 3.x (`GState` import), React `useRef` + `useCallback`, TypeScript strict

---

## File Map

| File | Action | Responsabilité |
|------|--------|----------------|
| `lib/pdf-generator.ts` | Modify | Ajouter `bannerImageUrl?` à l'interface, remplacer le bloc header |
| `app/results/page.tsx` | Modify | Ajouter `pdfLoading`, `imageRef`, `waitForImage`, mise à jour `downloadChecklist` + bouton |

---

## Task 1: Mettre à jour `lib/pdf-generator.ts`

**Files:**
- Modify: `lib/pdf-generator.ts`

- [ ] **Step 1: Lire le fichier**

```bash
head -30 lib/pdf-generator.ts
```

Vérifier que la ligne 1 est `import jsPDF from 'jspdf';` et que l'interface `PDFTripData` est déclarée autour de la ligne 4.

- [ ] **Step 2: Mettre à jour l'import jsPDF pour inclure GState**

Trouver:
```typescript
import jsPDF from 'jspdf';
```

Remplacer par:
```typescript
import jsPDF, { GState } from 'jspdf';
```

- [ ] **Step 3: Ajouter `bannerImageUrl` à l'interface PDFTripData**

Trouver:
```typescript
interface PDFTripData {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  animals?: number;
  activities?: string[];
  products: PDFProduct[];
  affiliateTag?: string;
}
```

Remplacer par:
```typescript
interface PDFTripData {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  animals?: number;
  activities?: string[];
  products: PDFProduct[];
  affiliateTag?: string;
  bannerImageUrl?: string;
}
```

- [ ] **Step 4: Remplacer le bloc header dans `generateChecklistPDF`**

Trouver le bloc qui commence par:
```typescript
  // Header avec fond vert
  doc.setFillColor(9, 145, 66); // #099142
  doc.rect(0, 0, pageWidth, 50, 'F');
```

Et qui se termine par:
```typescript
  currentY = 60;
```

Remplacer l'intégralité de ce bloc (header vert + logo + titre + currentY = 60) par:

```typescript
  // Header — bannière IA si disponible, sinon barre verte
  let bannerLoaded = false;
  if (tripData.bannerImageUrl) {
    try {
      const res = await fetch(tripData.bannerImageUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', 0, 0, pageWidth, 55);
      doc.setGState(new GState({ opacity: 0.45 }));
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 55, 'F');
      doc.setGState(new GState({ opacity: 1 }));
      bannerLoaded = true;
    } catch {
      // Fallback silencieux → barre verte ci-dessous
    }
  }

  if (!bannerLoaded) {
    doc.setFillColor(9, 145, 66);
    doc.rect(0, 0, pageWidth, 55, 'F');
  }

  // Texte header — blanc dans les deux cas
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("DON'T FORGET", pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('CHECKLIST VOYAGE PERSONNALISÉE', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.text(
    `${tripData.destination} • ${tripData.startDate} - ${tripData.endDate}`,
    pageWidth / 2,
    42,
    { align: 'center' },
  );

  currentY = 65;
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune nouvelle erreur. Si `GState` n'est pas reconnu, vérifier que jsPDF 3.x est bien installé : `npm ls jspdf` doit afficher `jspdf@3.x.x`.

- [ ] **Step 6: Commit**

```bash
git add lib/pdf-generator.ts
git commit -m "feat: integrate AI destination banner into PDF checklist header"
```

---

## Task 2: Mettre à jour `app/results/page.tsx`

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Ajouter `useRef` et `useCallback` aux imports React**

Trouver (ligne 1) :
```typescript
import React, { useEffect, useState } from 'react';
```

Remplacer par :
```typescript
import React, { useCallback, useEffect, useRef, useState } from 'react';
```

- [ ] **Step 2: Ajouter le state `pdfLoading` et le ref `imageRef`**

Trouver :
```typescript
  const [destinationImage, setDestinationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [tripRegion, setTripRegion] = useState('');
  const [tripCityRaw, setTripCityRaw] = useState('');
  const [tripCountryCode, setTripCountryCode] = useState('');
```

Remplacer par :
```typescript
  const [destinationImage, setDestinationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [tripRegion, setTripRegion] = useState('');
  const [tripCityRaw, setTripCityRaw] = useState('');
  const [tripCountryCode, setTripCountryCode] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const imageRef = useRef<string | null>(null);
```

- [ ] **Step 3: Ajouter le useEffect de sync ref**

Après le dernier `useEffect` existant dans le composant (celui qui fetch la banner image), ajouter :

```typescript
  useEffect(() => {
    imageRef.current = destinationImage;
  }, [destinationImage]);
```

- [ ] **Step 4: Ajouter la fonction `waitForImage`**

Juste avant la fonction `downloadChecklist`, ajouter :

```typescript
  const waitForImage = useCallback((): Promise<string | null> => {
    if (imageRef.current) return Promise.resolve(imageRef.current);
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (imageRef.current) {
          clearInterval(interval);
          resolve(imageRef.current);
        } else if (Date.now() - start > 15000) {
          clearInterval(interval);
          resolve(null);
        }
      }, 500);
    });
  }, []);
```

- [ ] **Step 5: Remplacer `downloadChecklist`**

Trouver la fonction `downloadChecklist` existante (commence par `const downloadChecklist = async () => {`). Remplacer son contenu complet par :

```typescript
  const downloadChecklist = async () => {
    try {
      setPdfLoading(true);
      const bannerImageUrl = await waitForImage();

      const pdfData = {
        destination: tripSummary.destination,
        startDate: tripSummary.startDate,
        endDate: tripSummary.endDate,
        adults: tripSummary.adults,
        children: tripSummary.children,
        animals: tripSummary.animals,
        activities: tripSummary.activities,
        products: products.map((product) => ({
          label: product.label,
          asin: product.asin,
          isPlanned: plannedProducts.has(product.asin),
          description: product.description,
          price: product.price,
        })),
        affiliateTag: config.amazonAffiliateTag,
        bannerImageUrl: bannerImageUrl ?? undefined,
      };

      await generateChecklistPDF(pdfData);

      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);
    } catch (err) {
      console.error('Erreur PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setPdfLoading(false);
    }
  };
```

- [ ] **Step 6: Mettre à jour le bouton de téléchargement**

Trouver le bouton qui appelle `downloadChecklist` dans le JSX. Il ressemble à :

```tsx
                <button
                  onClick={downloadChecklist}
                  className="flex-1 text-white text-xs font-medium transition-colors flex items-center justify-center hover:opacity-90"
                  style={{
                    backgroundColor: '#1a1a1a',
                    height: '39.41px',
                    borderRadius: '35.29px',
                    border: '0.82px solid transparent',
                    paddingTop: '8.21px',
                    paddingBottom: '8.21px',
                    paddingLeft: '18.88px',
                    paddingRight: '20.52px'
                  }}
                >
                  <span className="hidden sm:inline">Télécharger la checklist</span>
                  <span className="sm:hidden">Télécharger PDF</span>
                </button>
```

Remplacer par :

```tsx
                <button
                  onClick={downloadChecklist}
                  disabled={pdfLoading}
                  className="flex-1 text-white text-xs font-medium transition-colors flex items-center justify-center hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: '#1a1a1a',
                    height: '39.41px',
                    borderRadius: '35.29px',
                    border: '0.82px solid transparent',
                    paddingTop: '8.21px',
                    paddingBottom: '8.21px',
                    paddingLeft: '18.88px',
                    paddingRight: '20.52px'
                  }}
                >
                  {pdfLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      <span>Préparation...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Télécharger la checklist</span>
                      <span className="sm:hidden">Télécharger PDF</span>
                    </>
                  )}
                </button>
```

- [ ] **Step 7: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur. Si `useCallback` génère une erreur sur `waitForImage` (le tableau de dépendances est vide `[]` car le ref ne change pas), c'est normal.

- [ ] **Step 8: Vérifier lint**

```bash
npm run lint
```

Expected: pas d'erreur.

- [ ] **Step 9: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat: add PDF loading state, image wait logic, and spinner button"
```

---

## Vérification manuelle post-implémentation

1. `npm run dev` (déjà en cours)
2. Passer par le wizard, choisir une destination, soumettre
3. Sur `/results`, **avant** que la bannière apparaisse, cliquer immédiatement "Télécharger la checklist"
   - Expected : bouton affiche spinner "Préparation...", PDF généré quelques secondes après avec la bannière IA
4. Répéter avec la bannière déjà visible
   - Expected : PDF généré immédiatement avec la bannière IA
5. Ouvrir le PDF : vérifier que le header affiche la photo destination + texte blanc "DON'T FORGET" / destination / dates par-dessus
