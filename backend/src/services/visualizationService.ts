import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VisualizationFilter {
  projectId: string;
  codeIds?: string[];
  documentIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

class VisualizationService {
  // === FRÉQUENCE DES CODES ===
  
  async getCodeFrequencies(filter: VisualizationFilter) {
    try {
      const { projectId, codeIds, dateRange } = filter;

      // Vérifier que le projet existe
      const project = await prisma.project.findFirst({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error('Projet non trouvé');
      }

      // Construire la requête de base
      const whereClause: any = {
        code: {
          projectId,
        },
      };

      // Filtrer par codes spécifiques
      if (codeIds && codeIds.length > 0) {
        whereClause.codeId = { in: codeIds };
      }

      // Filtrer par date
      if (dateRange) {
        whereClause.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      // Récupérer les annotations groupées par code
      const annotationsByCode = await prisma.annotation.groupBy({
        by: ['codeId'],
        where: whereClause,
        _count: {
          codeId: true,
        },
        orderBy: {
          _count: {
            codeId: 'desc',
          },
        },
      });

      // Récupérer les informations des codes
      const codes = await prisma.code.findMany({
        where: {
          id: { in: annotationsByCode.map(a => a.codeId) },
        },
        select: {
          id: true,
          name: true,
          color: true,
          description: true,
          parentId: true,
        },
      });

      // Calculer les pourcentages
      const totalAnnotations = annotationsByCode.reduce((sum, item) => sum + item._count.codeId, 0);

      const frequencies = annotationsByCode.map(item => {
        const code = codes.find(c => c.id === item.codeId);
        const percentage = totalAnnotations > 0 ? (item._count.codeId / totalAnnotations) * 100 : 0;
        
        return {
          codeId: item.codeId,
          codeName: code?.name || 'Inconnu',
          codeColor: code?.color || '#666666',
          count: item._count.codeId,
          percentage: Math.round(percentage * 100) / 100,
          parentId: code?.parentId,
        };
      });

      // Grouper par parent si nécessaire
      const groupedFrequencies = this.groupFrequenciesByParent(frequencies, codes);

      return {
        success: true,
        data: {
          frequencies,
          groupedFrequencies,
          totalAnnotations,
          totalCodes: frequencies.length,
        },
      };
    } catch (error: any) {
      console.error('Error getting code frequencies:', error);
      return { success: false, error: error.message };
    }
  }

  // === NUAGE DE MOTS ===
  
  async getWordCloud(filter: VisualizationFilter, options?: {
    maxWords?: number;
    minWordLength?: number;
    excludeCommonWords?: boolean;
  }) {
    try {
      const { projectId, dateRange } = filter;
      const {
        maxWords = 50,
        minWordLength = 3,
        excludeCommonWords = true,
      } = options || {};

      // Récupérer tous les textes annotés
      const annotations = await prisma.annotation.findMany({
        where: {
          code: {
            projectId,
          },
          createdAt: dateRange ? {
            gte: dateRange.start,
            lte: dateRange.end,
          } : undefined,
        },
        select: {
          selectedText: true,
          codeId: true,
        },
      });

      // Extraire et traiter les mots
      const allText = annotations.map(a => a.selectedText).join(' ');
      const words = this.extractWords(allText, {
        minLength: minWordLength,
        excludeCommonWords,
      });

      // Compter les fréquences
      const wordFrequencies: Record<string, number> = {};
      words.forEach(word => {
        wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
      });

      // Convertir en tableau et trier
      const wordArray = Object.entries(wordFrequencies)
        .map(([text, value]) => ({
          text,
          value,
          size: Math.log(value) * 10, // Échelle logarithmique pour la taille
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxWords);

      return {
        success: true,
        data: {
          words: wordArray,
          totalWords: words.length,
          uniqueWords: wordArray.length,
          maxFrequency: wordArray[0]?.value || 0,
        },
      };
    } catch (error: any) {
      console.error('Error generating word cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // === MATRICE DE CO-OCCURRENCE ===
  
  async getCoOccurrenceMatrix(filter: VisualizationFilter) {
    try {
      const { projectId, dateRange } = filter;

      // Récupérer tous les documents avec leurs annotations
      const documents = await prisma.document.findMany({
        where: {
          projectId,
        },
        include: {
          annotations: {
            where: dateRange ? {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            } : undefined,
            select: {
              codeId: true,
            },
          },
        },
      });

      // Récupérer tous les codes du projet
      const codes = await prisma.code.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          color: true,
        },
        orderBy: { name: 'asc' },
      });

      // Initialiser la matrice
      const matrix: Record<string, Record<string, number>> = {};
      const codeIndex: Record<string, number> = {};
      
      codes.forEach((code, index) => {
        codeIndex[code.id] = index;
        matrix[code.id] = {};
        codes.forEach(otherCode => {
          matrix[code.id][otherCode.id] = 0;
        });
      });

      // Compter les co-occurrences
      documents.forEach(document => {
        const documentCodes = [...new Set(document.annotations.map(a => a.codeId))];
        
        documentCodes.forEach((codeId1, i) => {
          documentCodes.forEach((codeId2, j) => {
            if (i !== j && codeId1 && codeId2) {
              matrix[codeId1][codeId2] = (matrix[codeId1][codeId2] || 0) + 1;
            }
          });
        });
      });

      // Formater les données pour la visualisation
      const nodes = codes.map(code => ({
        id: code.id,
        name: code.name,
        color: code.color,
        value: documents.filter(d => 
          d.annotations.some(a => a.codeId === code.id)
        ).length,
      }));

      const links: Array<{
        source: string;
        target: string;
        value: number;
      }> = [];

      codes.forEach((code1, i) => {
        codes.forEach((code2, j) => {
          if (i < j && matrix[code1.id][code2.id] > 0) {
            links.push({
              source: code1.id,
              target: code2.id,
              value: matrix[code1.id][code2.id],
            });
          }
        });
      });

      return {
        success: true,
        data: {
          matrix,
          nodes,
          links,
          totalDocuments: documents.length,
          totalCodes: codes.length,
        },
      };
    } catch (error: any) {
      console.error('Error generating co-occurrence matrix:', error);
      return { success: false, error: error.message };
    }
  }

  // === ÉVOLUTION TEMPORELLE ===
  
  async getTemporalEvolution(filter: VisualizationFilter, interval: 'day' | 'week' | 'month' = 'month') {
    try {
      const { projectId, dateRange } = filter;

      // Déterminer la plage par défaut si non spécifiée
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date();
      startDate.setMonth(startDate.getMonth() - 6); // 6 mois par défaut

      // Récupérer les annotations groupées par intervalle
      const annotations = await prisma.annotation.findMany({
        where: {
          code: {
            projectId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          codeId: true,
          createdAt: true,
          code: {
            select: {
              name: true,
              color: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Grouper par intervalle
      const intervals = this.createTimeIntervals(startDate, endDate, interval);
      const codeIds = [...new Set(annotations.map(a => a.codeId))];
      
      // Récupérer les noms des codes
      const codes = await prisma.code.findMany({
        where: {
          id: { in: codeIds },
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      // Initialiser les données
      const seriesData: Record<string, { name: string; color: string; data: number[] }> = {};
      
      codes.forEach(code => {
        seriesData[code.id] = {
          name: code.name,
          color: code.color,
          data: new Array(intervals.length).fill(0),
        };
      });

      // Compter les annotations par intervalle
      annotations.forEach(annotation => {
        const intervalIndex = this.getIntervalIndex(annotation.createdAt, intervals, interval);
        if (intervalIndex >= 0 && seriesData[annotation.codeId]) {
          seriesData[annotation.codeId].data[intervalIndex]++;
        }
      });

      // Convertir en format adapté aux graphiques
      const series = Object.values(seriesData).filter(series => 
        series.data.some(value => value > 0)
      );

      const categories = intervals.map(interval => 
        this.formatIntervalLabel(interval, interval)
      );

      return {
        success: true,
        data: {
          series,
          categories,
          totalAnnotations: annotations.length,
          timeRange: {
            start: startDate,
            end: endDate,
            interval,
          },
        },
      };
    } catch (error: any) {
      console.error('Error getting temporal evolution:', error);
      return { success: false, error: error.message };
    }
  }

  // === COMPARAISON PAR UTILISATEUR ===
  
  async getUserComparison(filter: VisualizationFilter) {
    try {
      const { projectId, dateRange } = filter;

      // Récupérer les annotations groupées par utilisateur et code
      const annotations = await prisma.annotation.findMany({
        where: {
          code: {
            projectId,
          },
          createdAt: dateRange ? {
            gte: dateRange.start,
            lte: dateRange.end,
          } : undefined,
        },
        select: {
          userId: true,
          codeId: true,
          user: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          code: {
            select: {
              name: true,
              color: true,
            },
          },
        },
      });

      // Grouper par utilisateur
      const userMap = new Map<string, {
        userId: string;
        userName: string;
        codes: Map<string, { name: string; color: string; count: number }>;
        total: number;
      }>();

      annotations.forEach(annotation => {
        if (!annotation.userId) return;
        const userId = annotation.userId;
        const userName = (annotation.user && annotation.user.profile) 
          ? `${annotation.user.profile.firstName} ${annotation.user.profile.lastName}` 
          : 'Utilisateur inconnu';
        const codeId = annotation.codeId;
        const codeName = annotation.code.name;
        const codeColor = annotation.code.color;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName,
            codes: new Map(),
            total: 0,
          });
        }

        const userData = userMap.get(userId)!;
        if (!userData.codes.has(codeId)) {
          userData.codes.set(codeId, {
            name: codeName,
            color: codeColor,
            count: 0,
          });
        }

        const codeData = userData.codes.get(codeId)!;
        codeData.count++;
        userData.total++;
      });

      // Convertir en format adapté
      const users = Array.from(userMap.values());
      const allCodes = new Set<string>();
      users.forEach(user => {
        user.codes.forEach((_, codeId) => allCodes.add(codeId));
      });

      // Récupérer les informations complètes des codes
      const codes = await prisma.code.findMany({
        where: {
          id: { in: Array.from(allCodes) },
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      // Créer la matrice utilisateur x code
      const matrix = users.map(user => {
        const row: any = {
          userId: user.userId,
          userName: user.userName,
          total: user.total,
        };

        codes.forEach(code => {
          const userCode = user.codes.get(code.id);
          row[code.id] = userCode ? userCode.count : 0;
        });

        return row;
      });

      return {
        success: true,
        data: {
          users,
          codes,
          matrix,
          totalUsers: users.length,
          totalAnnotations: annotations.length,
        },
      };
    } catch (error: any) {
      console.error('Error getting user comparison:', error);
      return { success: false, error: error.message };
    }
  }

  // === HELPERS ===
  
  private groupFrequenciesByParent(frequencies: any[], codes: any[]) {
    const parentMap = new Map<string, {
      parentId: string | null;
      parentName: string;
      color: string;
      children: any[];
      total: number;
    }>();

    // Ajouter les codes sans parent
    frequencies.forEach(freq => {
      if (!freq.parentId) {
        parentMap.set(freq.codeId, {
          parentId: null,
          parentName: freq.codeName,
          color: freq.codeColor,
          children: [freq],
          total: freq.count,
        });
      }
    });

    // Ajouter les enfants à leurs parents
    frequencies.forEach(freq => {
      if (freq.parentId) {
        const parent = parentMap.get(freq.parentId);
        if (parent) {
          parent.children.push(freq);
          parent.total += freq.count;
        } else {
          // Si le parent n'est pas dans la liste (pas d'annotations directes)
          const parentCode = codes.find(c => c.id === freq.parentId);
          if (parentCode) {
            parentMap.set(freq.parentId, {
              parentId: null,
              parentName: parentCode.name,
              color: parentCode.color,
              children: [freq],
              total: freq.count,
            });
          }
        }
      }
    });

    return Array.from(parentMap.values()).map(parent => ({
      ...parent,
      children: parent.children.sort((a, b) => b.count - a.count),
    }));
  }

  private extractWords(text: string, options: {
    minLength: number;
    excludeCommonWords: boolean;
  }): string[] {
    // Nettoyer le texte
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\sÀ-ÿ]/g, ' ') // Garder les lettres et espaces (inclut accents)
      .replace(/\s+/g, ' ')
      .trim();

    // Liste de mots courants à exclure (français et anglais)
    const commonWords = new Set([
      // Français
      'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'à', 'au', 'aux',
      'en', 'dans', 'sur', 'avec', 'pour', 'par', 'est', 'son', 'ses', 'leur',
      'que', 'qui', 'dont', 'où', 'comme', 'mais', 'ou', 'donc', 'car', 'ni', 'or',
      // Anglais
      'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might',
      'must', 'can', 'could', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    ]);

    const words = cleanText.split(' ');
    
    return words
      .filter(word => {
        // Filtrer par longueur minimale
        if (word.length < options.minLength) return false;
        
        // Exclure les mots courants si demandé
        if (options.excludeCommonWords && commonWords.has(word)) return false;
        
        return true;
      })
      .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')); // Supprimer les accents
  }

  private createTimeIntervals(start: Date, end: Date, interval: 'day' | 'week' | 'month'): Date[] {
    const intervals: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
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
    
    return intervals;
  }

  private getIntervalIndex(date: Date, intervals: Date[], interval: 'day' | 'week' | 'month'): number {
    for (let i = 0; i < intervals.length - 1; i++) {
      if (date >= intervals[i] && date < intervals[i + 1]) {
        return i;
      }
    }
    
    // Vérifier le dernier intervalle
    if (date >= intervals[intervals.length - 1]) {
      return intervals.length - 1;
    }
    
    return -1;
  }

  private formatIntervalLabel(start: Date, end: Date): string {
    return start.toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric',
      day: start.getDate() !== 1 ? 'numeric' : undefined,
    });
  }
}

export default new VisualizationService();
