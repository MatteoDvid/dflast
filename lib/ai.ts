import {
  ExplainRequestSchema,
  ExplainResponseSchema,
  type ExplainRequest,
  type ExplainResponse,
} from './schemas';
import { getDynamicTags } from './tags';
import { AILogger } from './logger';

type CacheEntry = { value: ExplainResponse; expiresAt: number };
const inMemoryCache = new Map<string, CacheEntry>();

function computeCacheKey(input: ExplainRequest): string {
  return JSON.stringify(input);
}

function getTtlMs(): number {
  const hours = Number(process.env.AI_CACHE_TTL_HOURS ?? '6');
  return Math.max(1, hours) * 60 * 60 * 1000;
}

export async function getTagsForWizardSummary(
  input: ExplainRequest,
  options?: { allowedTags?: string[] },
): Promise<ExplainResponse> {
  AILogger.group('getTagsForWizardSummary');
  AILogger.log('Input:', {
    destination: input.destinationCountry,
    city: input.destinationCity,
    displayName: input.destinationDisplayName,
    dates: input.dates,
    groupAge: input.groupAge,
    adults: input.adults,
    children: input.children,
    animals: input.animals,
    activities: input.activities,
    budget: input.budget
  });

  const parsed = ExplainRequestSchema.parse(input);
  const key = computeCacheKey(parsed);
  const now = Date.now();
  const cached = inMemoryCache.get(key);
  if (cached && cached.expiresAt > now) {
    AILogger.info('✅ Réponse trouvée dans le cache');
    // [DEBUG-API] Log explicite pour le user
    console.log('⚡ [DEBUG-API] CACHE HIT: Réponse servie depuis le cache mémoire (pas de nouvel appel IA)');
    AILogger.groupEnd();
    return cached.value;
  }

  // [DEBUG-API]
  console.log('🔄 [DEBUG-API] CACHE MISS: Nouvel appel IA requis');

  const aiEnabled = String(process.env.AI_ENABLED ?? 'false').toLowerCase() === 'true';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || '100000');

  AILogger.log('Configuration:', {
    aiEnabled,
    hasApiKey: !!apiKey,
    apiKeyStart: apiKey ? apiKey.substring(0, 7) + '...' : 'MISSING',
    model,
    timeoutMs
  });

  // Minimal fallback V1: return empty tags when AI disabled or no key
  let response: ExplainResponse = {
    tags: [],
    meta: { promptVersion: parsed.constraints.promptVersion, source: 'disabled', reason: 'AI_DISABLED_OR_NO_KEY' },
  };

  if (!aiEnabled) {
    AILogger.warn('❌ IA désactivée via AI_ENABLED=false');
  } else if (!apiKey) {
    AILogger.error('❌ OPENAI_API_KEY manquante ! Ajoutez-la dans .env.local');
    AILogger.error('Format attendu: OPENAI_API_KEY=sk-...');
  }

  if (aiEnabled && apiKey) {
    try {
      const dynamicTags = await getDynamicTags();
      const allowlist = Array.isArray(options?.allowedTags) && options!.allowedTags!.length > 0
        ? (options!.allowedTags as string[])
        : dynamicTags;

      // [DEBUG-API] Log de la liste blanche
      console.log(`📋 [DEBUG-API] ALLOWLIST TAGS (${allowlist.length} tags disponibles pour l'IA):`, allowlist.slice(0, 50).join(', '));
      if (allowlist.length > 50) console.log('... (et autres)');

      // Construction du contexte avec fallbacks
      const contextParts: string[] = [];

      // Destination
      const destinationName = parsed.destinationDisplayName ||
        parsed.destinationCity ||
        parsed.destinationCountry;
      contextParts.push(`- Destination: ${destinationName}`);

      // Dates
      if (parsed.dates?.start && parsed.dates?.end) {
        const start = new Date(parsed.dates.start);
        const end = new Date(parsed.dates.end);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        contextParts.push(`- Dates: du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')} (${duration} jours)`);
      } else {
        contextParts.push(`- Dates: Non spécifiées (prévoir pour toute saison)`);
      }

      // Voyageurs
      const travelersInfo: string[] = [];
      if (parsed.adults && parsed.adults > 0) {
        travelersInfo.push(`${parsed.adults} adulte${parsed.adults > 1 ? 's' : ''}`);
      }
      if (parsed.children && parsed.children > 0) {
        const childAges = parsed.groupAge.max < 18 ? `${parsed.groupAge.min}-${parsed.groupAge.max} ans` : 'âges variés';
        travelersInfo.push(`${parsed.children} enfant${parsed.children > 1 ? 's' : ''} (${childAges})`);
      }
      if (parsed.animals && parsed.animals > 0) {
        travelersInfo.push(`${parsed.animals} animal${parsed.animals > 1 ? 'aux' : ''}`);
      }
      if (travelersInfo.length === 0) {
        travelersInfo.push(`${parsed.groupAge.min}-${parsed.groupAge.max} ans`);
      }
      contextParts.push(`- Voyageurs: ${travelersInfo.join(', ')}`);

      // Activités
      if (parsed.activities && parsed.activities.length > 0) {
        contextParts.push(`- Activités prévues: ${parsed.activities.join(', ')}`);
      } else {
        contextParts.push(`- Activités: Voyage général sans activités spécifiques`);
      }

      // Budget
      if (parsed.budget) {
        contextParts.push(`- Budget activités: ${parsed.budget}`);
      }

      AILogger.debug('Contexte du voyage:', contextParts);
      AILogger.info(`Tags disponibles: ${allowlist.length}`);
      AILogger.debug('Exemples de tags:', allowlist.slice(0, 10).join(', '));

      const system = [
        'Tu es un expert en préparation de voyage. Analyse le contexte et sélectionne les tags les plus pertinents (articles ET contexte).',
        '',
        'CONTEXTE DU VOYAGE:',
        ...contextParts,
        '',
        'INSTRUCTIONS:',
        `1. Analyse le climat typique de cette destination ${parsed.dates ? 'à cette période précise' : 'en toute saison'}`,
        '2. Sélectionne des tags correspondant aux ARTICES indispensables (ex: "doudoune", "gourde")',
        '3. Sélectionne aussi des tags de CONTEXTE/CLIMAT (ex: "chaud", "froid", "soleil", "pluie") pour affiner la recherche',
        `4. Adapte aux besoins des voyageurs${parsed.animals ? ' (incluant les animaux)' : ''}`,
        '5. Exclue les tags inappropriés pour ce contexte',
        '',
        'TAGS DISPONIBLES:',
        allowlist.join(', '),
        '',
        `Retourne un JSON avec max ${parsed.constraints.maxTags} tags pertinents:`,
        '{ "tags": [{"id": "tag", "score": 0.0-1.0}], "exclude": [{"id": "tag"}] }',
      ].join('\n');

      AILogger.debug('Prompt système (200 premiers chars):', system.substring(0, 200) + '...');

      // Log pour mode summary
      AILogger.setAIPrompt(system, allowlist.length);

      const user = `Analyse ce voyage et retourne les tags appropriés en JSON.`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        AILogger.info('🚀 Appel OpenAI en cours...');
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              {
                role: 'user',
                content: [
                  'Retourne un JSON: { "tags": [ { "id": TagID, "score": number } ], "exclude": [ { "id": TagID, "score"?: number } ], "meta": { "promptVersion": string } }.',
                  'Voici la requête normalisée:',
                  JSON.stringify(user),
                ].join('\n'),
              },
            ],
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        AILogger.log('Réponse OpenAI - Status:', resp.status);
        if (!resp.ok) {
          const errorText = await resp.text();
          AILogger.error('❌ Erreur OpenAI:', errorText);
          throw new Error(`openai_http_${resp.status}`);
        }
        const data = (await resp.json()) as any;
        AILogger.info('✅ Réponse OpenAI reçue');
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') throw new Error('openai_no_content');
        AILogger.debug('Contenu brut:', content.substring(0, 200) + '...');
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(content);
        } catch {
          parsedJson = content;
        }
        AILogger.debug('Contenu parsé:', parsedJson);
        const validated = ExplainResponseSchema.parse(parsedJson);
        const rawCount = Array.isArray(validated.tags) ? validated.tags.length : 0;
        AILogger.info(`Nombre de tags retournés par l'IA: ${rawCount}`);
        if (validated.exclude && validated.exclude.length > 0) {
          AILogger.debug('Tags exclus:', validated.exclude.map(e => e.id).join(', '));
        }
        const allow = new Set(allowlist);
        const unique: Record<string, number> = {};
        for (const t of validated.tags || []) {
          if (!allow.has(t.id as any)) continue;
          if (unique[t.id] === undefined || t.score > unique[t.id]) unique[t.id] = t.score;
        }
        const compact = Object.entries(unique)
          .map(([id, score]) => ({ id, score }))
          .sort((a, b) => (b.score as number) - (a.score as number))
          .slice(0, parsed.constraints.maxTags);
        let reason: string | undefined = undefined;
        if (rawCount === 0) reason = 'OPENAI_RETURNED_EMPTY';
        else if (compact.length === 0) reason = 'NO_ALLOWED_TAGS_MATCH';
        response = {
          tags: compact as any,
          exclude: Array.isArray(validated.exclude)
            ? (validated.exclude as any[]).filter((e) => allow.has(e.id)).slice(0, parsed.constraints.maxTags)
            : [],
          meta: { promptVersion: parsed.constraints.promptVersion, source: 'openai', ...(reason ? { reason } : {}) },
        } as any;

        AILogger.info(`✅ Tags finaux: ${compact.length}`);
        AILogger.log('Tags sélectionnés:', compact.map(t => `${t.id} (${t.score})`).join(', '));

        // Log pour mode summary
        AILogger.setAIResponse({ tags: compact, meta: response.meta });
      } catch (err: any) {
        clearTimeout(timer);
        let reason = 'OPENAI_REQUEST_FAILED';
        const msg = (err && (err.message || String(err))) as string;
        if (err && (err.name === 'AbortError' || /aborted/i.test(String(err)))) {
          reason = 'OPENAI_TIMEOUT';
        } else if (typeof msg === 'string' && /^openai_http_\d+/.test(msg)) {
          reason = msg.toUpperCase();
        }
        AILogger.error('❌ Erreur OpenAI:', msg);
        AILogger.error('Raison:', reason);
        response = { tags: [], meta: { promptVersion: parsed.constraints.promptVersion, source: 'error', reason } };
      }
    } catch (outerErr: any) {
      try {
        console.error('[ai] OpenAI outer error:', outerErr?.message || String(outerErr));
      } catch { }
      response = { tags: [], meta: { promptVersion: parsed.constraints.promptVersion, source: 'error', reason: 'OPENAI_UNEXPECTED_ERROR' } };
    }
  }

  // If still empty tags → fallback to allowlist-derived tags to ensure filtering works
  if (!response.tags || response.tags.length === 0) {
    const dynamicTags = await getDynamicTags();
    const allowlist = Array.isArray(options?.allowedTags) && options!.allowedTags!.length > 0
      ? (options!.allowedTags as string[])
      : dynamicTags;
    const chosenSource = allowlist.slice(0, parsed.constraints.maxTags);
    // Préférer core-kit si disponible
    const withCore = new Set<string>(chosenSource);
    withCore.add('core-kit');
    const chosen = Array.from(withCore).slice(0, parsed.constraints.maxTags).map((id) => ({ id, score: id === 'core-kit' ? 0.9 as number : 0.5 as number })) as any;
    response = {
      tags: chosen as any,
      meta: { promptVersion: parsed.constraints.promptVersion, source: 'fallback', reason: response.meta?.reason },
    };
  }

  // Enforce presence of core-kit globally si autorisé
  try {
    const dynamicTags = await getDynamicTags();
    const allowForCore = Array.isArray(options?.allowedTags) && options!.allowedTags!.length > 0
      ? (options!.allowedTags as string[])
      : dynamicTags;
    if (allowForCore.includes('core-kit')) {
      const already = Array.isArray(response.tags) && response.tags.some((t: any) => t.id === 'core-kit');
      if (!already) {
        const max = parsed.constraints.maxTags;
        const next = Array.isArray(response.tags) ? (response.tags as any[]).slice() : [];
        next.unshift({ id: 'core-kit', score: 0.9 });
        if (next.length > max) next.length = max;
        response = { ...response, tags: next as any } as any;
      }
    }
  } catch { }

  AILogger.log('Response finale:', {
    source: response.meta?.source,
    reason: response.meta?.reason,
    tagsCount: response.tags?.length || 0
  });
  AILogger.groupEnd();

  inMemoryCache.set(key, { value: response, expiresAt: now + getTtlMs() });
  return ExplainResponseSchema.parse(response);
}
