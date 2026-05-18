import { list, put } from '@vercel/blob';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCacheKey(params: {
  city?: string | null;
  region?: string | null;
  countryCode: string;
}): string {
  const { city, region, countryCode } = params;
  const country = slugify(countryCode);
  if (city) return `destination-images/${slugify(city)}-${country}.png`;
  if (region) return `destination-images/region-${slugify(region)}-${country}.png`;
  return `destination-images/country-${country}.png`;
}

export async function getCachedImageUrl(key: string): Promise<string | null> {
  const { blobs } = await list({ prefix: key });
  const match = blobs.find((b) => b.pathname === key);
  return match?.url ?? null;
}

export async function storeCachedImage(key: string, buffer: Buffer): Promise<string> {
  const blob = await put(key, buffer, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
  });
  return blob.url;
}

let imageMapCache: { map: Map<string, string>; ts: number } | null = null;
const IMAGE_MAP_TTL_MS = 5 * 60 * 1000;

export async function getProductImageMap(): Promise<Map<string, string>> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new Map();
  if (imageMapCache && Date.now() - imageMapCache.ts < IMAGE_MAP_TTL_MS) {
    return imageMapCache.map;
  }
  try {
    const map = new Map<string, string>();
    let cursor: string | undefined;
    do {
      const result = await list({ prefix: 'product-images/', cursor });
      for (const b of result.blobs) {
        const asin = b.pathname.replace('product-images/', '').replace('.png', '');
        if (asin) map.set(asin, b.url);
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
    imageMapCache = { map, ts: Date.now() };
    return map;
  } catch (err) {
    console.error('[getProductImageMap] list() failed:', err);
    return new Map();
  }
}
