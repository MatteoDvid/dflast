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
