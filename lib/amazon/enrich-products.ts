import type { ProductRecord } from '@/lib/schemas';
import { fetchAmazonMediumImagesByAsin } from './client';
import { getCachedAmazonImages, saveAmazonImages } from './cache';
import { AMAZON_FR_MARKETPLACE } from './marketplaces';

export async function enrichProductsWithAmazonImages<T extends Pick<ProductRecord, 'asin' | 'imageUrl'>>(
  products: T[],
): Promise<T[]> {
  const asins = Array.from(
    new Set(products.map((product) => product.asin.trim()).filter((asin) => asin.length > 0)),
  );

  if (asins.length === 0) return products;

  try {
    const { hits, misses, cache } = await getCachedAmazonImages(asins, AMAZON_FR_MARKETPLACE.code);
    const fetched = misses.length > 0 ? await fetchAmazonMediumImagesByAsin(misses) : new Map();
    await saveAmazonImages(cache, fetched, AMAZON_FR_MARKETPLACE.code);

    const amazonImages = new Map([...hits, ...fetched]);
    return products.map((product) => ({
      ...product,
      imageUrl: amazonImages.get(product.asin) || product.imageUrl,
    }));
  } catch (err) {
    console.warn('[amazon] Image enrichment failed, falling back to existing imageUrl values', err);
    return products;
  }
}
