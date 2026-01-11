import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

class MemoService {
  async createMemo(data: any, userId: string) {
    try {
      const member = await prisma.projectMember.findFirst({ 
        where: { 
          projectId: data.projectId, 
          userId 
        } 
      });
      
      if (!member) {
        return { success: false, error: 'Non autorisé' };
      }

      const memoData: any = {
        title: data.title,
        content: data.content,
        projectId: data.projectId,
        userId: userId,
      };

      // Ajouter les relations si elles sont fournies
      if (data.codeId) memoData.codeId = data.codeId;
      if (data.documentId) memoData.documentId = data.documentId;
      if (data.transcriptionId) memoData.transcriptionId = data.transcriptionId;
      if (data.annotationId) memoData.annotationId = data.annotationId;

      const memo = await prisma.memo.create({
        data: memoData,
        include: {
          project: { select: { id: true, title: true } },
          code: { select: { id: true, name: true, color: true } },
          user: { 
            select: { 
              id: true, 
              email: true,
              profile: { select: { firstName: true, lastName: true } } 
            } 
          },
        },
      });

      return { success: true, data: memo };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getMemos(filter: any, userId: string) {
    try {
      const where: any = {};
      
      if (filter.projectId) {
        const member = await prisma.projectMember.findFirst({ 
          where: { 
            projectId: filter.projectId, 
            userId 
          } 
        });
        
        if (!member) {
          return { success: false, error: 'Non autorisé' };
        }
        
        where.projectId = filter.projectId;
      } else {
        // Récupérer tous les projets où l'utilisateur est membre
        const userProjects = await prisma.projectMember.findMany({
          where: { userId },
          select: { projectId: true }
        });
        
        where.projectId = {
          in: userProjects.map(up => up.projectId)
        };
      }

      if (filter.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { content: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      if (filter.codeId) {
        where.codeId = filter.codeId;
      }

      if (filter.userId) {
        where.userId = filter.userId;
      }

      const memos = await prisma.memo.findMany({
        where,
        include: {
          project: { select: { id: true, title: true } },
          user: { 
            select: { 
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } } 
            } 
          },
          code: { select: { id: true, name: true, color: true } },
          document: { select: { id: true, title: true } },
          transcription: { select: { id: true, title: true } },
          annotation: { select: { id: true, selectedText: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Note: Il n'y a pas de modèle Comment, donc pas de commentCount
      return { success: true, data: memos };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getMemoById(memoId: string, userId: string) {
    try {
      const memo = await prisma.memo.findUnique({ 
        where: { id: memoId } 
      });
      
      if (!memo) {
        return { success: false, error: 'Mémo non trouvé' };
      }

      const member = await prisma.projectMember.findFirst({ 
        where: { 
          projectId: memo.projectId, 
          userId 
        } 
      });
      
      if (!member) {
        return { success: false, error: 'Non autorisé' };
      }

      const fullMemo = await prisma.memo.findUnique({
        where: { id: memoId },
        include: {
          project: { select: { id: true, title: true } },
          user: { 
            select: { 
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } } 
            } 
          },
          code: { select: { id: true, name: true, color: true } },
          document: { select: { id: true, title: true } },
          transcription: { select: { id: true, title: true } },
          annotation: { 
            include: {
              code: { select: { id: true, name: true, color: true } }
            }
          },
        },
      });

      return { success: true, data: fullMemo };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMemo(memoId: string, data: any, userId: string) {
    try {
      const memo = await prisma.memo.findUnique({ 
        where: { id: memoId } 
      });
      
      if (!memo) {
        return { success: false, error: 'Non trouvé' };
      }

      const member = await prisma.projectMember.findFirst({ 
        where: { 
          projectId: memo.projectId, 
          userId 
        } 
      });
      
      if (!member || (memo.userId !== userId && 
          member.role !== ProjectRole.OWNER && 
          member.role !== ProjectRole.EDITOR)) {
        return { success: false, error: 'Non autorisé' };
      }

      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      
      // Gérer les relations
      if (data.codeId !== undefined) {
        updateData.codeId = data.codeId;
      }
      
      if (data.documentId !== undefined) {
        updateData.documentId = data.documentId;
      }
      
      if (data.transcriptionId !== undefined) {
        updateData.transcriptionId = data.transcriptionId;
      }
      
      if (data.annotationId !== undefined) {
        updateData.annotationId = data.annotationId;
      }

      const updatedMemo = await prisma.memo.update({
        where: { id: memoId },
        data: updateData,
        include: {
          project: { select: { id: true, title: true } },
          user: { select: { id: true, email: true } },
          code: { select: { id: true, name: true, color: true } },
        },
      });

      return { success: true, data: updatedMemo };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMemo(memoId: string, userId: string) {
    try {
      const memo = await prisma.memo.findUnique({ 
        where: { id: memoId } 
      });
      
      if (!memo) {
        return { success: false, error: 'Non trouvé' };
      }

      const member = await prisma.projectMember.findFirst({ 
        where: { 
          projectId: memo.projectId, 
          userId 
        } 
      });
      
      if (!member || (memo.userId !== userId && member.role !== ProjectRole.OWNER)) {
        return { success: false, error: 'Non autorisé' };
      }

      await prisma.memo.delete({ 
        where: { id: memoId } 
      });

      return { 
        success: true, 
        message: 'Mémo supprimé' 
      };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Méthode pour rechercher des mémos par tags ou catégories
  async searchMemos(filters: {
    projectId: string;
    userId: string;
    query?: string;
    codeIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const { projectId, userId, query, codeIds, dateFrom, dateTo } = filters;
      
      const member = await prisma.projectMember.findFirst({
        where: { projectId, userId }
      });
      
      if (!member) {
        return { success: false, error: 'Non autorisé' };
      }

      const where: any = { projectId };
      
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ];
      }
      
      if (codeIds && codeIds.length > 0) {
        where.codeId = { in: codeIds };
      }
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const memos = await prisma.memo.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          },
          code: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: memos };
    } catch (error: any) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new MemoService();
