# PDF Banner — Design Spec
**Date:** 2026-05-09
**Feature:** Refonte export PDF avec bannière IA destination
**Status:** Approved

---

## Objectif

Intégrer la bannière IA destination (image gpt-image-2 déjà générée et mise en cache) dans le header du PDF checklist, en cohérence avec l'expérience web. Le téléchargement attend toujours que l'image soit prête (max 15s), puis tombe sur la barre verte actuelle en fallback.

---

## Architecture

```
downloadChecklist (results/page.tsx)
  ├─ setPdfLoading(true) → bouton spinner "Préparation du PDF..."
  ├─ waitForImage() — poll imageRef.current toutes les 500ms, timeout 15s
  │   ├─ Image disponible → imageUrl = destinationImage
  │   └─ Timeout → imageUrl = null (fallback)
  └─ generateChecklistPDF({ ...pdfData, bannerImageUrl: imageUrl ?? undefined })
      ├─ bannerImageUrl fournie
      │   ├─ fetch(url) → blob → FileReader → base64
      │   ├─ doc.addImage(base64, 0, 0, 210, 55) — pleine largeur A4
      │   ├─ overlay sombre semi-transparent (GState opacity 0.45)
      │   └─ texte blanc "DON'T FORGET" + destination + dates
      └─ bannerImageUrl absente ou fetch échoue
          └─ barre verte actuelle (code existant inchangé)
```

---

## Fichiers modifiés

### `lib/pdf-generator.ts`

**Interface `PDFTripData`** — ajouter un champ optionnel :
```typescript
bannerImageUrl?: string;
```

**Fonction `generateChecklistPDF`** — remplacer le bloc header existant par :

```typescript
// Charger l'image banner si disponible
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
    // Image pleine largeur A4, 55mm de haut
    doc.addImage(base64, 'PNG', 0, 0, 210, 55);
    // Overlay sombre pour lisibilité du texte
    // GState import: import { GState } from 'jspdf' en haut du fichier
    doc.setGState(new GState({ opacity: 0.45 }));
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 55, 'F');
    doc.setGState(new GState({ opacity: 1 }));
    bannerLoaded = true;
  } catch {
    // Fallback silencieux → barre verte ci-dessous
  }
}

if (!bannerLoaded) {
  // Header fallback — barre verte (code actuel conservé)
  doc.setFillColor(9, 145, 66);
  doc.rect(0, 0, pageWidth, 50, 'F');
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
doc.text(`${tripData.destination} • ${tripData.startDate} - ${tripData.endDate}`, pageWidth / 2, 40, { align: 'center' });

currentY = 65; // Identique dans les deux cas (fallback barre verte = 50px → on aligne à 65 pour marge)
```

### `app/results/page.tsx`

**Nouveau state** (près des autres états) :
```typescript
const [pdfLoading, setPdfLoading] = useState(false);
const imageRef = useRef<string | null>(null);
```

**Sync ref avec state** (après les autres useEffect) :
```typescript
useEffect(() => {
  imageRef.current = destinationImage;
}, [destinationImage]);
```

**Fonction `waitForImage`** (dans le composant, avant `downloadChecklist`) :
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

**`downloadChecklist`** — remplacer le contenu par :
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
      products: products.map(product => ({
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

**Bouton téléchargement** — ajouter `disabled` + spinner :
```tsx
<button
  onClick={downloadChecklist}
  disabled={pdfLoading}
  className="flex-1 text-white text-xs font-medium transition-colors flex items-center justify-center hover:opacity-90 disabled:opacity-60"
  style={{ backgroundColor: '#1a1a1a', height: '39.41px', borderRadius: '35.29px',
    border: '0.82px solid transparent', paddingTop: '8.21px', paddingBottom: '8.21px',
    paddingLeft: '18.88px', paddingRight: '20.52px' }}
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

---

## Comportement

| Scénario | Résultat |
|----------|---------|
| Image déjà chargée au clic | Génération immédiate avec bannière IA |
| Image encore en cours de chargement | Spinner "Préparation..." jusqu'à ce qu'elle arrive (max 15s) |
| Timeout 15s sans image | PDF généré avec barre verte fallback |
| Fetch image échoue dans jsPDF | PDF généré avec barre verte fallback silencieux |
| OPENAI_API_KEY absente | `destinationImage` = null → barre verte (timeout immédiat) |

---

## Hors scope

- Miniature des produits dans le PDF (images Amazon)
- Pagination intelligente selon nombre de produits
- Template PDF alternatif (paysage, couleurs différentes)
