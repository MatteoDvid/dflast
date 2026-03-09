import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { readProductsFromCacheOrSheet } from '@/lib/sheets';
import { getTagsForWizardSummary } from '@/lib/ai';
import { PROMPT_VERSION } from '@/lib/tags';
import { AILogger } from '@/lib/logger';
import {
  WizardStateSchema,
  ProductRecordSchema,
  ProductResponseSchema,
  type ProductRecord,
} from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📦 [DEBUG-API] Request Payload (Server):', JSON.stringify(body, null, 2));

    // Démarrer le logging pour cette requête
    AILogger.startRequest(body);

    AILogger.group('API Recommend');
    AILogger.log('Request body:', body);

    const parsed = WizardStateSchema.safeParse(body);
    if (!parsed.success) {
      AILogger.error('Validation error:', parsed.error.format());
      return NextResponse.json(
        { message: 'Validation error', issues: parsed.error.format() },
        { status: 400 },
      );
    }

    const wizard = parsed.data;
    const marketplace = (wizard.marketplaceCountry ?? wizard.destinationCountry).toUpperCase();

    AILogger.log('Wizard data:', {
      destination: wizard.destinationCountry,
      city: wizard.destinationCity,
      displayName: wizard.destinationDisplayName,
      travelers: wizard.travelers,
      adults: wizard.adults,
      children: wizard.children,
      animals: wizard.animals,
      activities: wizard.activities,
      budget: wizard.budget
    });

    const validatedProducts = await readProductsFromCacheOrSheet();
    AILogger.info(`Produits chargés: ${validatedProducts.length}`);

    const groupMinAge = Math.min(...wizard.ages);
    const groupMaxAge = Math.max(...wizard.ages);

    // Déduire la liste blanche dynamique de tags (TagId) depuis le Sheet + fréquences
    const tagCounts: Record<string, number> = {};
    for (const p of validatedProducts) {
      const tags: string[] = Array.isArray((p as any).tags) ? ((p as any).tags as string[]) : [];
      const unique = Array.from(new Set(tags));
      for (const t of unique) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    const allowedTagIds: string[] = Object.keys(tagCounts);
    const tagsByFreqDesc: string[] = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    // Auto-génération de tags via IA si aucun tag explicite n'est fourni
    let aiActive = String(process.env.AI_ENABLED ?? 'false').toLowerCase() === 'true';
    let effectiveTags: string[] = Array.isArray(wizard.tags) ? (wizard.tags as any) : [];
    let aiSource: 'openai' | 'fallback' | 'disabled' | 'error' | 'manual' | 'none' = 'none';
    let aiReason: string | undefined;
    let excludedTagsFromAi = new Set<string>();

    AILogger.log('IA configuration:', {
      aiActive,
      manualTags: effectiveTags.length,
      hasApiKey: !!process.env.OPENAI_API_KEY
    });

    if (effectiveTags.length > 0) {
      aiSource = 'manual';
      AILogger.info('Tags manuels fournis:', effectiveTags);
    }
    if (aiActive && effectiveTags.length === 0) {
      try {
        const maxTags = Number(process.env.AI_MAX_TAGS ?? '100');
        // Scope allowlist aux tags des produits destination (+ universels)
        const destScopedAllow: string[] = Array.from(new Set(
          validatedProducts
            .filter((p: any) => {
              const cc: string[] = Array.isArray(p.countryCodes) ? (p.countryCodes as string[]) : [];
              return cc.length === 0 || cc.includes(wizard.destinationCountry.toUpperCase());
            })
            .flatMap((p: any) => (Array.isArray(p.tags) ? (p.tags as string[]) : []))
        ));
        const explain = await getTagsForWizardSummary({
          destinationCountry: wizard.destinationCountry,
          destinationCity: wizard.destinationCity,
          destinationDisplayName: wizard.destinationDisplayName,
          marketplaceCountry: wizard.marketplaceCountry ?? wizard.destinationCountry,
          groupAge: { min: groupMinAge, max: groupMaxAge },
          dates: wizard.dates,
          adults: wizard.adults,
          children: wizard.children,
          animals: wizard.animals || 0,
          activities: wizard.activities,
          budget: wizard.budget,
          constraints: { maxTags: Math.max(1, Math.min(400, maxTags)), promptVersion: PROMPT_VERSION },
        }, {
          allowedTags: destScopedAllow.length > 0 ? destScopedAllow : (allowedTagIds.length > 0 ? allowedTagIds : undefined),
        });
        excludedTagsFromAi = new Set<string>((explain as any).exclude?.map((e: any) => e.id) || []);
        effectiveTags = (explain.tags || [])
          .map((t) => t.id)
          .filter((id) => !excludedTagsFromAi.has(id)) as any;
        aiSource = (explain.meta as any)?.source || 'openai';
        aiReason = (explain.meta as any)?.reason;
      } catch (e) {
        // En cas d'échec IA, on bascule en mode non-strict (ne filtre pas par tags)
        aiActive = false;
        effectiveTags = [];
        aiSource = 'error';
        aiReason = 'OPENAI_REQUEST_FAILED_OR_EXCEPTION';
      }
      // Si IA n'a rien retourné, on ne bloque pas la recommandation
      if (effectiveTags.length === 0) {
        aiActive = false;
      }
    }

    // Fallback: si aucun tag n'est disponible (IA désactivée ou sans résultat),
    // appliquer des tags saisonniers génériques pour éviter de tout retourner
    if (effectiveTags.length === 0) {
      const maxTags = Number(process.env.AI_MAX_TAGS ?? '100');
      // Fallback dynamique: prendre les tags les plus fréquents issus du Sheet
      const fallback = tagsByFreqDesc.slice(0, Math.max(1, Math.min(400, maxTags)));
      if (fallback.length > 0) {
        effectiveTags = fallback as any;
        if (aiSource === 'none' || aiSource === 'error' || aiSource === 'openai') {
          aiSource = 'fallback';
          if (!aiReason) {
            aiReason = aiActive ? 'EFFECTIVE_TAGS_EMPTY' : 'AI_DISABLED_OR_NO_TAGS';
          }
        }
      }
    }

    AILogger.log('Tags effectifs utilisés:', effectiveTags.length);
    AILogger.log('Source des tags:', aiSource);
    if (aiReason) AILogger.log('Raison:', aiReason);

    // Fonction de filtrage réutilisable
    const applyFiltering = (products: ProductRecord[], useAiTags: boolean) => {
      return products
        .filter((p) => p.status === 'active')
        .filter((p) => {
          if (p.status !== 'active') return false;

          // Si l'IA renvoie des tags à exclure, éliminer tout produit qui les possède
          // SAUF si le produit possède un tag EXPLICITEMENT demandé (L'inclusion l'emporte sur l'exclusion)
          if (excludedTagsFromAi.size > 0) {
            const productTags: string[] = Array.isArray((p as any).tags) ? ((p as any).tags as string[]) : [];

            // Vérifier d'abord si le produit est sauvé par un tag requis
            const reqTags = effectiveTags;
            // Liste des tags "faibles" qui ne doivent pas permettre de passer outre une exclusion
            const weakTags = ['vêtements', 'vetements', 'accessoires', 'indispensable', 'homme', 'femme', 'enfant', 'sport', 'genericbrand'];

            const savingTag = reqTags.find(t => {
              if (weakTags.includes(t)) return false; // Un tag générique ne sauve pas
              return productTags.includes(t as any);
            });
            const isSavedByInclusion = !!savingTag;

            if (!isSavedByInclusion) {
              for (const t of productTags) {
                if (excludedTagsFromAi.has(String(t))) return false;
              }
            }
          }

          // CountryCodes filter: si défini, le produit doit inclure le pays de destination
          if (Array.isArray((p as any).countryCodes) && (p as any).countryCodes.length > 0) {
            const cc: string[] = (p as any).countryCodes;
            if (!cc.includes(wizard.destinationCountry.toUpperCase())) return false;
          }

          if (!(groupMaxAge >= p.ageMin && groupMinAge <= p.ageMax)) return false;

          // Audience check
          const hasChild = wizard.ages.some((a) => a < 18);
          const hasAdult = wizard.ages.some((a) => a >= 18);
          let audienceMatch = true;
          if (p.audience === 'child') audienceMatch = hasChild;
          if (p.audience === 'adult') audienceMatch = hasAdult;

          if (!audienceMatch) return false;

          // Tag intersection
          const reqTags = effectiveTags;
          if (!useAiTags) return true; // Mode générique (Safety Fallback)

          if (reqTags.length === 0) {
            if (aiActive) return false;
            return true;
          }
          const productTags: string[] = Array.isArray((p as any).tags) ? ((p as any).tags as string[]) : [];
          const hasOverlap = productTags.some((t) => reqTags.includes(t as any));

          if (!hasOverlap) return false;

          return true;
        });
    };

    // 1. Essai avec filtrage strict (IA)
    let filtered = applyFiltering(validatedProducts, true);

    // 2. Safety Fallback: Si pas assez de résultats (< 6), on élargit
    if (filtered.length < 6 && aiActive) {
      AILogger.warn(`⚠️ Trop peu de résultats (${filtered.length}) avec filtres IA stricts. Activation du Safety Fallback.`);
      const fallbackFiltered = applyFiltering(validatedProducts, false); // false = ignorer les tags IA

      if (fallbackFiltered.length > filtered.length) {
        AILogger.info(`✅ Safety Fallback appliqué: ${fallbackFiltered.length} produits trouvés (vs ${filtered.length}).`);
        filtered = fallbackFiltered;
        aiSource = 'fallback'; // Indiquer que c'est du fallback
        aiReason = 'SAFETY_THRESHOLD_TRIGGERED_LESS_THAN_6';
      }
    }

    // mustHave en premier (trié par priority), puis le reste shufflé pour varier les résultats
    const mustHaves = filtered
      .filter(p => p.mustHave)
      .sort((a, b) => a.priority - b.priority);

    const others = filtered.filter(p => !p.mustHave);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    const sorted = [...mustHaves, ...others];

    const seen = new Set<string>();
    const response = sorted.filter((p) => {
      // Déduplication d'affichage: éviter doublons par asin ou par label
      const key = `${p.asin}::${p.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((p) => {
      const explain: string[] = [];
      explain.push(`destination=${wizard.destinationCountry}`);
      explain.push(`marketplace=${marketplace}`);
      explain.push(`ageRange=${groupMinAge}-${groupMaxAge}`);
      if (p.mustHave) explain.push('mustHave=true');
      explain.push(`priority=${p.priority}`);

      // Ajouter les tags contextuels pour rassurer l'utilisateur sur l'IA
      if (aiActive && effectiveTags.length > 0) {
        // On met juste les 3 premiers tags pour ne pas polloer
        explain.push(`tags=${effectiveTags.slice(0, 5).join(',')}`);
      }

      return {
        label: p.label,
        asin: p.asin,
        marketplace,
        imageUrl: p.imageUrl,
        explain: [...explain, `ai=${aiSource}`, ...(aiReason ? [`aiReason=${aiReason}`] : [])],
      };
    });

    const validatedResponse = ProductResponseSchema.array().parse(response);

    // Log pour mode summary
    AILogger.setSelectedProducts(validatedResponse);

    AILogger.info(`✅ Réponse finale: ${validatedResponse.length} produits`);

    // Log complet de la réponse pour debugging Vercel
    console.log('📦 [DEBUG-API] Response Payload (Server):', JSON.stringify(validatedResponse, null, 2));

    AILogger.groupEnd();

    return NextResponse.json(validatedResponse, { status: 200 });
  } catch (err) {
    AILogger.error('[api/recommend] Internal error', err);
    AILogger.groupEnd();
    const detail = err instanceof Error ? { name: err.name, message: err.message } : { err };
    return NextResponse.json({ message: 'Server error', detail }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ message: 'Use POST with wizardState' }, { status: 405 });
}
