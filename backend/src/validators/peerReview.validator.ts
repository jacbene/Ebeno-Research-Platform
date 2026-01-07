import { z } from 'zod';

export const createReviewSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  reviewerIds: z.array(z.string()),
  dueDate: z.string().datetime().optional(),
  submissionId: z.string(),
});

export const updateReviewSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  reviewerIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
});

export const submitReviewSchema = z.object({
  reviewId: z.string(),
  comments: z.string().min(1),
  decision: z.enum(['ACCEPT', 'REJECT', 'MINOR_REVISIONS', 'MAJOR_REVISIONS']),
  rating: z.number().min(1).max(5).optional(),
});
