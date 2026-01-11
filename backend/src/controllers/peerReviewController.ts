import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ReviewStatus, ReviewDecision } from '@prisma/client';

export const createPeerReviewSubmission = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { documentId, projectId, title, abstract, reviewers, deadline } = req.body;

    if (!documentId || !projectId || !reviewers || !reviewers.length) {
      return res.status(400).json({ success: false, message: 'Inputs invalides' });
    }

    const submission = await prisma.peerReviewSubmission.create({
      data: {
        title,
        abstract: abstract || '',
        documentId,
        projectId,
        submittedBy: { connect: { id: userId } },
        status: ReviewStatus.SUBMITTED,
        reviewers: { connect: reviewers.map((id: string) => ({ id })) },
        deadline: deadline ? new Date(deadline) : null,
        reviews: {
          create: reviewers.map((reviewerId: string) => ({
            reviewer: { connect: { id: reviewerId } },
            status: ReviewStatus.DRAFT, // Initial status for each review
            comments: '',
            decision: ReviewDecision.MAJOR_REVISION, // Default decision
          })),
        },
      },
      include: { reviews: true, submittedBy: true },
    });

    return res.status(201).json({ success: true, data: submission });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

export const getReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const review = await prisma.peerReview.findUnique({
      where: { id },
      include: {
        submission: {
          include: {
            submittedBy: { select: { id: true, profile: true } }
          }
        },
        reviewer: { select: { id: true, profile: true } }
      },
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Révision non trouvée' });
    }

    if (review.reviewerId !== userId && review.submission.submittedById !== userId) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    return res.status(200).json({ success: true, data: review });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

export const submitReview = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params; // ID of the PeerReview, not the submission
        const { comments, decision, score, strengths, weaknesses } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const review = await prisma.peerReview.findFirst({
            where: {
                id,
                reviewerId: userId,
                status: { not: ReviewStatus.COMPLETED }
            }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Révision non trouvée ou déjà soumise' });
        }

        const updatedReview = await prisma.peerReview.update({
            where: { id },
            data: {
                comments,
                decision,
                score,
                strengths,
                weaknesses,
                status: ReviewStatus.COMPLETED,
                reviewedAt: new Date(),
            },
        });

        return res.status(200).json({ success: true, data: updatedReview });
    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

export const getUserReviews = async (req: Request, res: Response) => {
  try {
      const userId = req.user?.id;
      if (!userId) {
          return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const { as, status } = req.query; // as: 'reviewer' | 'submitter'

      let where: any = {};
      if (as === 'reviewer') {
          where.reviewerId = userId;
      } else if (as === 'submitter') {
          where.submission = { submittedById: userId };
      } else {
          where.OR = [{ reviewerId: userId }, { submission: { submittedById: userId } }];
      }

      if (status) {
        where.status = status as ReviewStatus;
      }

      const reviews = await prisma.peerReview.findMany({
          where,
          include: {
              submission: { select: { id: true, title: true, status: true } },
              reviewer: { select: { profile: { select: { firstName: true, lastName: true } } } }
          },
          orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ success: true, data: reviews });

  } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
