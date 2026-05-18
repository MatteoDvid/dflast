import OpenAI from 'openai';
import { readProductsFromCacheOrSheet } from '../lib/sheets';
import { getCachedImageUrl, storeCachedImage } from '../lib/image-cache';

const args = process.argv.slice(2);
const force = args.includes('--force');
const asinFilter = args.find((a) => a.startsWith('--asin='))?.split('=')[1];
const DELAY_MS = 2000;

function buildProductKey(asin: string): string {
  return `product-images/${asin}.png`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateImage(label: string, openai: OpenAI): Promise<Buffer> {
  const prompt = `Product photo of ${label}, isolated on pure white background, clean e-commerce style, no text, photorealistic`;

  const response = await openai.images.generate({
    model: 'gpt-image-2' as any,
    prompt,
    n: 1,
    size: '1024x1024' as any,
    quality: 'low' as any,
  });

  const b64 = (response as any).data[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from OpenAI');
  return Buffer.from(b64, 'base64');
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY manquante. Lancer avec node --env-file=.env.local');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('📋 Chargement des produits depuis Google Sheets...');
  const products = await readProductsFromCacheOrSheet();
  const active = products
    .filter((p) => p.status === 'active')
    .filter((p) => !asinFilter || p.asin === asinFilter);

  console.log(`📦 ${active.length} produits actifs à traiter${asinFilter ? ` (filtre: ${asinFilter})` : ''}${force ? ' [--force]' : ''}\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < active.length; i++) {
    const p = active[i];
    const key = buildProductKey(p.asin);
    const prefix = `[${i + 1}/${active.length}] ${p.label} (${p.asin})`;

    if (!force) {
      const existing = await getCachedImageUrl(key);
      if (existing) {
        console.log(`⏭️  ${prefix} — déjà existante, skip`);
        skipped++;
        continue;
      }
    }

    try {
      console.log(`🎨 ${prefix} — génération en cours...`);
      const buffer = await generateImage(p.label, openai);
      const url = await storeCachedImage(key, buffer);
      console.log(`✅ ${prefix} — stockée: ${url}`);
      generated++;
    } catch (err: any) {
      console.error(`❌ ${prefix} — erreur: ${err.message}`);
      errors++;
    }

    if (i < active.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Résumé: ${generated} générées, ${skipped} skippées, ${errors} erreurs`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
