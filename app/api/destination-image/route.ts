import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildCacheKey, getCachedImageUrl, storeCachedImage } from '@/lib/image-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Déduplication des générations en cours : si la page results demande une
// image déjà en train d'être générée (pré-générée depuis le wizard), on
// attend la même promesse au lieu de relancer une génération.
const inFlight = new Map<string, Promise<string | null>>();

async function fetchLandmarks(
  openai: OpenAI,
  subject: string,
): Promise<string | null> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const resp = await openai.chat.completions.create(
      {
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Tu es un expert en géographie et tourisme. Réponds uniquement en JSON: {"landmark": "...", "setting": "..."}. ' +
              '"landmark" = LE monument ou lieu le plus iconique et visuellement reconnaissable de la destination, avec son cadre réel exact (ex: "la cathédrale Sainte-Croix vue depuis la rue Jeanne d\'Arc"). ' +
              '"setting" = une courte description du paysage/ambiance typique réelle (architecture, relief, végétation).',
          },
          { role: 'user', content: `Destination: ${subject}` },
        ],
      },
      { timeout: 8000, maxRetries: 0 },
    );
    const content = resp.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (typeof parsed.landmark !== 'string' || !parsed.landmark) return null;
    const setting = typeof parsed.setting === 'string' ? parsed.setting : '';
    return `${parsed.landmark}${setting ? `. ${setting}` : ''}`;
  } catch (err: any) {
    console.warn('[destination-image] Landmark lookup failed:', err?.message);
    return null;
  }
}

async function generateImage(params: {
  city?: string;
  region?: string;
  countryCode: string;
  cacheKey: string;
}): Promise<string | null> {
  const { city, region, countryCode, cacheKey } = params;

  const cached = await getCachedImageUrl(cacheKey);
  if (cached) {
    console.log(`[destination-image] Cache hit: ${cacheKey}`);
    return cached;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[destination-image] OPENAI_API_KEY missing, returning null');
    return null;
  }

  const openai = new OpenAI({ apiKey });

  let subject: string;
  if (city) subject = `${city}, ${countryCode}`;
  else if (region) subject = `the ${region} region, ${countryCode}`;
  else subject = countryCode;

  // Enrichir le prompt avec un landmark réel pour améliorer la fidélité
  // géographique (sinon le modèle mélange des lieux distincts de la ville).
  const landmarks = await fetchLandmarks(openai, subject);

  const prompt = [
    `A breathtaking, cinematic travel photography shot of ${subject}.`,
    ...(landmarks
      ? [
          `The scene shows ${landmarks}.`,
          'Geographically and architecturally faithful: depict this single real location exactly as it appears in reality, from one coherent viewpoint. Do not combine separate places into one scene, do not invent buildings.',
        ]
      : []),
    'Stunning natural light, no text, no people, photorealistic, 8k quality.',
  ].join(' ');

  console.log(`[destination-image] Generating for: ${subject} (key: ${cacheKey})`);

  const response = await openai.images.generate({
    model: 'gpt-image-2' as any,
    prompt,
    n: 1,
    size: '1536x1024' as any,
    quality: 'low' as any,
  });

  const b64 = (response as any).data[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from OpenAI');

  const buffer = Buffer.from(b64, 'base64');
  const url = await storeCachedImage(cacheKey, buffer);

  console.log(`[destination-image] Stored at: ${url}`);
  return url;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { city, region, countryCode } = body as {
      city?: string;
      region?: string;
      countryCode?: string;
    };

    if (!countryCode) {
      return NextResponse.json({ error: 'countryCode is required' }, { status: 400 });
    }

    const cacheKey = buildCacheKey({ city, region, countryCode });

    let promise = inFlight.get(cacheKey);
    if (!promise) {
      promise = generateImage({ city, region, countryCode, cacheKey }).finally(() => {
        inFlight.delete(cacheKey);
      });
      inFlight.set(cacheKey, promise);
    } else {
      console.log(`[destination-image] Awaiting in-flight generation: ${cacheKey}`);
    }

    const url = await promise;
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[destination-image] Error:', err?.message);
    return NextResponse.json({ url: null });
  }
}

export function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
