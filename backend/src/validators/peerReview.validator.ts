import { z } from 'zod';

export const createReviewSchema = z.object({
  documentId: z.string().min(1, "L'ID du document est requis"),
  reviewerId: z.string().min(1, "L'ID du reviewer est requis"),
  dueDate: z.string().datetime("Date invalide").optional(),
  instructions: z.string().optional(),
});

export const updateReviewSchema = z.object({
  dueDate: z.string().datetime("Date invalide").optional(),
  instructions: z.string().optional(),
});

export const submitReviewSchema = z.object({
  feedback: z.string().min(10, "Le feedback doit contenir au moins 10 caractères"),
  rating: z.number().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
