// Constantes partagées entre client et serveur

export const PROMPT_VERSION = 'v0';

// Catégories de tags
export type CategoryId = 'gear' | 'clothing' | 'essentials' | 'safety' | 'other';

// Fonction utilitaire pour déduire la catégorie d'un tag
// Cette fonction peut être utilisée côté client car elle ne dépend pas de modules Node.js
export function getCategoryFromTag(tag: string): CategoryId {
  const tagLower = tag.toLowerCase();
  
  // Gear / Équipement
  if (tagLower.includes('gear') || 
      tagLower.includes('backpack') || 
      tagLower.includes('adapter') || 
      tagLower.includes('power') || 
      tagLower.includes('bottle') || 
      tagLower.includes('rain') ||
      tagLower.includes('poncho')) {
    return 'gear';
  }
  
  // Clothing / Vêtements
  if (tagLower.includes('clothing') || 
      tagLower.includes('thermal') || 
      tagLower.includes('layer') ||
      tagLower.includes('parka') ||
      tagLower.includes('doudoune') ||
      tagLower.includes('fleece') ||
      tagLower.includes('polaire')) {
    return 'clothing';
  }
  
  // Essentials / Essentiels
  if (tagLower.includes('essential') || 
      tagLower.includes('document') || 
      tagLower.includes('pouch') ||
      tagLower.includes('passport') ||
      tagLower.includes('wallet')) {
    return 'essentials';
  }
  
  // Safety / Sécurité
  if (tagLower.includes('risk') || 
      tagLower.includes('safety') || 
      tagLower.includes('first') || 
      tagLower.includes('aid') ||
      tagLower.includes('lock') ||
      tagLower.includes('mosquito') ||
      tagLower.includes('repellent')) {
    return 'safety';
  }
  
  // Other / Autre
  return 'other';
}

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
