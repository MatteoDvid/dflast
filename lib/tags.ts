// Version dynamique du système de tags - SERVEUR UNIQUEMENT
// Ne pas importer ce fichier dans les composants client
import { readProductsFromCacheOrSheet } from './sheets';
import type { ProductRecord } from './schemas';
import { PROMPT_VERSION, type CategoryId, getCategoryFromTag } from './constants';

// Ré-exporter pour compatibilité
export { PROMPT_VERSION, getCategoryFromTag };
export type { CategoryId };

/**
 * Récupère tous les tags uniques depuis les produits
 * Ces tags viennent dynamiquement du Google Sheet
 */
export async function getDynamicTags(): Promise<string[]> {
  try {
    const products = await readProductsFromCacheOrSheet();
    const tagSet = new Set<string>();
    
    for (const product of products) {
      if (Array.isArray((product as any).tags)) {
        ((product as any).tags as string[]).forEach(tag => {
          if (tag && typeof tag === 'string') {
            tagSet.add(tag);
          }
        });
      }
    }
    
    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Erreur lors de la récupération des tags dynamiques:', error);
    return [];
  }
}


/**
 * Récupère les statistiques d'utilisation des tags
 * Utile pour comprendre quels tags sont les plus utilisés
 */
export async function getTagStats(): Promise<Record<string, number>> {
  try {
    const products = await readProductsFromCacheOrSheet();
    const tagCounts: Record<string, number> = {};
    
    for (const product of products) {
      if (Array.isArray((product as any).tags)) {
        const uniqueTags = new Set((product as any).tags as string[]);
        uniqueTags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    }
    
    return tagCounts;
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques de tags:', error);
    return {};
  }
}

// Conserver pour compatibilité descendante si nécessaire
// Note: Cette constante est maintenant dépréciée et ne devrait plus être utilisée
export const ALL_TAGS_DEPRECATED = [
  'GEAR_BACKPACK_DAYPACK',
  'GEAR_UNIVERSAL_ADAPTER',
  'GEAR_POWER_BANK',
  'GEAR_TRAVEL_BOTTLES',
  'GEAR_RAIN_PONCHO',
  'CLOTHING_THERMAL_LAYER',
  'ESSENTIALS_DOCUMENT_POUCH',
  'RISK_FIRST_AID_KIT',
  'RISK_ANTI_THEFT_LOCK',
  'RISK_MOSQUITO_REPELLENT'
];
