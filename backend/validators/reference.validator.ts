// backend/validators/reference.validator.ts
// Validation des données pour les références
import { z } from 'zod';

export const createReferenceSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  authors: z.array(z.string()).min(1, 'Au moins un auteur est requis'),
  year: z.number().int().min(1800).max(new Date().getFullYear() + 5),
  type: z.enum(['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'CONFERENCE', 'REPORT', 'WEBPAGE', 'OTHER']),
  journal: z.string().optional(),
  publisher: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  isbn: z.string().optional(),
  issn: z.string().optional(),
  url: z.string().url().optional(),
  projectId: z.string().optional(),
  folderId: z.string().optional(),
  tagIds: z.array(z.string()).optional()
});

export const updateReferenceSchema = createReferenceSchema.partial();

export const importBibTeXSchema = z.object({
  format: z.enum(['bibtex', 'ris']),
  content: z.string().min(1, 'Le contenu est requis')
});

export const generateBibliographySchema = z.object({
  referenceIds: z.array(z.string()).min(1, 'Au moins une référence est requise'),
  style: z.enum(['APA', 'CHICAGO', 'MLA', 'HARVARD', 'VANCOUVER', 'IEEE'])
});
