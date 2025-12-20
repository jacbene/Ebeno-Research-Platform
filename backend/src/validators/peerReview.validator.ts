import { z } from 'zod';

export const createPeerReviewValidator = z.object({
  submissionId: z.string(),
  reviewerId: z.string(),
  score: z.number().optional(),
  comments: z.string(),
  decision: z.string(),
});

export const updatePeerReviewValidator = z.object({
  score: z.number().optional(),
  comments: z.string().optional(),
  decision: z.string().optional(),
});
