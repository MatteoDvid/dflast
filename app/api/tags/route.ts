import { NextResponse } from 'next/server';
import { readProductsFromCacheOrSheet } from '@/lib/sheets';

export async function GET() {
  try {
    const products = await readProductsFromCacheOrSheet();
    const tagSet = new Set<string>();
    const tagStats: Record<string, number> = {};
    
    for (const product of products) {
      if (Array.isArray((product as any).tags)) {
        const uniqueTags = new Set((product as any).tags as string[]);
        uniqueTags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            tagSet.add(tag);
            tagStats[tag] = (tagStats[tag] || 0) + 1;
          }
        });
      }
    }
    
    const tags = Array.from(tagSet).sort();
    
    return NextResponse.json({
      tags,
      stats: tagStats,
      count: tags.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
