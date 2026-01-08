import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ReviewStatus } from '@prisma/client';

// ==================== CRÉATION D'UNE REVISION ====================
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    const { documentId, reviewerId, dueDate, instructions } = req.body;

    // Validation de base
    if (!documentId || !reviewerId) {
      return res.status(400).json({
        success: false,
        message: 'Le document et le reviewer sont requis',
      });
    }

    // Vérifier que le document existe et appartient à l'utilisateur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        project: {
          members: {
            some: { userId },
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé ou accès refusé',
      });
    }

    // Vérifier que le reviewer a accès au projet
    const project = await prisma.project.findFirst({
      where: {
        documents: { some: { id: documentId } },
        members: { some: { userId: reviewerId } },
      },
    });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Le reviewer doit être membre du projet',
      });
    }

    // Créer la révision
    const review = await prisma.peerReview.create({
      data: {
        documentId,
        reviewerId,
        requesterId: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions: instructions || '',
        status: ReviewStatus.PENDING,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            type: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: review,
      message: 'Révision créée avec succès',
    });
  } catch (error: any) {
    console.error('Error creating peer review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la révision',
      error: error.message,
    });
  }
};

// ==================== OBTENIR UNE REVISION ====================
export const getReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    const review = await prisma.peerReview.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                discipline: true,
                affiliation: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        feedbacks: {
          include: {
            reviewer: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Révision non trouvée',
      });
    }

    // Vérifier les permissions
    const canAccess = 
      review.reviewerId === userId || 
      review.requesterId === userId ||
      await prisma.projectMember.findFirst({
        where: {
          project: {
            documents: { some: { id: review.documentId } },
          },
          userId,
        },
      });

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette révision',
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error fetching peer review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la révision',
      error: error.message,
    });
  }
};

// ==================== METTRE À JOUR UNE REVISION ====================
export const updateReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { dueDate, instructions } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    // Vérifier que la révision existe et que l'utilisateur est le requester
    const review = await prisma.peerReview.findFirst({
      where: {
        id,
        requesterId: userId,
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Révision non trouvée ou non autorisée',
      });
    }

    // Empêcher la modification si la révision est déjà complétée
    if (review.status === ReviewStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une révision complétée',
      });
    }

    const updatedReview = await prisma.peerReview.update({
      where: { id },
      data: {
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(instructions !== undefined && { instructions }),
      },
      include: {
        document: {
          select: {
            title: true,
            type: true,
          },
        },
        reviewer: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedReview,
      message: 'Révision mise à jour avec succès',
    });
  } catch (error: any) {
    console.error('Error updating peer review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la révision',
      error: error.message,
    });
  }
};

// ==================== SUPPRIMER UNE REVISION ====================
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    // Vérifier que la révision existe et que l'utilisateur est le requester
    const review = await prisma.peerReview.findFirst({
      where: {
        id,
        requesterId: userId,
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Révision non trouvée ou non autorisée',
      });
    }

    await prisma.peerReview.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Révision supprimée avec succès',
    });
  } catch (error: any) {
    console.error('Error deleting peer review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la révision',
      error: error.message,
    });
  }
};

// ==================== SOUMETTRE UNE REVISION ====================
export const submitReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { feedback, rating } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    if (!feedback || feedback.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Le feedback est requis (minimum 10 caractères)',
      });
    }

    // Vérifier que la révision existe et que l'utilisateur est le reviewer
    const review = await prisma.peerReview.findFirst({
      where: {
        id,
        reviewerId: userId,
        status: ReviewStatus.PENDING,
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Révision non trouvée ou déjà soumise',
      });
    }

    // Utiliser une transaction pour mettre à jour la révision et créer le feedback
    const [updatedReview] = await prisma.$transaction([
      prisma.peerReview.update({
        where: { id },
        data: {
          status: ReviewStatus.COMPLETED,
          completedAt: new Date(),
        },
      }),
      prisma.reviewFeedback.create({
        data: {
          reviewId: id,
          reviewerId: userId,
          feedback: feedback.trim(),
          rating: rating || null,
        },
      }),
    ]);

    // Récupérer la révision complète avec les relations
    const completeReview = await prisma.peerReview.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            title: true,
            type: true,
          },
        },
        reviewer: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        feedbacks: {
          where: { reviewId: id },
          include: {
            reviewer: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: completeReview,
      message: 'Révision soumise avec succès',
    });
  } catch (error: any) {
    console.error('Error submitting peer review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission de la révision',
      error: error.message,
    });
  }
};

// ==================== FONCTIONS SUPPLEMENTAIRES (optionnelles) ====================

// Obtenir toutes les révisions d'un utilisateur
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type = 'all' } = req.query; // 'pending', 'completed', 'requested', 'all'

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    const where: any = {};

    if (type === 'pending') {
      where.reviewerId = userId;
      where.status = ReviewStatus.PENDING;
    } else if (type === 'completed') {
      where.reviewerId = userId;
      where.status = ReviewStatus.COMPLETED;
    } else if (type === 'requested') {
      where.requesterId = userId;
    } else {
      // 'all' - toutes les révisions où l'utilisateur est impliqué
      where.OR = [
        { reviewerId: userId },
        { requesterId: userId },
      ];
    }

    const reviews = await prisma.peerReview.findMany({
      where,
      include: {
        document: {
          select: {
            title: true,
            type: true,
            project: {
              select: {
                title: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        requester: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des révisions',
      error: error.message,
    });
  }
};

// Obtenir les statistiques de révisions
export const getReviewStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié' 
      });
    }

    const stats = await prisma.$transaction([
      // Révisions assignées à l'utilisateur
      prisma.peerReview.count({
        where: { reviewerId: userId },
      }),
      // Révisions en attente
      prisma.peerReview.count({
        where: { 
          reviewerId: userId,
          status: ReviewStatus.PENDING,
        },
      }),
      // Révisions complétées
      prisma.peerReview.count({
        where: { 
          reviewerId: userId,
          status: ReviewStatus.COMPLETED,
        },
      }),
      // Révisions demandées par l'utilisateur
      prisma.peerReview.count({
        where: { requesterId: userId },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalAssigned: stats[0],
        pending: stats[1],
        completed: stats[2],
        requested: stats[3],
      },
    });
  } catch (error: any) {
    console.error('Error fetching review stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message,
    });
  }
};
