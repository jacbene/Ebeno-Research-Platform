import { z } from 'zod';

export const generateApiKeySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  scopes: z.array(z.string()),
  expiresIn: z.number().optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const validateApiRequestSchema = z.object({});
