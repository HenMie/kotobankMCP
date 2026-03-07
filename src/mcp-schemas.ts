import { z } from "zod";

export const candidateSchema = z.object({
  title: z.string(),
  dictionaryName: z.string(),
  canonicalUrl: z.string().url(),
  anchorId: z.string(),
  pathType: z.string(),
  score: z.number(),
});

export const searchInputSchema = z.object({
  query: z.string().min(1),
  dictionaryScope: z.enum(["jp-monolingual", "all"]).optional(),
  maxResults: z.number().int().positive().max(20).optional(),
});

export const searchOutputSchema = z.object({
  query: z.string(),
  totalCandidates: z.number().int().nonnegative(),
  candidates: z.array(candidateSchema),
});

export const lookupInputSchema = z.object({
  query: z.string().min(1),
  canonicalUrl: z.string().url().optional(),
  anchorId: z.string().min(1).optional(),
  preferredDictionaries: z.array(z.string()).optional(),
  maxEntries: z.number().int().positive().max(10).optional(),
  includeExcerpt: z.boolean().optional(),
});

export const lookupEntrySchema = z.object({
  dictionaryName: z.string(),
  title: z.string(),
  summaryText: z.string(),
  sourceLabel: z.string(),
  sourceUrl: z.string().url(),
  anchorId: z.string(),
});

export const lookupOutputSchema = z.object({
  headword: z.string(),
  reading: z.string().optional(),
  canonicalUrl: z.string().url(),
  entries: z.array(lookupEntrySchema),
  relatedTerms: z.array(z.string()),
  needsDisambiguation: z.boolean(),
  candidates: z.array(candidateSchema).optional(),
});
