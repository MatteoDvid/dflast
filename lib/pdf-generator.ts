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
    if (!(CATEGORY_ORDER as readonly string[]).includes(cat)) {
      ordered.push({ category: cat, items });
    }
  }
  return ordered;
}

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

  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

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

  // ── HEADER ──────────────────────────────────────────────────────────────────
  if (tripData.bannerImageUrl) {
    try {
      const bannerBase64 = await loadImageAsBase64(tripData.bannerImageUrl);
      if (bannerBase64) {
        doc.addImage(bannerBase64, 'PNG', 0, 0, pageWidth, 50);
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
    } catch {
      doc.setFillColor(9, 145, 66);
      doc.rect(0, 0, pageWidth, 50, 'F');
    }
  } else {
    doc.setFillColor(9, 145, 66);
    doc.rect(0, 0, pageWidth, 50, 'F');
    try {
      const logoBase64 = await loadImageAsBase64('/images/logodf.png');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 15, 20, 20);
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
    } catch {
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
    pageWidth / 2,
    40,
    { align: 'center' }
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
    const actText = doc.splitTextToSize(tripData.activities.join(', '), contentWidth - 24);
    doc.text(actText, margin + 24, currentY);
    currentY += actText.length * 5;
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
      doc.setTextColor(isChecked ? 160 : 50, isChecked ? 160 : 50, isChecked ? 160 : 50);
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
    // En-tête de catégorie
    ensureSpace(12);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY - 5, contentWidth, 8, 'F');
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const catLabel = CATEGORY_LABELS[category] ?? category;
    doc.text(`${catLabel}  (${items.length})`, margin + 3, currentY);
    currentY += 8;

    for (const product of items) {
      const minH = product.imageUrl ? thumbSize + 6 : 28;
      ensureSpace(minH + 4);

      const rowY = currentY;

      // Vignette
      if (product.imageUrl) {
        try {
          const imgB64 = await loadImageAsBase64(product.imageUrl);
          if (imgB64) doc.addImage(imgB64, 'PNG', thumbX, rowY - 4, thumbSize, thumbSize);
        } catch { /* non bloquant */ }
      }

      // Checkbox
      drawCheckbox(margin, currentY, product.isPlanned, 5);

      // Nom
      const nameX = margin + 9;
      const nameLines = doc.splitTextToSize(product.label, textMaxWidth - 2);
      doc.setTextColor(26, 26, 26);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(nameLines, nameX, currentY);
      currentY += nameLines.length * 5 + 1;

      // Badge Essentiel / Recommande IA
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

      // Statut prévu
      doc.setFontSize(9);
      if (product.isPlanned) {
        doc.setTextColor(9, 145, 66);
        doc.text("J'ai deja prevu", nameX, currentY);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Pas encore prevu", nameX, currentY);
      }

      // Lien Amazon
      if (product.asin) {
        currentY += 4;
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(8);
        const linkText = 'Voir sur Amazon';
        const linkW = doc.getTextWidth(linkText);
        const affiliateTag = tripData.affiliateTag || config.amazonAffiliateTag;
        doc.textWithLink(linkText, nameX, currentY, {
          url: `https://www.amazon.fr/dp/${product.asin}?tag=${affiliateTag}`,
        });
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.1);
        doc.line(nameX, currentY + 0.5, nameX + linkW, currentY + 0.5);
      }

      // Aligner sous la vignette si elle dépasse
      if (product.imageUrl) currentY = Math.max(currentY, rowY - 4 + thumbSize);
      currentY += 8;

      // Séparateur léger entre produits
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
  doc.text('Liens Amazon disponibles sur l\'application', pageWidth / 2, footerY, { align: 'center' });

  // ── SAUVEGARDE ───────────────────────────────────────────────────────────────
  const fileName = `checklist-voyage-${tripData.destination.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
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
