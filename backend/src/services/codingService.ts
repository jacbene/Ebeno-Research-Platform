
import { prisma } from '../utils/prisma';

interface CreateCodeInput {
  name: string;
  description?: string;
  color?: string;
  projectId: string;
  parentId?: string;
  userId: string;
}

interface CreateAnnotationInput {
  codeId: string;
  documentId?: string;
  transcriptionId?: string;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  notes?: string;
  userId: string;
}

interface UpdateCodeInput {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
}

class CodingService {
  // === CODES ===
  
  async createCode(data: CreateCodeInput) {
    try {
      // Vérifier que le nom est unique dans le projet
      const existingCode = await prisma.code.findFirst({
        where: {
          projectId: data.projectId,
          name: data.name,
        },
      });

      if (existingCode) {
        throw new Error('Un code avec ce nom existe déjà dans ce projet');
      }

      // Si parentId est fourni, vérifier que le parent existe dans le même projet
      if (data.parentId) {
        const parentCode = await prisma.code.findFirst({
          where: {
            id: data.parentId,
            projectId: data.projectId,
          },
        });

        if (!parentCode) {
          throw new Error('Le code parent n\'existe pas ou n\'appartient pas à ce projet');
        }
      }

      const code = await prisma.code.create({
        data: {
          name: data.name,
          description: data.description,
          color: data.color || '#3b82f6',
          projectId: data.projectId,
          parentId: data.parentId,
          userId: data.userId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              color: true,
              description: true,
            },
          },
        },
      });

      return { success: true, data: code };
    } catch (error: any) {
      console.error('Error creating code:', error);
      return { success: false, error: error.message };
    }
  }

  async getProjectCodes(projectId: string) {
    try {
      const codes = await prisma.code.findMany({
        where: { projectId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              color: true,
              description: true,
              _count: {
                select: {
                  annotations: true,
                },
              },
            },
          },
          _count: {
            select: {
              annotations: true,
            },
          },
        },
        orderBy: [
          { parentId: 'asc' }, // D'abord les codes sans parent
          { name: 'asc' },
        ],
      });

      return { success: true, data: codes };
    } catch (error: any) {
      console.error('Error fetching codes:', error);
      return { success: false, error: error.message };
    }
  }

  async getCodeTree(projectId: string) {
    try {
      const codes = await prisma.code.findMany({
        where: { projectId },
        include: {
          children: {
            include: {
              children: true, // Deux niveaux de profondeur
            },
          },
          _count: {
            select: {
              annotations: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Organiser en arbre
      const rootCodes = codes.filter((code: any) => !code.parentId);
      const codeTree = rootCodes.map((root: any) => ({
        ...root,
        children: codes.filter((code: any) => code.parentId === root.id),
      }));

      return { success: true, data: codeTree };
    } catch (error: any) {
      console.error('Error fetching code tree:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCode(codeId: string, data: UpdateCodeInput, userId: string) {
    try {
      // Vérifier que l'utilisateur a accès au projet du code
      const code = await prisma.code.findFirst({
        where: { id: codeId },
        include: { project: true },
      });

      if (!code) {
        throw new Error('Code non trouvé');
      }

      // Vérifier que l'utilisateur est membre du projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: code.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à modifier ce code');
      }

      // Si changement de parent, vérifier que le nouveau parent existe
      if (data.parentId) {
        const parentCode = await prisma.code.findFirst({
          where: {
            id: data.parentId,
            projectId: code.projectId,
          },
        });

        if (!parentCode) {
          throw new Error('Le code parent n\'existe pas dans ce projet');
        }

        // Empêcher les références circulaires
        if (data.parentId === codeId) {
          throw new Error('Un code ne peut pas être son propre parent');
        }

        // Vérifier que le parent n'est pas un descendant
        const isDescendant = await this.isDescendant(codeId, data.parentId);
        if (isDescendant) {
          throw new Error('Un code ne peut pas être parent de son descendant');
        }
      }

      const updatedCode = await prisma.code.update({
        where: { id: codeId },
        data,
        include: {
          parent: true,
          children: true,
        },
      });

      return { success: true, data: updatedCode };
    } catch (error: any) {
      console.error('Error updating code:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCode(codeId: string, userId: string) {
    try {
      // Vérifier les permissions
      const code = await prisma.code.findFirst({
        where: { id: codeId },
        include: {
          project: true,
          annotations: true,
          children: true,
        },
      });

      if (!code) {
        throw new Error('Code non trouvé');
      }

      // Vérifier que l'utilisateur est membre du projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: code.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à supprimer ce code');
      }

      // Si le code a des enfants, on les remonte au niveau parent
      if (code.children.length > 0) {
        await prisma.code.updateMany({
          where: { parentId: codeId },
          data: { parentId: code.parentId }, // Remonter au grand-parent ou null
        });
      }

      // Supprimer le code
      await prisma.code.delete({
        where: { id: codeId },
      });

      return { success: true, message: 'Code supprimé avec succès' };
    } catch (error: any) {
      console.error('Error deleting code:', error);
      return { success: false, error: error.message };
    }
  }

  // === ANNOTATIONS ===
  
  async createAnnotation(data: CreateAnnotationInput) {
    try {
      // Vérifier que le code existe et appartient au bon projet
      const code = await prisma.code.findFirst({
        where: { id: data.codeId },
        include: { project: true },
      });

      if (!code) {
        throw new Error('Code non trouvé');
      }

      // Vérifier que le document ou la transcription existe
      if (data.documentId) {
        const document = await prisma.document.findFirst({
          where: { id: data.documentId },
        });
        if (!document) {
          throw new Error('Document non trouvé');
        }
      } else if (data.transcriptionId) {
        const transcript = await prisma.transcription.findFirst({
          where: { id: data.transcriptionId },
        });
        if (!transcript) {
          throw new Error('Transcription non trouvée');
        }
      } else {
        throw new Error('Une annotation doit être liée à un document ou une transcription');
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: code.projectId,
          userId: data.userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à annoter dans ce projet');
      }

      const annotation = await prisma.annotation.create({
        data: {
          codeId: data.codeId,
          documentId: data.documentId,
          transcriptionId: data.transcriptionId,
          startIndex: data.startIndex,
          endIndex: data.endIndex,
          selectedText: data.selectedText,
          notes: data.notes,
          userId: data.userId,
        },
        include: {
          code: {
            select: {
              id: true,
              name: true,
              color: true,
              description: true,
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

      return { success: true, data: annotation };
    } catch (error: any) {
      console.error('Error creating annotation:', error);
      return { success: false, error: error.message };
    }
  }

  async getDocumentAnnotations(documentId: string, userId: string) {
    try {
      // Vérifier l'accès au document
      const document = await prisma.document.findFirst({
        where: { id: documentId },
        include: { project: true },
      });

      if (!document) {
        throw new Error('Document non trouvé');
      }

      // Vérifier que l'utilisateur est membre du projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: document.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à voir les annotations de ce document');
      }

      const annotations = await prisma.annotation.findMany({
        where: { documentId },
        include: {
          code: {
            select: {
              id: true,
              name: true,
              color: true,
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
        orderBy: { startIndex: 'asc' },
      });

      return { success: true, data: annotations };
    } catch (error: any) {
      console.error('Error fetching annotations:', error);
      return { success: false, error: error.message };
    }
  }

  async getTranscriptAnnotations(transcriptionId: string, userId: string) {
    try {
      const transcript = await prisma.transcription.findFirst({
        where: { id: transcriptionId },
      });

      if (!transcript || !transcript.projectId) {
        throw new Error('Transcription non trouvée ou non associée à un projet');
      }

      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: transcript.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à voir les annotations de cette transcription');
      }

      const annotations = await prisma.annotation.findMany({
        where: { transcriptionId: transcriptionId },
        include: {
          code: {
            select: {
              id: true,
              name: true,
              color: true,
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
        orderBy: { startIndex: 'asc' },
      });

      return { success: true, data: annotations };
    } catch (error: any) {
      console.error('Error fetching transcript annotations:', error);
      return { success: false, error: error.message };
    }
  }

  async getCodeAnnotations(codeId: string, userId: string) {
    try {
      const code = await prisma.code.findFirst({
        where: { id: codeId },
        include: { project: true },
      });

      if (!code) {
        throw new Error('Code non trouvé');
      }

      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: code.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à voir les annotations de ce code');
      }

      const annotations = await prisma.annotation.findMany({
        where: { codeId },
        include: {
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
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: annotations };
    } catch (error: any) {
      console.error('Error fetching code annotations:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteAnnotation(annotationId: string, userId: string) {
    try {
      const annotation = await prisma.annotation.findFirst({
        where: { id: annotationId },
        include: {
          code: {
            include: { project: true },
          },
        },
      });

      if (!annotation) {
        throw new Error('Annotation non trouvée');
      }

      // Vérifier les permissions : soit l'utilisateur qui a créé l'annotation, soit admin du projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: annotation.code.projectId,
          userId,
        },
      });

      if (!projectMember) {
        throw new Error('Non autorisé à supprimer cette annotation');
      }

      // Vérifier si l'utilisateur est le créateur ou a le rôle EDITOR
      const canDelete = annotation.userId === userId || projectMember.role === 'EDITOR';
      
      if (!canDelete) {
        throw new Error('Seul le créateur ou un éditeur peut supprimer cette annotation');
      }

      await prisma.annotation.delete({
        where: { id: annotationId },
      });

      return { success: true, message: 'Annotation supprimée avec succès' };
    } catch (error: any) {
      console.error('Error deleting annotation:', error);
      return { success: false, error: error.message };
    }
  }

  // === STATISTIQUES ===
  
  async getCodingStatistics(projectId: string, userId: string) {
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

      // Nombre total de codes
      const totalCodes = await prisma.code.count({
        where: { projectId },
      });

      // Nombre total d'annotations
      const totalAnnotations = await prisma.annotation.count({
        where: {
          code: {
            projectId,
          },
        },
      });

      // Codes les plus utilisés
      const topCodes = await prisma.code.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          color: true,
          _count: {
            select: {
              annotations: true,
            },
          },
        },
        orderBy: {
          annotations: {
            _count: 'desc',
          },
        },
        take: 10,
      });

      // Utilisateurs les plus actifs
      const topUsers = await prisma.annotation.groupBy({
        by: ['userId'],
        where: {
          code: {
            projectId,
          },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 5,
      });

      // Récupérer les infos utilisateurs
      const usersWithInfo = await Promise.all(
        topUsers.map(async (user: any) => {
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
          totalCodes,
          totalAnnotations,
          topCodes,
          topUsers: usersWithInfo,
        },
      };
    } catch (error: any) {
      console.error('Error fetching coding statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // === HELPERS ===
  
  private async isDescendant(codeId: string, potentialParentId: string): Promise<boolean> {
    if (codeId === potentialParentId) return false;
    
    let currentParentId: string | null = potentialParentId;
    while (currentParentId) {
      const parent: { parentId: string | null } | null = await prisma.code.findFirst({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      
      if (!parent) return false;
      if (parent.parentId === codeId) return true;
      
      currentParentId = parent.parentId;
    }
    
    return false;
  }
}

export default new CodingService();
