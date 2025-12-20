// backend/controllers/analyticsController.ts
// URL: /api/analytics
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { generateProjectAnalyticsSchema } from '../validators/analytics.validator';

export class AnalyticsController {
  
  // Obtenir les métriques d'un projet
  async getProjectAnalytics(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      
      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true
        }
      });
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Projet non trouvé'
        });
      }
      
      const isMember = project.members.some((m: any) => m.userId === userId);
      if (!isMember && project.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }
      
      // Calculer les métriques
      const analytics = await this.calculateProjectAnalytics(projectId);
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir les statistiques d'utilisation de l'IA
  async getAIAnalytics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const where: any = {
        userId
      };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }
      
      const aiAnalyses = await prisma.aIAnalysis.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      const analytics = this.analyzeAIRequests(aiAnalyses);
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir le réseau de collaborateurs
  async getCollaborationNetwork(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          createdProjects: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      profile: true,
                      email: true,
                    }
                  }
                }
              }
            }
          },
          collaborationSessions: true
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      const network = this.buildCollaborationNetwork(user);
      
      res.status(200).json({
        success: true,
        data: network
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Générer un rapport d'activité
  async generateActivityReport(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { startDate, endDate, format } = req.body;
      
      const report = await this.generateUserActivityReport(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
      
      // Formater selon le format demandé
      const formattedReport = this.formatReport(report, format || 'json');
      
      res.status(200).json({
        success: true,
        data: formattedReport
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Méthodes privées
  private async calculateProjectAnalytics(projectId: string) {
    // Récupérer toutes les données du projet
    const [
      documents,
      transcriptions,
      memos,
      codes,
      references,
      surveys,
      fieldNotes,
      collaborationSessions
    ] = await Promise.all([
      prisma.document.count({ where: { projectId } }),
      prisma.transcription.count({ where: { projectId } }),
      prisma.memo.count({ where: { projectId } }),
      prisma.code.count({ where: { projectId } }),
      prisma.reference.count({ where: { projectId } }),
      prisma.survey.count({ where: { projectId } }),
      prisma.fieldNote.count({ where: { projectId } }),
      prisma.collaborationSession.count({ where: { projectId } })
    ]);
    
    // Calculer les tendances temporelles
    const trends = await this.calculateTrends(projectId);
    
    // Calculer l'avancement
    const progress = await this.calculateProjectProgress(projectId);
    
    // Analyser l'engagement des collaborateurs
    const engagement = await this.analyzeCollaboratorEngagement(projectId);
    
    return {
      overview: {
        documents,
        transcriptions,
        memos,
        codes,
        references,
        surveys,
        fieldNotes,
        collaborationSessions,
        totalItems: documents + transcriptions + memos + codes + references + surveys + fieldNotes
      },
      trends,
      progress,
      engagement,
      recommendations: this.generateProjectRecommendations({
        documents,
        codes,
        memos,
        progress
      })
    };
  }
  
  private async calculateTrends(projectId: string) {
    return {
      daily: [],
      trend: 'stable',
      averageDaily: 0
    };
  }
  
  private async calculateProjectProgress(projectId: string) {
    return { percentage: 0, status: 'not_started' };
  }
  
  private async analyzeCollaboratorEngagement(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!project) return [];
    
    const engagement = await Promise.all(
      project.members.map(async (member: any) => {
        const contributions = await this.countContributions(projectId, member.userId);
        
        return {
          user: {
            id: member.user.id,
            name: member.user.profile?.firstName + ' ' + member.user.profile?.lastName,
            email: member.user.email
          },
          activities: 0, // Placeholder
          contributions,
          lastActive: member.user.updatedAt,
          engagementScore: this.calculateEngagementScore(0, contributions)
        };
      })
    );
    
    return engagement.sort((a, b) => b.engagementScore - a.engagementScore);
  }
  
  private async countContributions(projectId: string, userId: string) {
    const [
      documents,
      transcriptions,
      memos,
      codes
    ] = await Promise.all([
      prisma.document.count({ where: { projectId, userId } }),
      prisma.transcription.count({ where: { projectId, userId } }),
      prisma.memo.count({ where: { projectId, userId } }),
      prisma.code.count({ where: { projectId, userId } })
    ]);
    
    return {
      documents,
      transcriptions,
      memos,
      codes,
      total: documents + transcriptions + memos + codes
    };
  }
  
  private calculateEngagementScore(activities: number, contributions: any): number {
    const activityScore = Math.min(activities / 10, 1) * 40;
    const contributionScore = Math.min(contributions.total / 20, 1) * 60;
    return activityScore + contributionScore;
  }
  
  private analyzeAIRequests(requests: any[]) {
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        costEstimate: 0,
        usageByType: {}
      };
    }
    
    const successfulRequests = requests.filter(r => r.duration !== null);
    
    const totalResponseTime = successfulRequests.reduce((sum, r) => 
      sum + (r.duration || 0), 0
    );
    
    const usageByType: Record<string, number> = {};
    requests.forEach(r => {
      usageByType[r.type] = (usageByType[r.type] || 0) + 1;
    });
    
    // Estimation de coût (approximative)
    const totalCost = requests.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    return {
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: requests.length - successfulRequests.length,
      successRate: (successfulRequests.length / requests.length) * 100,
      averageResponseTime: totalResponseTime / successfulRequests.length,
      usageByType,
      costEstimate: parseFloat(totalCost.toFixed(4)),
      dailyUsage: this.calculateDailyUsage(requests)
    };
  }
  
  private calculateDailyUsage(requests: any[]) {
    const daily: Record<string, number> = {};
    
    requests.forEach(r => {
      const date = r.createdAt.toISOString().split('T')[0];
      daily[date] = (daily[date] || 0) + 1;
    });
    
    return Object.entries(daily)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  private buildCollaborationNetwork(user: any) {
    const nodes = new Set<string>();
    const links: Array<{ source: string; target: string; weight: number }> = [];
    
    // Ajouter l'utilisateur principal
    nodes.add(user.id);
    
    // Parcourir les projets
    user.createdProjects.forEach((project: any) => {
      project.members.forEach((member: any) => {
        if (member.userId !== user.id) {
          nodes.add(member.userId);
          links.push({
            source: user.id,
            target: member.userId,
            weight: this.calculateCollaborationWeight(project, user.id, member.userId)
          });
        }
      });
    });
    
    // Parcourir les sessions de collaboration
    user.collaborationSessions.forEach((session: any) => {
      session.participants.forEach((participant: any) => {
        if (participant.id !== user.id) {
          nodes.add(participant.id);
          links.push({
            source: user.id,
            target: participant.id,
            weight: this.calculateSessionWeight(session)
          });
        }
      });
    });
    
    // Construire les données des nœuds
    const nodeData = Array.from(nodes).map(nodeId => ({
      id: nodeId,
      name: this.getUserName(nodeId, user),
      group: this.getUserGroup(nodeId, user)
    }));
    
    return {
      nodes: nodeData,
      links,
      statistics: {
        totalConnections: links.length,
        averageWeight: links.reduce((sum, link) => sum + link.weight, 0) / links.length,
        density: (links.length / (nodeData.length * (nodeData.length - 1))) * 100
      }
    };
  }
  
  private calculateCollaborationWeight(project: any, user1: string, user2: string): number {
    // Basé sur la durée de collaboration et le nombre d'interactions
    let weight = 1;
    
    // Ajouter du poids pour les projets actifs
    if (project.status === 'ACTIVE') weight += 2;
    
    // Ajouter du poids pour la durée
    const projectDuration = new Date().getTime() - new Date(project.createdAt).getTime();
    const months = projectDuration / (1000 * 60 * 60 * 24 * 30);
    weight += Math.min(months, 12); // Max 12 points pour la durée
    
    return weight;
  }
  
  private calculateSessionWeight(session: any): number {
    // Basé sur la durée et l'activité de la session
    let weight = 1;
    
    // Durée de la session (en heures)
    const duration = session.lastActivity 
      ? (new Date(session.lastActivity).getTime() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60)
      : 0;
    
    weight += Math.min(duration, 10); // Max 10 points pour la durée
    
    return weight;
  }
  
  private getUserName(userId: string, currentUser: any): string {
    if (userId === currentUser.id) return currentUser.profile?.firstName + ' ' + currentUser.profile?.lastName;
    
    // Chercher dans les collaborateurs
    for (const project of currentUser.createdProjects) {
      for (const member of project.members) {
        if (member.userId === userId) return member.user.profile?.firstName + ' ' + member.user.profile?.lastName;
      }
    }
    
    // Chercher dans les participants de sessions
    for (const session of currentUser.collaborationSessions) {
      for (const participant of session.participants) {
        if (participant.id === userId) return participant.profile?.firstName + ' ' + participant.profile?.lastName;
      }
    }
    
    return 'Utilisateur inconnu';
  }
  
  private getUserGroup(userId: string, currentUser: any): number {
    // Groupe 1: Collaborateurs de projet
    // Groupe 2: Participants de sessions
    // Groupe 3: Autres
    
    if (userId === currentUser.id) return 0;
    
    for (const project of currentUser.createdProjects) {
      if (project.members.some((m: any) => m.userId === userId)) return 1;
    }
    
    for (const session of currentUser.collaborationSessions) {
      if (session.participants.some((p: any) => p.id === userId)) return 2;
    }
    
    return 3;
  }
  
  private async generateUserActivityReport(userId: string, startDate: Date, endDate: Date) {
    return {
      period: {
        start: startDate,
        end: endDate,
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      summary: {
        totalActivities: 0,
        averageDaily: 0,
        mostActiveDay: null,
        mostActiveProject: null
      },
      breakdown: {
        byType: {},
        byProject: [],
        dailyTrends: []
      },
      achievements: []
    };
  }
  
  private calculateAchievements(activities: any[]) {
    const achievements = [];
    
    if (activities.length >= 100) {
      achievements.push({
        name: 'Productif',
        description: '100 activités réalisées',
        icon: '🏆'
      });
    }
    
    const uniqueProjects = new Set(activities.map(a => a.projectId).filter(Boolean));
    if (uniqueProjects.size >= 3) {
      achievements.push({
        name: 'Multitâche',
        description: 'Actif sur 3 projets différents',
        icon: '🌟'
      });
    }
    
    const today = new Date();
    const todayActivities = activities.filter(a => 
      a.createdAt.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    );
    
    if (todayActivities.length >= 10) {
      achievements.push({
        name: 'En feu',
        description: '10 activités aujourd\'hui',
        icon: '🔥'
      });
    }
    
    return achievements;
  }
  
  private formatReport(report: any, format: string) {
    switch (format) {
      case 'json':
        return report;
      
      case 'csv':
        return this.convertToCSV(report);
      
      case 'pdf':
        // Générer PDF (implémentation simplifiée)
        return {
          content: 'PDF généré',
          downloadUrl: `/api/reports/download/${Date.now()}.pdf`
        };
      
      default:
        return report;
    }
  }
  
  private convertToCSV(report: any): string {
    // Implémentation simplifiée de conversion CSV
    const lines = [];
    
    // En-tête
    lines.push('Rapport d\'activité');
    lines.push(`Période: ${report.period.start} - ${report.period.end}`);
    lines.push('');
    
    // Résumé
    lines.push('Résumé');
    lines.push(`Total d'activités,${report.summary.totalActivities}`);
    lines.push(`Moyenne quotidienne,${report.summary.averageDaily.toFixed(2)}`);
    lines.push('');
    
    // Répartition par type
    lines.push('Répartition par type');
    Object.entries(report.breakdown.byType).forEach(([type, count]) => {
      lines.push(`${type},${count}`);
    });
    
    return lines.join('\n');
  }
  
  private generateProjectRecommendations(data: any) {
    const recommendations = [];
    
    if (data.documents === 0) {
      recommendations.push('Commencez par importer ou créer des documents');
    }
    
    if (data.codes === 0 && data.documents > 0) {
      recommendations.push('Analysez vos documents avec le module de codage');
    }
    
    if (data.memos === 0) {
      recommendations.push('Créez des mémos pour documenter vos réflexions');
    }
    
    if (data.progress.percentage < 30) {
      recommendations.push('Définissez des jalons pour suivre votre progression');
    }
    
    return recommendations;
  }
}

export default new AnalyticsController();
