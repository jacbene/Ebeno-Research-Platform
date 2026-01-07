import { z } from 'zod';

export const createReferenceSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  authors: z.array(z.string()).min(1, "Au moins un auteur est requis"),
  year: z.number().int().min(1900).max(2100),
  journal: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().url("URL invalide").optional(),
  abstract: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().min(1, "L'ID du projet est requis"),
});

export const updateReferenceSchema = z.object({
  title: z.string().min(1, "Le titre est requis").optional(),
  authors: z.array(z.string()).min(1, "Au moins un auteur est requis").optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  journal: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().url("URL invalide").optional(),
  abstract: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().min(1, "L'ID du projet est requis").optional(),
});

export const importBibTeXSchema = z.object({
  bibtexContent: z.string().min(1, "Le contenu BibTeX est requis"),
});

// Types TypeScript dérivés des schémas Zod
export type CreateReferenceInput = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;
export type ImportBibTeXInput = z.infer<typeof importBibTeXSchema>;
