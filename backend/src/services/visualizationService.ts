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
  createdBy: string;
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
  createdAt: Date;
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
                where: {
                  ...(dateRange && {
                    createdAt: {
                      gte: dateRange.start,
                      lte: dateRange.end,
                    },
                  }),
                },
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

      // Formater les données pour le graphique
      const data = {
        labels: codes.map((code: CodeWithAnnotationsCount) => code.name),
        datasets: [
          {
            label: 'Nombre d\'occurrences',
            data: codes.map((code: CodeWithAnnotationsCount) => code._count.annotations),
            backgroundColor: codes.map((code: CodeWithAnnotationsCount) => code.color || '#4ECDC4'),
            borderColor: '#333',
            borderWidth: 1,
          },
        ],
        codes: codes.map((code: CodeWithAnnotationsCount) => ({
          id: code.id,
          name: code.name,
          color: code.color,
          count: code._count.annotations,
          percentage: codes.length > 0 
            ? Math.round((code._count.annotations / codes.reduce((sum: number, c: CodeWithAnnotationsCount) => sum + c._count.annotations, 0)) * 100)
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
        ...documents.map((d: any) => d.content || ''),
        ...transcriptions.map((t: any) => t.transcriptText || ''),
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
          totalWords: words.reduce((sum: number, word: { text: string; value: number }) => sum + word.value, 0),
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

      const codeIds = codes.map((code: any) => code.id);
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
            codeId: { in: codeIds.filter((id: string) => id !== codeId) },
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
          coOccurringAnnotations.forEach((coAnnotation: any) => {
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
      const normalizedMatrix = matrix.map((row: number[]) =>
        row.map((value: number) => maxValue > 0 ? value / maxValue : 0)
      );

      return {
        success: true,
        data: {
          matrix: normalizedMatrix,
          rawMatrix: matrix,
          codes: codes.map((code: any, index: number) => ({
            id: code.id,
            name: code.name,
            color: code.color,
            totalOccurrences: matrix[index].reduce((sum: number, val: number) => sum + val, 0),
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

      // Récupérer les annotations groupées par intervalle
      const annotations = await prisma.annotation.groupBy({
        by: ['createdAt'],
        where: {
          projectId,
          createdAt: {
            gte: baseDate,
            lte: endDate,
          },
        },
        _count: {
          _all: true,
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

      // Pour chaque code, compter les annotations par intervalle
      const seriesData = await Promise.all(
        codes.map(async (code: any) => {
          const codeAnnotations = await prisma.annotation.groupBy({
            by: ['createdAt'],
            where: {
              projectId,
              codeId: code.id,
              createdAt: {
                gte: baseDate,
                lte: endDate,
              },
            },
            _count: {
              _all: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

          return {
            codeId: code.id,
            codeName: code.name,
            color: code.color,
            data: codeAnnotations.map((a: AnnotationGroupByResult) => ({
              date: a.createdAt,
              count: a._count._all,
            })),
          };
        })
      );

      // Grouper par intervalle de temps
      const groupedData = this.groupByTimeInterval(seriesData, interval, baseDate, endDate);

      return {
        success: true,
        data: {
          timeline: groupedData.timeline,
          series: groupedData.series,
          totalAnnotations: annotations.reduce((sum: number, a: AnnotationGroupByResult) => sum + a._count._all, 0),
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
        members.map(async (member: ProjectMemberWithUser) => {
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
      userStats.sort((a: any, b: any) => b.stats.total - a.stats.total);

      // Calculer les pourcentages
      const totalActivity = userStats.reduce((sum: number, user: any) => sum + user.stats.total, 0);
      const userData = userStats.map((user: any) => ({
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
    
    words.forEach((word: string) => {
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
      .sort((a: { text: string; value: number }, b: { text: string; value: number }) => b.value - a.value)
      .slice(0, options.maxWords || 100);

    return sortedWords;
  }

  private groupByTimeInterval(
    seriesData: Array<{
      codeId: string;
      codeName: string;
      color: string | null;
      data: Array<{ date: Date; count: number }>;
    }>,
    interval: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ) {
    // Générer les intervalles de temps
    const intervals: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      intervals.push(new Date(current));
      
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

    // Initialiser les séries
    const series = seriesData.map((code: { codeName: string; color: string | null }) => ({
      name: code.codeName,
      color: code.color,
      data: new Array(intervals.length).fill(0),
    }));

    // Remplir les données
    seriesData.forEach((code: { data: Array<{ date: Date; count: number }> }, codeIndex: number) => {
      code.data.forEach((point: { date: Date; count: number }) => {
        const pointDate = new Date(point.date);
        
        // Trouver l'intervalle correspondant
        const intervalIndex = intervals.findIndex((intervalDate: Date, idx: number) => {
          if (idx === intervals.length - 1) return pointDate >= intervalDate;
          
          const nextInterval = intervals[idx + 1];
          return pointDate >= intervalDate && pointDate < nextInterval;
        });

        if (intervalIndex !== -1) {
          series[codeIndex].data[intervalIndex] += point.count;
        }
      });
    });

    return {
      timeline: intervals.map((date: Date) => date.toISOString().split('T')[0]),
      series,
    };
  }
}

export const visualizationService = new VisualizationService();
export default visualizationService;
