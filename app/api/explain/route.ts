import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Product selection is now done directly in /api/recommend via full product list + AI.
// This endpoint is kept as a stub for UI compatibility.
export async function POST() {
  return NextResponse.json({ tags: [], meta: { source: 'disabled' } }, { status: 200 });
}

export function GET() {
  return NextResponse.json({ message: 'Use POST' }, { status: 405 });
}
