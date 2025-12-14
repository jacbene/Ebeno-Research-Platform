import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateMemoInput {
  title: string;
  content: string;
  projectId: string;
  codeId?: string;
  documentId?: string;
  transcriptionId?: string;
  annotationId?: string;
  userId: string;
}

interface UpdateMemoInput {
  title?: string;
  content?: string;
  codeId?: string;
  documentId?: string;
  transcriptionId?: string;
  annotationId?: string;
}

interface MemoFilter {
  projectId?: string;
  codeId?: string;
  documentId?: string;
  transcriptionId?: string;
  annotationId?: string;
  userId?: string;
  search?: string;
}

class MemoService {
  // === CRÉATION ===
  
  async createMemo(data: CreateMemoInput) {
    try {
      // Validation des données
      if (!data.title || !data.content) {
        throw new Error('Le titre et le contenu sont requis');
      }

      // Vérifier que le projet existe et que l'utilisateur y a accès
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: data.projectId,
          userId: data.userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à créer des mémos dans ce projet');
      }

      // Vérifier les références (si fournies)
      if (data.codeId) {
        const code = await prisma.code.findFirst({
          where: {
            id: data.codeId,
            projectId: data.projectId,
          },
        });
        if (!code) {
          throw new Error('Le code spécifié n\'existe pas dans ce projet');
        }
      }

      if (data.documentId) {
        const document = await prisma.document.findFirst({
          where: {
            id: data.documentId,
            projectId: data.projectId,
          },
        });
        if (!document) {
          throw new Error('Le document spécifié n\'existe pas dans ce projet');
        }
      }

      if (data.transcriptionId) {
        const transcription = await prisma.transcription.findFirst({
          where: {
            id: data.transcriptionId,
            projectId: data.projectId,
          },
        });
        if (!transcription) {
          throw new Error('La transcription spécifiée n\'existe pas dans ce projet');
        }
      }

      if (data.annotationId) {
        const annotation = await prisma.annotation.findFirst({
          where: {
            id: data.annotationId,
            code: {
              projectId: data.projectId,
            },
          },
        });
        if (!annotation) {
          throw new Error('L\'annotation spécifiée n\'existe pas dans ce projet');
        }
      }

      const memo = await prisma.memo.create({
        data: {
          title: data.title,
          content: data.content,
          projectId: data.projectId,
          codeId: data.codeId,
          documentId: data.documentId,
          transcriptionId: data.transcriptionId,
          annotationId: data.annotationId,
          userId: data.userId,
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          code: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          transcription: {
            select: {
              id: true,
              transcriptText: true,
            },
          },
          annotation: {
            select: {
              id: true,
              selectedText: true,
              code: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
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

      return { success: true, data: memo };
    } catch (error: any) {
      console.error('Error creating memo:', error);
      return { success: false, error: error.message };
    }
  }

  // === LECTURE ===
  
  async getMemos(filter: MemoFilter) {
    try {
      const where: any = {};

      if (filter.projectId) where.projectId = filter.projectId;
      if (filter.codeId) where.codeId = filter.codeId;
      if (filter.documentId) where.documentId = filter.documentId;
      if (filter.transcriptionId) where.transcriptionId = filter.transcriptionId;
      if (filter.annotationId) where.annotationId = filter.annotationId;
      if (filter.userId) where.userId = filter.userId;

      // Recherche textuelle
      if (filter.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { content: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const memos = await prisma.memo.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          code: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          transcription: {
            select: {
              id: true,
              transcriptText: true,
            },
          },
          annotation: {
            select: {
              id: true,
              selectedText: true,
              code: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return { success: true, data: memos };
    } catch (error: any) {
      console.error('Error fetching memos:', error);
      return { success: false, error: error.message };
    }
  }

  async getMemoById(memoId: string, userId: string) {
    try {
      const memo = await prisma.memo.findFirst({
        where: { id: memoId },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          code: {
            select: {
              id: true,
              name: true,
              color: true,
              description: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
            },
          },
          transcription: {
            select: {
              id: true,
              transcriptText: true,
              project: {
                select: {
                  title: true,
                },
              },
            },
          },
          annotation: {
            select: {
              id: true,
              selectedText: true,
              startIndex: true,
              endIndex: true,
              code: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              document: {
                select: {
                  id: true,
                  title: true,
                },
              },
              transcription: {
                select: {
                  id: true,
                  transcriptText: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
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
        },
      });

      if (!memo) {
        throw new Error('Mémo non trouvé');
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: memo.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à accéder à ce mémo');
      }

      return { success: true, data: memo };
    } catch (error: any) {
      console.error('Error fetching memo:', error);
      return { success: false, error: error.message };
    }
  }

  // === MISE À JOUR ===
  
  async updateMemo(memoId: string, data: UpdateMemoInput, userId: string) {
    try {
      // Vérifier que le mémo existe
      const memo = await prisma.memo.findFirst({
        where: { id: memoId },
        include: { project: true },
      });

      if (!memo) {
        throw new Error('Mémo non trouvé');
      }

      // Vérifier que l'utilisateur est l'auteur ou a les droits d'admin
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: memo.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à modifier ce mémo');
      }

      const isAuthor = memo.userId === userId;
      const isEditor = projectMember.role === ProjectRole.EDITOR;

      if (!isAuthor && !isEditor) {
        throw new Error('Seul l\'auteur ou un éditeur peut modifier ce mémo');
      }

      // Vérifier les références (si fournies)
      if (data.codeId && data.codeId !== memo.codeId) {
        const code = await prisma.code.findFirst({
          where: {
            id: data.codeId,
            projectId: memo.projectId,
          },
        });
        if (!code) {
          throw new Error('Le code spécifié n\'existe pas dans ce projet');
        }
      }

      const updatedMemo = await prisma.memo.update({
        where: { id: memoId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          project: true,
          code: true,
          document: true,
          transcription: true,
          annotation: true,
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
        },
      });

      return { success: true, data: updatedMemo };
    } catch (error: any) {
      console.error('Error updating memo:', error);
      return { success: false, error: error.message };
    }
  }

  // === SUPPRESSION ===
  
  async deleteMemo(memoId: string, userId: string) {
    try {
      const memo = await prisma.memo.findFirst({
        where: { id: memoId },
        include: { project: true },
      });

      if (!memo) {
        throw new Error('Mémo non trouvé');
      }

      // Vérifier les permissions
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: memo.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à supprimer ce mémo');
      }

      const isAuthor = memo.userId === userId;
      const isEditor = projectMember.role === ProjectRole.EDITOR;

      if (!isAuthor && !isEditor) {
        throw new Error('Seul l\'auteur ou un éditeur peut supprimer ce mémo');
      }

      await prisma.memo.delete({
        where: { id: memoId },
      });

      return { success: true, message: 'Mémo supprimé avec succès' };
    } catch (error: any) {
      console.error('Error deleting memo:', error);
      return { success: false, error: error.message };
    }
  }

  // === STATISTIQUES ===
  
  async getMemoStatistics(projectId: string, userId: string) {
    try {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à voir les statistiques de ce projet');
      }

      // Nombre total de mémos
      const totalMemos = await prisma.memo.count({
        where: { projectId },
      });

      // Mémos par utilisateur
      const memosByUser = await prisma.memo.groupBy({
        by: ['userId'],
        where: { projectId },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
      });

      // Mémos par type (lié à quoi)
      const memosByType = {
        linkedToCode: await prisma.memo.count({
          where: {
            projectId,
            codeId: { not: null },
          },
        }),
        linkedToDocument: await prisma.memo.count({
          where: {
            projectId,
            documentId: { not: null },
          },
        }),
        linkedToTranscription: await prisma.memo.count({
          where: {
            projectId,
            transcriptionId: { not: null },
          },
        }),
        linkedToAnnotation: await prisma.memo.count({
          where: {
            projectId,
            annotationId: { not: null },
          },
        }),
        standalone: await prisma.memo.count({
          where: {
            projectId,
            codeId: null,
            documentId: null,
            transcriptionId: null,
            annotationId: null,
          },
        }),
      };

      // Derniers mémos
      const recentMemos = await prisma.memo.findMany({
        where: { projectId },
        include: {
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
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      // Récupérer les infos utilisateurs
      const usersWithInfo = await Promise.all(
        memosByUser.map(async (user) => {
          const userInfo = await prisma.user.findFirst({
            where: { id: user.userId },
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });
          
          return {
            userId: user.userId,
            count: user._count.userId,
            name: userInfo?.profile
              ? `${userInfo.profile.firstName} ${userInfo.profile.lastName}`
              : 'Utilisateur inconnu',
          };
        })
      );

      return {
        success: true,
        data: {
          totalMemos,
          memosByUser: usersWithInfo,
          memosByType,
          recentMemos,
        },
      };
    } catch (error: any) {
      console.error('Error fetching memo statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // === RECHERCHE AVANCÉE ===
  
  async searchMemos(projectId: string, query: string, userId: string) {
    try {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à rechercher dans les mémos de ce projet');
      }

      const memos = await prisma.memo.findMany({
        where: {
          projectId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          code: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
            },
          },
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
        },
        orderBy: { updatedAt: 'desc' },
      });

      return { success: true, data: memos };
    } catch (error: any) {
      console.error('Error searching memos:', error);
      return { success: false, error: error.message };
    }
  }

  // === GÉNÉRATION ASSISTÉE PAR IA ===
  
  async generateMemoWithAI(projectId: string, context: any, userId: string) {
    try {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à générer des mémos dans ce projet');
      }

      // Cette fonction utilisera l'API DeepSeek pour générer des suggestions de mémos
      // Pour l'instant, retournons un exemple statique
      const suggestions = {
        title: 'Analyse thématique suggérée',
        content: `Basé sur le contexte fourni, voici quelques pistes d'analyse :
        
## Thèmes identifiés
1. Premier thème majeur
2. Deuxième thème récurrent
3. Troisième élément intéressant

## Points d'attention
- Aspect méthodologique à considérer
- Limites potentielles de l'analyse
- Suggestions pour approfondir

## Questions de recherche émergentes
- Comment X influence-t-il Y ?
- Quelles sont les implications de Z ?`,
      };

      return { success: true, data: suggestions };
    } catch (error: any) {
      console.error('Error generating memo with AI:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new MemoService();
