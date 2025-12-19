// backend/validators/fieldData.validator.ts
// Validation des données de terrain
import { z } from 'zod';

export const createFieldNoteSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  type: z.enum(['OBSERVATION', 'INTERVIEW', 'REFLECTION', 'PHOTO', 'AUDIO', 'VIDEO', 'DOCUMENT']),
  projectId: z.string(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional()
  }).optional(),
  tagIds: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const updateFieldNoteSchema = createFieldNoteSchema.partial();

export const syncFieldDataSchema = z.object({
  deviceId: z.string(),
  lastSync: z.string().datetime(),
  fieldNotes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    type: z.string(),
    projectId: z.string(),
    location: z.any().optional(),
    syncVersion: z.number().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  }))
});
