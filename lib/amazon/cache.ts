import { promises as fs } from 'fs';
import path from 'path';

type AmazonImageCacheEntry = {
  imageUrl: string;
  fetchedAt: number;
};

type AmazonImageCacheFile = Record<string, AmazonImageCacheEntry>;

function getCachePath() {
  return path.join(process.cwd(), 'data', 'amazon-images-cache.json');
}

function getCacheTtlMs() {
  const hours = Number(process.env.AMAZON_IMAGE_CACHE_TTL_HOURS || '24');
  return Math.max(1, hours) * 60 * 60 * 1000;
}

function cacheKey(asin: string, marketplace: string) {
  return `${marketplace.toUpperCase()}::${asin.toUpperCase()}`;
}

async function readCache(): Promise<AmazonImageCacheFile> {
  try {
    const raw = await fs.readFile(getCachePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCache(cache: AmazonImageCacheFile) {
  try {
    await fs.mkdir(path.dirname(getCachePath()), { recursive: true });
    await fs.writeFile(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8');
  } catch {
    // The cache is opportunistic; recommendation responses should not fail if disk writes do.
  }
}

export async function getCachedAmazonImages(asins: string[], marketplace: string) {
  const cache = await readCache();
  const ttl = getCacheTtlMs();
  const now = Date.now();
  const hits = new Map<string, string>();
  const misses: string[] = [];

  for (const asin of asins) {
    const entry = cache[cacheKey(asin, marketplace)];
    if (entry && now - entry.fetchedAt < ttl) {
      hits.set(asin, entry.imageUrl);
    } else {
      misses.push(asin);
    }
  }

  return { hits, misses, cache };
}

export async function saveAmazonImages(
  cache: AmazonImageCacheFile,
  images: Map<string, string>,
  marketplace: string,
) {
  const now = Date.now();
  for (const [asin, imageUrl] of images) {
    cache[cacheKey(asin, marketplace)] = { imageUrl, fetchedAt: now };
  }
  await writeCache(cache);
}
