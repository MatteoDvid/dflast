import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildCacheKey, getCachedImageUrl, storeCachedImage } from '@/lib/image-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const cached = await getCachedImageUrl(cacheKey);
    if (cached) {
      console.log(`[destination-image] Cache hit: ${cacheKey}`);
      return NextResponse.json({ url: cached });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[destination-image] OPENAI_API_KEY missing, returning null');
      return NextResponse.json({ url: null });
    }

    const openai = new OpenAI({ apiKey });

    let subject: string;
    if (city) subject = `${city}, ${countryCode}`;
    else if (region) subject = `the ${region} region, ${countryCode}`;
    else subject = countryCode;

    const prompt = `A breathtaking, cinematic travel photography shot of ${subject}. Stunning natural light, no text, no people, photorealistic, 8k quality.`;

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
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[destination-image] Error:', err?.message);
    return NextResponse.json({ url: null });
  }
}

export function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
