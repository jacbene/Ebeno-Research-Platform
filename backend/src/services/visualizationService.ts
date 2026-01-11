import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Filter {
  projectId: string;
  codeIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface WordCloudOptions {
  maxWords?: number;
  minWordLength?: number;
  excludeCommonWords?: boolean;
}

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Types pour les retours de Prisma
interface CodeWithAnnotationsCount {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count: {
    annotations: number;
  };
}

interface AnnotationGroupByResult {
  createdAt: Date;
  _count: {
    _all: number;
  };
}

interface ProjectMemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
}

class VisualizationService {
  // === FRÉQUENCE DES CODES ===
  async getCodeFrequencies(filter: Filter): Promise<ServiceResponse> {
    try {
      const { projectId, codeIds, dateRange } = filter;

      const where: any = {
        projectId,
        ...(codeIds && { id: { in: codeIds } }),
      };

      // Récupérer les codes avec le nombre d'annotations
      const codes = await prisma.code.findMany({
        where,
        include: {
          _count: {
            select: {
              annotations: {
                where: dateRange ? {
                  createdAt: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                  },
                } : {},
              },
            },
          },
        },
        orderBy: {
          annotations: {
            _count: 'desc',
          },
        },
      });

      const totalAnnotations = codes.reduce((sum, c) => sum + c._count.annotations, 0);

      // Formater les données pour le graphique
      const data = {
        labels: codes.map(code => code.name),
        datasets: [
          {
            label: 'Nombre d\'occurrences',
            data: codes.map(code => code._count.annotations),
            backgroundColor: codes.map(code => code.color || '#4ECDC4'),
            borderColor: '#333',
            borderWidth: 1,
          },
        ],
        codes: codes.map(code => ({
          id: code.id,
          name: code.name,
          color: code.color,
          count: code._count.annotations,
          percentage: totalAnnotations > 0
            ? Math.round((code._count.annotations / totalAnnotations) * 100)
            : 0,
        })),
      };

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error getting code frequencies:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du calcul des fréquences de codes',
      };
    }
  }

  // === NUAGE DE MOTS ===
  async getWordCloud(filter: Filter, options?: WordCloudOptions): Promise<ServiceResponse> {
    try {
      const { projectId, dateRange } = filter;
      const { maxWords = 100, minWordLength = 3, excludeCommonWords = true } = options || {};

      // Récupérer tout le texte du projet
      const [documents, transcriptions] = await Promise.all([
        prisma.document.findMany({
          where: {
            projectId,
            ...(dateRange && {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            }),
          },
          select: { content: true },
        }),
        prisma.transcription.findMany({
          where: {
            projectId,
            ...(dateRange && {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            }),
          },
          select: { transcriptText: true },
        }),
      ]);

      // Combiner tout le texte
      const allText = [
        ...documents.map(d => d.content || ''),
        ...transcriptions.map(t => t.transcriptText || ''),
      ].join(' ');

      // Analyser les mots (simplifié)
      const words = this.analyzeTextForWordCloud(allText, {
        maxWords,
        minWordLength,
        excludeCommonWords,
      });

      return {
        success: true,
        data: {
          words,
          totalDocuments: documents.length,
          totalTranscriptions: transcriptions.length,
          totalWords: words.reduce((sum, word) => sum + word.value, 0),
        },
      };
    } catch (error: any) {
      console.error('Error generating word cloud:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération du nuage de mots',
      };
    }
  }

  // === MATRICE DE CO-OCCURRENCE ===
  async getCoOccurrenceMatrix(filter: Filter): Promise<ServiceResponse> {
    try {
      const { projectId, dateRange } = filter;

      // Récupérer les codes du projet
      const codes = await prisma.code.findMany({
        where: { projectId },
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' },
      });

      if (codes.length === 0) {
        return {
          success: true,
          data: {
            matrix: [],
            codes: [],
          },
        };
      }

      const codeIds = codes.map(code => code.id);
      const matrix: number[][] = Array.from({ length: codes.length }, () => 
        Array.from({ length: codes.length }, () => 0)
      );

      // Pour chaque code, trouver les annotations qui co-occurrent
      for (let i = 0; i < codes.length; i++) {
        const codeId = codeIds[i];
        
        // Récupérer les documents/transcriptions annotés avec ce code
        const annotations = await prisma.annotation.findMany({
          where: {
            codeId,
            ...(dateRange && {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            }),
          },
          select: {
            documentId: true,
            transcriptionId: true,
          },
        });

        // Pour chaque annotation, vérifier quels autres codes sont présents sur le même document/transcription
        for (const annotation of annotations) {
          const whereClause: any = {
            OR: [
              { documentId: annotation.documentId },
              { transcriptionId: annotation.transcriptionId },
            ],
            codeId: { in: codeIds.filter(id => id !== codeId) },
            ...(dateRange && {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            }),
          };

          const coOccurringAnnotations = await prisma.annotation.findMany({
            where: whereClause,
            select: { codeId: true },
          });

          // Mettre à jour la matrice
          coOccurringAnnotations.forEach(coAnnotation => {
            const j = codeIds.indexOf(coAnnotation.codeId);
            if (j !== -1) {
              matrix[i][j] += 1;
              matrix[j][i] += 1; // La matrice est symétrique
            }
          });
        }
      }

      // Normaliser les valeurs pour l'affichage
      const maxValue = Math.max(...matrix.flat());
      const normalizedMatrix = matrix.map(row =>
        row.map(value => maxValue > 0 ? value / maxValue : 0)
      );

      return {
        success: true,
        data: {
          matrix: normalizedMatrix,
          rawMatrix: matrix,
          codes: codes.map((code, index) => ({
            id: code.id,
            name: code.name,
            color: code.color,
            totalOccurrences: matrix[index].reduce((sum, val) => sum + val, 0),
          })),
        },
      };
    } catch (error: any) {
      console.error('Error generating co-occurrence matrix:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération de la matrice de co-occurrence',
      };
    }
  }

  // === ÉVOLUTION TEMPORELLE ===
  async getTemporalEvolution(filter: Filter, interval: 'day' | 'week' | 'month' = 'month'): Promise<ServiceResponse> {
    try {
      const { projectId, dateRange } = filter;

      // Déterminer la période de base
      const baseDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
      const endDate = dateRange?.end || new Date();

      // Récupérer les annotations
      const annotations = await prisma.annotation.findMany({
        where: {
          projectId,
          createdAt: {
            gte: baseDate,
            lte: endDate,
          },
        },
        select: {
          createdAt: true,
          codeId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Récupérer les codes pour avoir les séries
      const codes = await prisma.code.findMany({
        where: { projectId },
        select: { id: true, name: true, color: true },
      });

      // Créer une map pour les codes
      const codeMap = new Map(codes.map(code => [code.id, code]));

      // Grouper par intervalle de temps
      const grouped = this.groupAnnotationsByInterval(annotations, interval, baseDate, endDate);

      // Créer les séries pour chaque code
      const series = codes.map(code => ({
        name: code.name,
        color: code.color,
        data: grouped.intervals.map(interval => ({
          date: interval.date,
          count: interval.codeCounts[code.id] || 0
        }))
      }));

      return {
        success: true,
        data: {
          timeline: grouped.intervals.map(i => i.date.toISOString().split('T')[0]),
          series,
          totalAnnotations: annotations.length,
          period: {
            start: baseDate,
            end: endDate,
            interval,
          },
        },
      };
    } catch (error: any) {
      console.error('Error getting temporal evolution:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'évolution temporelle',
      };
    }
  }

  // === COMPARAISON PAR UTILISATEUR ===
  async getUserComparison(filter: Filter): Promise<ServiceResponse> {
    try {
      const { projectId, dateRange } = filter;

      // Récupérer tous les membres du projet
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
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

      // Pour chaque membre, calculer les statistiques
      const userStats = await Promise.all(
        members.map(async member => {
          const whereClause = {
            projectId,
            userId: member.userId,
            ...(dateRange && {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            }),
          };

          const [
            annotationsCount,
            memosCount,
            documentsCount,
            transcriptionsCount,
          ] = await Promise.all([
            prisma.annotation.count({ where: whereClause }),
            prisma.memo.count({ where: whereClause }),
            prisma.document.count({ where: whereClause }),
            prisma.transcription.count({ where: whereClause }),
          ]);

          return {
            userId: member.userId,
            userName: member.user.profile
              ? `${member.user.profile.firstName} ${member.user.profile.lastName}`
              : member.user.email,
            email: member.user.email,
            role: member.role,
            stats: {
              annotations: annotationsCount,
              memos: memosCount,
              documents: documentsCount,
              transcriptions: transcriptionsCount,
              total: annotationsCount + memosCount + documentsCount + transcriptionsCount,
            },
          };
        })
      );

      // Trier par activité totale
      userStats.sort((a, b) => b.stats.total - a.stats.total);

      // Calculer les pourcentages
      const totalActivity = userStats.reduce((sum, user) => sum + user.stats.total, 0);
      const userData = userStats.map(user => ({
        ...user,
        percentage: totalActivity > 0 ? Math.round((user.stats.total / totalActivity) * 100) : 0,
      }));

      return {
        success: true,
        data: {
          users: userData,
          summary: {
            totalUsers: members.length,
            totalActivity,
            averagePerUser: totalActivity > 0 ? Math.round(totalActivity / members.length) : 0,
          },
        },
      };
    } catch (error: any) {
      console.error('Error getting user comparison:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la comparaison par utilisateur',
      };
    }
  }

  // === MÉTHODES PRIVÉES ===
  private analyzeTextForWordCloud(
    text: string,
    options: WordCloudOptions
  ): Array<{ text: string; value: number }> {
    // Mots communs à exclure (en français)
    const commonWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'à', 'au', 'aux',
      'en', 'avec', 'sur', 'pour', 'par', 'dans', 'que', 'qui', 'quoi', 'où',
      'quand', 'comment', 'pourquoi', 'est', 'sont', 'était', 'étaient', 'a', 'as',
      'avoir', 'être', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs',
      'on', 'nous', 'vous', 'ils', 'elles', 'je', 'tu', 'il', 'elle', 'me', 'te',
      'se', 'y', 'ne', 'pas', 'plus', 'moins', 'très', 'trop', 'bien', 'mal',
      'aussi', 'encore', 'donc', 'car', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
    ]);

    // Nettoyer et tokeniser le texte
    const cleanedText = text.toLowerCase()
      .replace(/[^\w\sàáâäæçèéêëîïôœùûüÿ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanedText.split(' ');
    
    // Compter les occurrences
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      if (
        word.length >= (options.minWordLength || 3) &&
        (!options.excludeCommonWords || !commonWords.has(word))
      ) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Convertir en tableau et trier
    const sortedWords = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, options.maxWords || 100);

    return sortedWords;
  }

  private groupAnnotationsByInterval(
    annotations: Array<{ createdAt: Date; codeId: string }>,
    interval: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ) {
    // Générer les intervalles de temps
    const intervals: Array<{ date: Date; codeCounts: Record<string, number> }> = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      intervals.push({
        date: new Date(current),
        codeCounts: {}
      });
      
      switch (interval) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    // Remplir les données
    annotations.forEach(annotation => {
      const annotationDate = new Date(annotation.createdAt);
      
      // Trouver l'intervalle correspondant
      for (let i = 0; i < intervals.length; i++) {
        const intervalStart = intervals[i].date;
        let intervalEnd: Date;
        
        if (i === intervals.length - 1) {
          intervalEnd = new Date(endDate);
        } else {
          intervalEnd = new Date(intervals[i + 1].date);
          intervalEnd.setMilliseconds(intervalEnd.getMilliseconds() - 1);
        }
        
        if (annotationDate >= intervalStart && annotationDate <= intervalEnd) {
          intervals[i].codeCounts[annotation.codeId] = 
            (intervals[i].codeCounts[annotation.codeId] || 0) + 1;
          break;
        }
      }
    });

    return { intervals };
  }
}

export const visualizationService = new VisualizationService();
export default visualizationService;
