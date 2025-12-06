import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force dynamic to avoid caching (as requested "No Cache" version)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // Feature Flag Check
        const enabled = process.env.ENABLE_AI_IMAGES === 'true' || process.env.NEXT_PUBLIC_ENABLE_AI_IMAGES === 'true';
        if (!enabled) {
            return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
        }

        const body = await req.json();
        const { destination, countryCode } = body;

        if (!destination) {
            return NextResponse.json(
                { error: 'Destination is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY is missing');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey });

        // Enhanced prompt for "GPT-Image like" quality
        const prompt = `A breathtaking, cinematic, photorealistic travel photography shot of ${destination}${countryCode ? `, ${countryCode}` : ''}. Startlingly beautiful, golden hour lighting, 8k resolution, highly detailed, professional photography style. No text, no tourists, just the stunning landscape or cityscape.`;

        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd', // Premium quality
            style: 'vivid', // Make it pop
        });

        const imageUrl = response.data[0]?.url;

        if (!imageUrl) {
            throw new Error('No image URL returned from OpenAI');
        }

        return NextResponse.json({ url: imageUrl });
    } catch (error: any) {
        console.error('Error generating image:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate image',
                details: error?.message || String(error),
                hint: 'Check server logs for OpenAI error response'
            },
            { status: 500 }
        );
    }
}
