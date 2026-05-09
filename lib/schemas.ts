import { z } from 'zod';

export const Iso2CountrySchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

// Définir TagIdSchema avant tout usage (WizardStateSchema l'utilise)
// Accepter des tags libres (issus du Google Sheet)
export const TagIdSchema = z.string().min(1).max(64);

export const WizardStateSchema = z
  .object({
    destinationCountry: Iso2CountrySchema,
    destinationCity: z.string().optional(),
    destinationDisplayName: z.string().optional(),
    marketplaceCountry: Iso2CountrySchema.optional(),
    dates: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    travelers: z.number().int().min(1).max(20),
    ages: z.array(z.number().int().min(0).max(120)).min(1),
    adults: z.number().int().min(0).max(20).optional(),
    children: z.number().int().min(0).max(20).optional(),
    animals: z.number().int().min(0).max(10).default(0),
    activities: z.array(z.string()).optional(),
    budget: z.string().optional(),
    tags: z.array(TagIdSchema).max(400).optional(),
  })
  .refine((v) => v.ages.length === v.travelers, {
    message: "Le nombre d'âges doit correspondre au nombre de voyageurs",
    path: ['ages'],
  })
  .refine((v) => !v.dates || new Date(v.dates.start) <= new Date(v.dates.end), {
    message: 'La date de début doit être antérieure ou égale à la date de fin',
    path: ['dates', 'end'],
  });

export type WizardState = z.infer<typeof WizardStateSchema>;

export const ProductRecordSchema = z
  .object({
    label: z.string().min(1),
    asin: z.string().min(1),
    status: z.enum(['active', 'inactive']).default('active'),
    mustHave: z.boolean().default(false),
    priority: z.number().int().min(0).default(0),
    audience: z.enum(['child', 'adult', 'all']).default('all'),
    ageMin: z.number().int().min(0).max(120),
    ageMax: z.number().int().min(0).max(120),
    tags: z.array(TagIdSchema).max(50).optional(),
    countryCodes: z.array(Iso2CountrySchema).optional(),
    imageUrl: z.string().url().optional(),
    category: z.string().optional(),
  })
  .refine((p) => p.ageMin <= p.ageMax, {
    message: 'ageMin doit être ≤ ageMax',
    path: ['ageMax'],
  });

export type ProductRecord = z.infer<typeof ProductRecordSchema>;

export const ProductResponseSchema = z.object({
  label: z.string(),
  asin: z.string(),
  marketplace: Iso2CountrySchema,
  explain: z.array(z.string()),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  mustHave: z.boolean().optional(),
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;

// OpenAI explain/tagging contracts

export const ExplainRequestSchema = z.object({
  destinationCountry: Iso2CountrySchema,
  destinationCity: z.string().optional(),
  destinationDisplayName: z.string().optional(),
  marketplaceCountry: Iso2CountrySchema.optional(),
  groupAge: z.object({
    min: z.number().int().min(0).max(120),
    max: z.number().int().min(0).max(120),
  }),
  dates: z.object({ start: z.string().datetime(), end: z.string().datetime() }).optional(),
  adults: z.number().int().min(0).max(20).optional(),
  children: z.number().int().min(0).max(20).optional(),
  animals: z.number().int().min(0).max(10).optional(),
  activities: z.array(z.string()).optional(),
  budget: z.string().optional(),
  constraints: z.object({ maxTags: z.number().int().min(1).max(400), promptVersion: z.string() }),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export const ExplainResponseSchema = z.object({
  tags: z
    .array(
      z.object({
        id: TagIdSchema,
        score: z.number().min(0).max(1),
      }),
    )
    .max(400),
  exclude: z
    .array(
      z.object({
        id: TagIdSchema,
        score: z.number().min(0).max(1).optional(),
      }),
    )
    .max(400)
    .optional(),
  meta: z
    .object({
      promptVersion: z.string(),
      source: z.enum(['openai', 'fallback', 'disabled', 'error']).optional(),
      reason: z.string().optional(),
    })
    .optional(),
});

export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
