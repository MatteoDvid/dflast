import { type ProductRecord } from './schemas';
import { AILogger } from './logger';

type TripContext = {
  destinationCountry: string;
  destinationCity?: string | null;
  destinationDisplayName?: string | null;
  marketplaceCountry: string;
  dates?: { start: string; end: string } | null;
  adults: number;
  children: number;
  animals?: number;
  activities?: string[];
  budget?: string;
};

export type AISelectionResult = {
  indices: number[];
  source: 'openai' | 'fallback' | 'disabled' | 'error';
  reason?: string;
};

type CacheEntry = { value: AISelectionResult; expiresAt: number };
const inMemoryCache = new Map<string, CacheEntry>();

function getTtlMs(): number {
  const hours = Number(process.env.AI_CACHE_TTL_HOURS ?? '6');
  return Math.max(1, hours) * 60 * 60 * 1000;
}

export async function selectProductsWithAI(
  trip: TripContext,
  products: ProductRecord[],
): Promise<AISelectionResult> {
  const cacheKey = JSON.stringify({ trip, labels: products.map((p) => p.label) });
  const now = Date.now();
  const cached = inMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    console.log('⚡ [AI] Cache hit');
    return cached.value;
  }

  const aiEnabled = String(process.env.AI_ENABLED ?? 'false').toLowerCase() === 'true';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4.5-mini';
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || '30000');

  const fallbackResult: AISelectionResult = {
    indices: products.map((_, i) => i),
    source: 'disabled',
    reason: 'AI_DISABLED_OR_NO_KEY',
  };

  if (!aiEnabled || !apiKey) {
    AILogger.warn(!aiEnabled ? 'IA désactivée' : 'OPENAI_API_KEY manquante');
    return fallbackResult;
  }

  // Build trip context
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const contextParts: string[] = [];
  const destName = trip.destinationDisplayName || trip.destinationCity || trip.destinationCountry;
  contextParts.push(`Destination: ${destName} (${trip.destinationCountry})`);

  if (trip.dates?.start && trip.dates?.end) {
    const s = new Date(trip.dates.start);
    const e = new Date(trip.dates.end);
    contextParts.push(
      `Dates: ${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`,
    );
  }

  const travelers: string[] = [];
  if (trip.adults > 0) travelers.push(`${trip.adults} adulte${trip.adults > 1 ? 's' : ''}`);
  if (trip.children > 0) travelers.push(`${trip.children} enfant${trip.children > 1 ? 's' : ''}`);
  if (trip.animals && trip.animals > 0) travelers.push(`${trip.animals} animal${trip.animals > 1 ? 'aux' : ''}`);
  contextParts.push(`Voyageurs: ${travelers.join(', ')}`);

  if (trip.activities && trip.activities.length > 0) {
    contextParts.push(`Activités: ${trip.activities.join(', ')}`);
  }
  if (trip.budget) contextParts.push(`Budget: ${trip.budget}`);

  const productList = products.map((p, i) => `[${i}] ${p.label}`).join('\n');

  const systemPrompt = [
    'Tu es un expert en préparation de voyage. Sélectionne les produits vraiment utiles pour ce voyage parmi la liste fournie.',
    '',
    'VOYAGE:',
    ...contextParts,
    '',
    'RÈGLES:',
    '- Sélectionne uniquement les produits adaptés à la destination, la saison et les voyageurs présents',
    '- Ordonne du plus utile au moins utile',
    '- Exclus les produits inappropriés (ex: spray anti-moustique pour Islande en janvier, polaire pour Thaïlande en juillet)',
    '- Exclus les produits pour enfants s\'il n\'y a que des adultes et vice-versa',
    '- Sélectionne entre 10 et 25 produits',
    '',
    'PRODUITS DISPONIBLES:',
    productList,
    '',
    'Réponds uniquement en JSON: {"selected": [liste d\'indices dans l\'ordre de pertinence]}',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    AILogger.info(`🚀 Appel ${model} avec ${products.length} produits candidats...`);
    console.log(`📋 [AI] Envoi de ${products.length} produits à ${model}`);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Sélectionne les produits adaptés à ce voyage.' },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`openai_http_${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('openai_no_content');

    const parsed = JSON.parse(content);
    const selected: number[] = Array.isArray(parsed.selected)
      ? parsed.selected.filter((i: any) => typeof i === 'number' && i >= 0 && i < products.length)
      : [];

    AILogger.info(`✅ IA sélectionné ${selected.length} produits`);
    console.log(`✅ [AI] Sélection: ${selected.map((i) => products[i]?.label).slice(0, 5).join(', ')}...`);

    const result: AISelectionResult = { indices: selected, source: 'openai' };
    inMemoryCache.set(cacheKey, { value: result, expiresAt: now + getTtlMs() });
    return result;
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError' || /aborted/i.test(String(err));
    const reason = isTimeout ? 'OPENAI_TIMEOUT' : 'OPENAI_REQUEST_FAILED';
    AILogger.error('❌ Erreur OpenAI:', err?.message);
    console.error(`❌ [AI] Erreur (${reason}):`, err?.message);
    return { indices: products.map((_, i) => i), source: 'error', reason };
  }
}
