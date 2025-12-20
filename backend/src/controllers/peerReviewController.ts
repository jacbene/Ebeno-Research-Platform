// backend/controllers/peerReviewController.ts
// URL: /api/peer-review
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  createReviewSchema, 
  updateReviewSchema,
  submitReviewSchema 
} from '../validators/peerReview.validator';

export class PeerReviewController {
  // Soumettre un document pour évaluation
  async submitForReview(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const data = createReviewSchema.parse(req.body);
      
      const document = await prisma.document.findUnique({
        where: { id: data.documentId }
      });
      
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document non trouvé'
        });
      }
      
      // Vérifier les permissions
      if (document.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul l\'auteur peut soumettre pour évaluation'
        });
      }
      
      // Créer la soumission
      const submission = await prisma.peerReviewSubmission.create({
        data: {
          title: data.title,
          abstract: data.abstract,
          documentId: data.documentId,
          projectId: data.projectId,
          submittedById: userId,
          reviewers: {
            connect: data.reviewerIds.map(id => ({ id }))
          }
        },
        include: {
          document: true,
          submittedBy: true,
          reviewers: true
        }
      });
      
      res.status(201).json({
        success: true,
        data: submission
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir les soumissions à évaluer
  async getReviewAssignments(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { status, projectId } = req.query;
      
      const where: any = {
        reviewers: {
          some: { id: userId }
        }
      };
      
      if (status) where.status = status;
      if (projectId) where.projectId = projectId;
      
      const submissions = await prisma.peerReviewSubmission.findMany({
        where,
        include: {
          document: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          submittedBy: true,
          reviews: {
            where: { reviewerId: userId }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      res.status(200).json({
        success: true,
        data: submissions
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Créer une évaluation
  async createReview(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { submissionId } = req.params;
      const data = submitReviewSchema.parse(req.body);
      
      // Vérifier que l'utilisateur est un évaluateur assigné
      const submission = await prisma.peerReviewSubmission.findUnique({
        where: { id: submissionId },
        include: {
          reviewers: true
        }
      });
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Soumission non trouvée'
        });
      }
      
      const isReviewer = submission.reviewers.some(r => r.id === userId);
      if (!isReviewer) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à évaluer cette soumission'
        });
      }
      
      // Vérifier qu'il n'y a pas déjà une évaluation de cet utilisateur
      const existingReview = await prisma.peerReview.findFirst({
        where: {
          submissionId,
          reviewerId: userId
        }
      });
      
      if (existingReview) {
        return res.status(400).json({
          success: false,
          error: 'Vous avez déjà soumis une évaluation'
        });
      }
      
      // Créer l'évaluation
      const review = await prisma.peerReview.create({
        data: {
          ...data,
          submissionId,
          reviewerId: userId,
          status: 'SUBMITTED'
        },
        include: {
          reviewer: true
        }
      });
      
      // Mettre à jour le statut de la soumission si toutes les évaluations sont soumises
      await this.updateSubmissionStatus(submissionId);
      
      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir les évaluations d'une soumission
  async getSubmissionReviews(req: Request, res: Response) {
    try {
      const { submissionId } = req.params;
      const userId = req.user.id;
      
      const submission = await prisma.peerReviewSubmission.findUnique({
        where: { id: submissionId },
        include: {
          submittedBy: true
        }
      });
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Soumission non trouvée'
        });
      }
      
      // Vérifier les permissions
      const canView = submission.submittedById === userId || 
                     submission.reviewers.some((r: any) => r.id === userId);
      
      if (!canView) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }
      
      const reviews = await prisma.peerReview.findMany({
        where: { submissionId },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              expertise: true
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        }
      });
      
      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Générer un rapport d'évaluation
  async generateReviewReport(req: Request, res: Response) {
    try {
      const { submissionId } = req.params;
      
      const submission = await prisma.peerReviewSubmission.findUnique({
        where: { id: submissionId },
        include: {
          document: true,
          submittedBy: true,
          reviews: {
            include: {
              reviewer: true
            }
          }
        }
      });
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Soumission non trouvée'
        });
      }
      
      // Calculer les statistiques
      const stats = this.calculateReviewStats(submission.reviews);
      
      // Analyse IA des commentaires
      const aiAnalysis = await this.analyzeReviewsWithAI(submission.reviews);
      
      // Générer le rapport
      const report = {
        submission: {
          id: submission.id,
          title: submission.title,
          abstract: submission.abstract,
          submittedBy: submission.submittedBy.name,
          submittedAt: submission.createdAt
        },
        statistics: stats,
        reviews: submission.reviews,
        aiAnalysis,
        recommendations: this.generateRecommendations(stats, aiAnalysis),
        overallScore: stats.averageScore,
        decision: this.makeDecision(stats, aiAnalysis)
      };
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Méthodes privées
  private async updateSubmissionStatus(submissionId: string) {
    const submission = await prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
      include: {
        reviewers: true,
        reviews: true
      }
    });
    
    if (!submission) return;
    
    const totalReviewers = submission.reviewers.length;
    const submittedReviews = submission.reviews.filter(r => r.status === 'SUBMITTED').length;
    
    let newStatus = submission.status;
    
    if (submittedReviews === totalReviewers) {
      newStatus = 'COMPLETED';
    } else if (submittedReviews > 0) {
      newStatus = 'IN_PROGRESS';
    }
    
    await prisma.peerReviewSubmission.update({
      where: { id: submissionId },
      data: { status: newStatus }
    });
  }
  
  private calculateReviewStats(reviews: any[]) {
    if (reviews.length === 0) {
      return {
        averageScore: 0,
        scoreDistribution: {},
        completionRate: 0,
        averageReviewTime: 0
      };
    }
    
    const scores = reviews
      .filter(r => r.score !== null)
      .map(r => r.score);
    
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
    
    const scoreDistribution: Record<number, number> = {};
    scores.forEach(score => {
      scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
    });
    
    // Calculer le temps moyen d'évaluation
    const reviewTimes = reviews
      .filter(r => r.submittedAt && r.createdAt)
      .map(r => {
        const submitted = new Date(r.submittedAt);
        const created = new Date(r.createdAt);
        return (submitted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // en jours
      });
    
    const averageReviewTime = reviewTimes.length > 0
      ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
      : 0;
    
    return {
      averageScore: parseFloat(averageScore.toFixed(2)),
      scoreDistribution,
      completionRate: (reviews.filter(r => r.status === 'SUBMITTED').length / reviews.length) * 100,
      averageReviewTime: parseFloat(averageReviewTime.toFixed(1))
    };
  }
  
  private async analyzeReviewsWithAI(reviews: any[]) {
    // Utiliser DeepSeek pour analyser les commentaires
    const comments = reviews
      .filter(r => r.comments)
      .map(r => r.comments)
      .join('\n\n');
    
    if (!comments) {
      return {
        thematicAnalysis: [],
        sentiment: 'NEUTRAL',
        keyPoints: []
      };
    }
    
    // Appel à l'API DeepSeek
    // const aiResponse = await deepseekAPI.analyzeText(comments);
    // return this.parseAIResponse(aiResponse);
    
    // Pour l'instant, retourner une réponse factice
    return {
      thematicAnalysis: [
        { theme: 'Clarté', frequency: 0.8 },
        { theme: 'Méthodologie', frequency: 0.6 },
        { theme: 'Résultats', frequency: 0.9 }
      ],
      sentiment: 'POSITIVE',
      keyPoints: [
        'Bonne structure',
        'Méthodologie solide',
        'Résultats bien présentés'
      ]
    };
  }
  
  private generateRecommendations(stats: any, aiAnalysis: any): string[] {
    const recommendations = [];
    
    if (stats.averageScore < 7) {
      recommendations.push('Améliorer la clarté et la structure du document');
    }
    
    if (stats.completionRate < 80) {
      recommendations.push('Relancer les évaluateurs en retard');
    }
    
    if (aiAnalysis.sentiment === 'NEGATIVE') {
      recommendations.push('Revoir les points soulevés par les évaluateurs');
    }
    
    return recommendations;
  }
  
  private makeDecision(stats: any, aiAnalysis: any): string {
    if (stats.averageScore >= 8) {
      return 'ACCEPT';
    } else if (stats.averageScore >= 6) {
      return 'MINOR_REVISION';
    } else if (stats.averageScore >= 4) {
      return 'MAJOR_REVISION';
    } else {
      return 'REJECT';
    }
  }
}

export default new PeerReviewController();
