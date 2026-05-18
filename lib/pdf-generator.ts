import jsPDF from 'jspdf';
import { config } from './config';

interface PDFProduct {
  label: string;
  asin: string;
  isPlanned: boolean;
  description?: string;
  price?: string;
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
}

export async function generateChecklistPDF(tripData: PDFTripData) {
  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  // Couleurs du thème
  const darkGray = '#1a1a1a';
  const green = '#099142';
  const lightGray = '#666666';
  
  // Dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  let currentY = margin;

  // Helper: load any URL as base64 data URI
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
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error);
      return '';
    }
  };

  if (tripData.bannerImageUrl) {
    // Header avec image de destination
    try {
      const bannerBase64 = await loadImageAsBase64(tripData.bannerImageUrl);
      if (bannerBase64) {
        doc.addImage(bannerBase64, 'PNG', 0, 0, pageWidth, 50);
      } else {
        // Fallback fond vert si l'image ne charge pas
        doc.setFillColor(9, 145, 66);
        doc.rect(0, 0, pageWidth, 50, 'F');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du banner:', error);
      doc.setFillColor(9, 145, 66);
      doc.rect(0, 0, pageWidth, 50, 'F');
    }
  } else {
    // Header avec fond vert (fallback)
    doc.setFillColor(9, 145, 66); // #099142
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo Don't Forget
    try {
      const logoBase64 = await loadImageAsBase64('/images/logodf.png');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 15, 20, 20);
      } else {
        // Fallback : logo stylisé si l'image ne charge pas
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 25, 10, 'F');
        doc.setFillColor(9, 145, 66);
        doc.circle(25, 25, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DF', 25, 27.5, { align: 'center' });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du logo:', error);
      // Fallback : logo stylisé
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

  // Titre principal en blanc (commun aux deux chemins)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DON\'T FORGET', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('CHECKLIST VOYAGE PERSONNALISÉE', pageWidth / 2, 30, { align: 'center' });

  // Destination et dates
  doc.setFontSize(12);
  doc.text(`${tripData.destination} • ${tripData.startDate} - ${tripData.endDate}`, pageWidth / 2, 40, { align: 'center' });

  currentY = 60;
  
  // Section récapitulatif
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif de votre voyage', margin, currentY);
  
  currentY += 10;
  
  // Détails du voyage
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  
  // Voyageurs
  doc.text('Voyageurs:', margin, currentY);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  let voyageursText = `${tripData.adults} adulte${tripData.adults > 1 ? 's' : ''}`;
  if (tripData.children > 0) {
    voyageursText += `, ${tripData.children} enfant${tripData.children > 1 ? 's' : ''}`;
  }
  if (tripData.animals && tripData.animals > 0) {
    voyageursText += `, ${tripData.animals} animal${tripData.animals > 1 ? 'aux' : ''}`;
  }
  doc.text(voyageursText, margin + 25, currentY);
  
  currentY += 8;
  
  // Activités
  if (tripData.activities && tripData.activities.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Activités:', margin, currentY);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text(tripData.activities.join(', '), margin + 20, currentY);
    currentY += 8;
  }
  
  // Ligne de séparation
  currentY += 5;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;
  
  // Section produits
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Produits recommandés', margin, currentY);
  
  currentY += 10;
  
  // Liste des produits
  tripData.products.forEach((product, index) => {
    // Vérifier si on a besoin d'une nouvelle page
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }
    
    // Checkbox
    const checkboxSize = 5;
    const checkboxX = margin;
    const checkboxY = currentY - 4;
    
    if (product.isPlanned) {
      // Case cochée - dessiner la checkbox et le check mark
      doc.setFillColor(9, 145, 66); // #099142
      doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize, 'F');
      
      // Dessiner un check mark avec des lignes
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      // Première ligne du check
      doc.line(checkboxX + 1, checkboxY + 2.5, checkboxX + 2, checkboxY + 3.5);
      // Deuxième ligne du check
      doc.line(checkboxX + 2, checkboxY + 3.5, checkboxX + 4, checkboxY + 1.5);
    } else {
      // Case vide
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
    }
    
    // Nom du produit
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const productNameX = margin + 10;
    doc.text(product.label, productNameX, currentY);
    
    currentY += 6;
    
    // Description (si disponible)
    if (product.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102);
      const lines = doc.splitTextToSize(product.description, contentWidth - 10);
      doc.text(lines, productNameX, currentY);
      currentY += lines.length * 4;
    }
    
    // Statut
    doc.setFontSize(9);
    if (product.isPlanned) {
      doc.setTextColor(9, 145, 66);
      doc.text('J\'ai déjà prévu', productNameX, currentY);
    } else {
      doc.setTextColor(102, 102, 102);
      doc.text('Je n\'ai pas prévu', productNameX, currentY);
    }
    
    // Lien Amazon cliquable
    if (product.asin) {
      currentY += 4;
      doc.setTextColor(59, 130, 246); // Bleu pour les liens
      doc.setFontSize(8);
      const linkText = `Voir sur Amazon`;
      const linkWidth = doc.getTextWidth(linkText);
      
      // Ajouter le lien cliquable avec le tag d'affiliation
      const affiliateTag = tripData.affiliateTag || config.amazonAffiliateTag;
      doc.textWithLink(linkText, productNameX, currentY, {
        url: `https://www.amazon.fr/dp/${product.asin}?tag=${affiliateTag}`
      });
      
      // Souligner le lien
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.1);
      doc.line(productNameX, currentY + 0.5, productNameX + linkWidth, currentY + 0.5);
    }
    
    currentY += 10;
  });
  
  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.text('Généré par Don\'t Forget', margin, footerY);
  
  // Note Amazon
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Liens Amazon disponibles sur l\'application', pageWidth / 2, footerY, { align: 'center' });
  
  // Sauvegarder le PDF — iOS Safari ne supporte pas <a download>, on ouvre dans un onglet
  const fileName = `checklist-voyage-${tripData.destination.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.pdf`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    // iOS : utiliser le Web Share API natif (ouvre la feuille de partage iOS)
    // Permet de sauvegarder dans Fichiers, AirDrop, etc.
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Checklist Voyage' });
      return;
    }
    // Fallback si Web Share API non disponible
    const dataUri = doc.output('datauristring');
    window.location.href = dataUri;
  } else {
    doc.save(fileName);
  }
}

// Fonction pour générer un aperçu du PDF (optionnel)
export function generatePDFPreview(tripData: PDFTripData): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Générer le PDF (même logique que ci-dessus)
  // ... (code similaire)
  
  // Retourner le PDF en base64 pour aperçu
  return doc.output('datauristring');
}
