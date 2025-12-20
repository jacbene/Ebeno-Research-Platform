import { z } from 'zod';

export const createFieldNoteSchema = z.object({
  // Define your schema here
});

export const updateFieldNoteSchema = z.object({
  // Define your schema here
});

export const syncFieldDataSchema = z.object({
  deviceId: z.string(),
  fieldNotes: z.array(z.any()),
  lastSync: z.string(),
});
