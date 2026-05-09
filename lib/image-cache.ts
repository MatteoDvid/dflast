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
