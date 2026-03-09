import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { readProductsFromCacheOrSheet } from '@/lib/sheets';
import { selectProductsWithAI } from '@/lib/ai';
import { AILogger } from '@/lib/logger';
import {
  WizardStateSchema,
  ProductResponseSchema,
  type ProductRecord,
} from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    AILogger.startRequest(body);

    const parsed = WizardStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation error', issues: parsed.error.format() },
        { status: 400 },
      );
    }

    const wizard = parsed.data;
    const marketplace = (wizard.marketplaceCountry ?? wizard.destinationCountry).toUpperCase();
    const groupMinAge = Math.min(...wizard.ages);
    const groupMaxAge = Math.max(...wizard.ages);
    const hasChild = wizard.ages.some((a) => a < 18);
    const hasAdult = wizard.ages.some((a) => a >= 18);

    const allProducts = await readProductsFromCacheOrSheet();
    AILogger.info(`Produits chargés: ${allProducts.length}`);

    // Filtres durs: statut, âge, audience, pays
    const hardFiltered = allProducts.filter((p) => {
      if (p.status !== 'active') return false;
      if (!(groupMaxAge >= p.ageMin && groupMinAge <= p.ageMax)) return false;
      if (p.audience === 'child' && !hasChild) return false;
      if (p.audience === 'adult' && !hasAdult) return false;
      const cc: string[] = Array.isArray((p as any).countryCodes) ? (p as any).countryCodes : [];
      if (cc.length > 0 && !cc.includes(wizard.destinationCountry.toUpperCase())) return false;
      return true;
    });

    AILogger.info(`Après filtres durs: ${hardFiltered.length} produits`);

    // Les mustHave sont toujours inclus, triés par priorité
    const mustHaves = hardFiltered.filter((p) => p.mustHave).sort((a, b) => a.priority - b.priority);
    const candidates = hardFiltered.filter((p) => !p.mustHave);

    // L'IA sélectionne et ordonne parmi les candidats
    const aiResult = await selectProductsWithAI(
      {
        destinationCountry: wizard.destinationCountry,
        destinationCity: wizard.destinationCity,
        destinationDisplayName: wizard.destinationDisplayName,
        marketplaceCountry: wizard.marketplaceCountry ?? wizard.destinationCountry,
        dates: wizard.dates,
        adults: wizard.adults ?? 0,
        children: wizard.children ?? 0,
        animals: wizard.animals || 0,
        activities: wizard.activities,
        budget: wizard.budget,
      },
      candidates,
    );

    AILogger.info(`Source IA: ${aiResult.source}, ${aiResult.indices.length} sélectionnés`);

    // Résultat final: mustHaves + sélection IA (ou shuffle si IA indispo)
    let aiSelected: ProductRecord[];
    if (aiResult.source === 'disabled' || aiResult.source === 'error') {
      const shuffled = [...candidates];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      aiSelected = shuffled;
    } else {
      aiSelected = aiResult.indices.map((i) => candidates[i]).filter(Boolean);
    }

    const combined = [...mustHaves, ...aiSelected];

    // Déduplication et formatage
    const seen = new Set<string>();
    const response = combined
      .filter((p) => {
        const key = `${p.asin}::${p.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p) => ({
        label: p.label,
        asin: p.asin,
        marketplace,
        imageUrl: p.imageUrl,
        explain: [
          `destination=${wizard.destinationCountry}`,
          `marketplace=${marketplace}`,
          `ageRange=${groupMinAge}-${groupMaxAge}`,
          ...(p.mustHave ? ['mustHave=true'] : []),
          `priority=${p.priority}`,
          `ai=${aiResult.source}`,
          ...(aiResult.reason ? [`aiReason=${aiResult.reason}`] : []),
        ],
      }));

    const validatedResponse = ProductResponseSchema.array().parse(response);
    AILogger.setSelectedProducts(validatedResponse);
    AILogger.info(`✅ Réponse finale: ${validatedResponse.length} produits`);

    return NextResponse.json(validatedResponse, { status: 200 });
  } catch (err) {
    AILogger.error('[api/recommend] Internal error', err);
    const detail = err instanceof Error ? { name: err.name, message: err.message } : { err };
    return NextResponse.json({ message: 'Server error', detail }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ message: 'Use POST with wizardState' }, { status: 405 });
}
