import jsPDF from 'jspdf';
import { config } from './config';
import { INDISPENSABLES, CATEGORY_ORDER, CATEGORY_LABELS } from './constants';

interface PDFProduct {
  label: string;
  asin: string;
  isPlanned: boolean;
  description?: string;
  price?: string;
  imageUrl?: string;
  category?: string;
  mustHave?: boolean;
}

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
  checkedIndispensables?: string[];
}

function groupByCategory(products: PDFProduct[]): { category: string; items: PDFProduct[] }[] {
  const map = new Map<string, PDFProduct[]>();
  for (const p of products) {
    const cat = p.category || 'autre';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const ordered: { category: string; items: PDFProduct[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) ordered.push({ category: cat, items: map.get(cat)! });
  }
  for (const [cat, items] of map) {
    if (!(CATEGORY_ORDER as readonly string[]).includes(cat)) ordered.push({ category: cat, items });
  }
  return ordered;
}

async function fetchBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

// fit 'cover' : recadrage centré sans déformation (bannière)
// fit 'contain' : image entière sur fond blanc (vignettes produits)
function resizeViaCanvas(
  base64: string,
  w: number,
  h: number,
  quality = 0.8,
  fit: 'cover' | 'contain' = 'cover',
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        const targetRatio = w / h;
        const srcRatio = img.width / img.height;
        if (fit === 'cover') {
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (srcRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        } else {
          let dw = w, dh = h;
          if (srcRatio > targetRatio) {
            dh = w / srcRatio;
          } else {
            dw = h * srcRatio;
          }
          ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    } catch {
      resolve(base64);
    }
  });
}

const imgFormat = (b64: string) => (b64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG');

export async function generateChecklistPDF(tripData: PDFTripData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // ── A: PRÉ-CHARGER TOUTES LES IMAGES EN PARALLÈLE ──────────────────────────
  const bannerUrl = tripData.bannerImageUrl ?? '';
  const logoUrl = '/images/logodf.png';
  const productImageUrls = [...new Set(
    tripData.products.map((p) => p.imageUrl).filter((u): u is string => !!u)
  )];

  const urlsToFetch = [
    ...(bannerUrl ? [bannerUrl] : [logoUrl]),
    ...productImageUrls,
  ];

  const rawBase64s = await Promise.all(urlsToFetch.map(fetchBase64));
  const rawMap = new Map(urlsToFetch.map((url, i) => [url, rawBase64s[i]]));

  // ── B: REDIMENSIONNER EN PARALLÈLE (canvas) ─────────────────────────────────
  // Bannière → 630×150 (ratio 4.2:1 = zone PDF 210×50mm, recadrage cover sans
  // déformation), vignettes produits → 72×72 contain sur fond blanc
  type ResizeJob = [string, Promise<string>];
  const resizeJobs: ResizeJob[] = [];
  if (bannerUrl && rawMap.get(bannerUrl)) {
    resizeJobs.push([bannerUrl, resizeViaCanvas(rawMap.get(bannerUrl)!, 630, 150, 0.85, 'cover')]);
  }
  for (const url of productImageUrls) {
    const raw = rawMap.get(url);
    if (raw) resizeJobs.push([url, resizeViaCanvas(raw, 72, 72, 0.75, 'contain')]);
  }

  const resized = await Promise.all(
    resizeJobs.map(([url, p]) => p.then((b64) => [url, b64] as [string, string]))
  );
  const imgMap = new Map<string, string>([...rawMap, ...resized]);
  const getImg = (url: string) => imgMap.get(url) ?? '';

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (currentY + needed > pageHeight - 20) {
      doc.addPage();
      currentY = margin;
    }
  };

  const drawCheckbox = (x: number, y: number, checked: boolean, size = 5) => {
    const boxY = y - size + 1;
    if (checked) {
      doc.setFillColor(9, 145, 66);
      doc.rect(x, boxY, size, size, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(x + 1, boxY + size / 2, x + size * 0.4, boxY + size * 0.75);
      doc.line(x + size * 0.4, boxY + size * 0.75, x + size - 1, boxY + size * 0.2);
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(x, boxY, size, size);
    }
  };

  // ── HEADER ───────────────────────────────────────────────────────────────────
  if (bannerUrl) {
    const b64 = getImg(bannerUrl);
    if (b64) {
      doc.addImage(b64, imgFormat(b64), 0, 0, pageWidth, 50);
      const d = doc as any;
      if (typeof d.setGState === 'function') {
        d.setGState(new d.GState({ opacity: 0.5 }));
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageWidth, 50, 'F');
        d.setGState(new d.GState({ opacity: 1 }));
      }
    } else {
      doc.setFillColor(9, 145, 66);
      doc.rect(0, 0, pageWidth, 50, 'F');
    }
  } else {
    doc.setFillColor(9, 145, 66);
    doc.rect(0, 0, pageWidth, 50, 'F');
    const logoB64 = getImg(logoUrl);
    if (logoB64) {
      doc.addImage(logoB64, imgFormat(logoB64), 15, 15, 20, 20);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.circle(25, 25, 10, 'F');
      doc.setFillColor(9, 145, 66);
      doc.circle(25, 25, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DF', 25, 27.5, { align: 'center' });
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("DON'T FORGET", pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('CHECKLIST VOYAGE PERSONNALISEE', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.text(
    `${tripData.destination} - ${tripData.startDate} - ${tripData.endDate}`,
    pageWidth / 2, 40, { align: 'center' }
  );

  currentY = 60;

  // ── RÉCAPITULATIF ────────────────────────────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recapitulatif de votre voyage', margin, currentY);
  currentY += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('Voyageurs :', margin, currentY);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  let voyText = `${tripData.adults} adulte${tripData.adults > 1 ? 's' : ''}`;
  if (tripData.children > 0) voyText += `, ${tripData.children} enfant${tripData.children > 1 ? 's' : ''}`;
  if (tripData.animals && tripData.animals > 0) voyText += `, ${tripData.animals} animal${tripData.animals > 1 ? 'aux' : ''}`;
  doc.text(voyText, margin + 28, currentY);
  currentY += 7;

  if (tripData.activities && tripData.activities.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Activites :', margin, currentY);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    const actLines = doc.splitTextToSize(tripData.activities.join(', '), contentWidth - 24);
    doc.text(actLines, margin + 24, currentY);
    currentY += actLines.length * 5;
  }

  currentY += 4;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ── INDISPENSABLES ───────────────────────────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Indispensables pour tout voyage', margin, currentY);
  currentY += 8;

  const colW = contentWidth / 2;
  const checkedSet = new Set(tripData.checkedIndispensables ?? []);

  for (let i = 0; i < INDISPENSABLES.length; i += 2) {
    ensureSpace(7);
    const row = [INDISPENSABLES[i], INDISPENSABLES[i + 1]].filter(Boolean);
    row.forEach((item, col) => {
      const x = margin + col * colW;
      const isChecked = checkedSet.has(item.label);
      drawCheckbox(x, currentY, isChecked, 4);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const shade = isChecked ? 160 : 50;
      doc.setTextColor(shade, shade, shade);
      doc.text(item.label, x + 7, currentY);
    });
    currentY += 6;
  }

  currentY += 4;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ── PRODUITS PAR CATÉGORIE ───────────────────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Produits recommandes', margin, currentY);
  currentY += 8;

  const thumbSize = 18;
  const thumbX = pageWidth - margin - thumbSize;
  const textMaxWidth = contentWidth - thumbSize - 8;

  for (const { category, items } of groupByCategory(tripData.products)) {
    ensureSpace(12);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY - 5, contentWidth, 8, 'F');
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${CATEGORY_LABELS[category] ?? category}  (${items.length})`, margin + 3, currentY);
    currentY += 8;

    for (const product of items) {
      ensureSpace(36);

      const rowY = currentY;

      if (product.imageUrl) {
        const b64 = getImg(product.imageUrl);
        if (b64) doc.addImage(b64, imgFormat(b64), thumbX, rowY - 4, thumbSize, thumbSize);
      } else {
        // Fallback: carré gris clair + abrégé de catégorie
        doc.setFillColor(245, 245, 245);
        doc.rect(thumbX, rowY - 4, thumbSize, thumbSize, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.rect(thumbX, rowY - 4, thumbSize, thumbSize);
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const catShort = (CATEGORY_LABELS[product.category ?? ''] ?? '?').slice(0, 6);
        doc.text(catShort, thumbX + thumbSize / 2, rowY - 4 + thumbSize / 2 + 1, { align: 'center' });
      }

      drawCheckbox(margin, currentY, product.isPlanned, 5);

      const nameX = margin + 9;
      const nameLines = doc.splitTextToSize(product.label, textMaxWidth - 2);
      doc.setTextColor(26, 26, 26);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(nameLines, nameX, currentY);
      currentY += nameLines.length * 5 + 1;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (product.mustHave) {
        doc.setTextColor(9, 145, 66);
        doc.text('Essentiel', nameX, currentY);
      } else {
        doc.setTextColor(59, 130, 246);
        doc.text('Recommande IA', nameX, currentY);
      }
      currentY += 5;

      doc.setFontSize(9);
      if (product.isPlanned) {
        doc.setTextColor(9, 145, 66);
        doc.text("J'ai deja prevu", nameX, currentY);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('Pas encore prevu', nameX, currentY);
      }

      if (product.asin) {
        currentY += 3;
        const tag = tripData.affiliateTag || config.amazonAffiliateTag;
        const url = `https://www.amazon.fr/dp/${product.asin}/ref=nosim?tag=${tag}`;
        const btnText = 'Voir sur Amazon';
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const btnW = doc.getTextWidth(btnText) + 8;
        const btnH = 6.5;
        doc.setFillColor(255, 153, 0);
        doc.roundedRect(nameX, currentY, btnW, btnH, 1.5, 1.5, 'F');
        doc.setTextColor(26, 26, 26);
        doc.text(btnText, nameX + 4, currentY + 4.3);
        doc.link(nameX, currentY, btnW, btnH, { url });
        currentY += btnH - 2;
      }

      if (product.imageUrl) currentY = Math.max(currentY, rowY - 4 + thumbSize);
      currentY += 8;

      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.2);
      doc.line(margin + 9, currentY - 4, pageWidth - margin, currentY - 4);
    }

    currentY += 3;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 15;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.text("Genere par Don't Forget", margin, footerY);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Cliquez sur "Voir sur Amazon" pour ouvrir chaque produit', pageWidth / 2, footerY, { align: 'center' });

  // ── SAUVEGARDE ───────────────────────────────────────────────────────────────
  const fileName = `checklist-voyage-${tripData.destination.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Checklist Voyage' });
      return;
    }
    window.location.href = doc.output('datauristring');
  } else {
    doc.save(fileName);
  }
}

export function generatePDFPreview(_tripData: PDFTripData): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  return doc.output('datauristring');
}
