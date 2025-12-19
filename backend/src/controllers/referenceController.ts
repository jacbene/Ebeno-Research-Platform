// backend/controllers/referenceController.ts
// URL: /api/references
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  createReferenceSchema, 
  updateReferenceSchema,
  importBibTeXSchema,
  generateBibliographySchema 
} from '../validators/reference.validator';

export class ReferenceController {
  // Créer une référence manuelle
  async createReference(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const data = createReferenceSchema.parse(req.body);
      
      const reference = await prisma.reference.create({
        data: {
          ...data,
          userId,
          importedFrom: 'manual'
        }
      });
      
      res.status(201).json({
        success: true,
        data: reference
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Importer des références depuis un fichier
  async importReferences(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const projectId = req.params.projectId;
      const { format, content } = importBibTeXSchema.parse(req.body);
      
      const references = await this.importFromFormat(
        format, 
        content, 
        projectId, 
        userId
      );
      
      res.status(200).json({
        success: true,
        data: {
          imported: references.length,
          references
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Rechercher des références
  async searchReferences(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const projectId = req.params.projectId;
      const {
        query,
        yearFrom,
        yearTo,
        type,
        folderId,
        tagIds,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const result = await this.searchReferencesInDatabase({
        userId,
        projectId,
        query: query as string,
        yearFrom: yearFrom ? parseInt(yearFrom as string) : undefined,
        yearTo: yearTo ? parseInt(yearTo as string) : undefined,
        type: type as string,
        folderId: folderId as string,
        tagIds: tagIds ? (tagIds as string).split(',') : [],
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir une référence par ID
  async getReferenceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const reference = await prisma.reference.findUnique({
        where: { id },
        include: {
          tags: true,
          folder: true,
          attachments: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!reference) {
        return res.status(404).json({
          success: false,
          error: 'Référence non trouvée'
        });
      }
      
      res.status(200).json({
        success: true,
        data: reference
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Mettre à jour une référence
  async updateReference(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const data = updateReferenceSchema.parse(req.body);
      
      // Vérifier que l'utilisateur est le propriétaire
      const existing = await prisma.reference.findUnique({
        where: { id }
      });
      
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Référence non trouvée'
        });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }
      
      const reference = await prisma.reference.update({
        where: { id },
        data: {
          ...data,
          tags: data.tagIds ? {
            set: data.tagIds.map(tagId => ({ id: tagId }))
          } : undefined
        },
        include: {
          tags: true,
          folder: true
        }
      });
      
      res.status(200).json({
        success: true,
        data: reference
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Supprimer une référence
  async deleteReference(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Vérifier que l'utilisateur est le propriétaire
      const existing = await prisma.reference.findUnique({
        where: { id }
      });
      
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Référence non trouvée'
        });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }
      
      await prisma.reference.delete({
        where: { id }
      });
      
      res.status(200).json({
        success: true,
        message: 'Référence supprimée'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Méthodes privées
  private async importFromFormat(
    format: string, 
    content: string, 
    projectId: string, 
    userId: string
  ) {
    // Implémentation simplifiée
    if (format === 'bibtex') {
      return this.parseBibTeX(content, projectId, userId);
    } else if (format === 'ris') {
      return this.parseRIS(content, projectId, userId);
    }
    throw new Error('Format non supporté');
  }

  private async parseBibTeX(content: string, projectId: string, userId: string) {
    // Parser BibTeX simple
    const entries: any[] = [];
    const lines = content.split('\n');
    
    // Logique de parsing simplifiée
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@')) {
        // Détecter une nouvelle entrée
        const match = line.match(/@(\w+)\{([^,]+),/);
        if (match) {
          const entry: any = {
            type: this.mapBibTeXType(match[1]),
            citationKey: match[2],
            projectId,
            userId,
            importedFrom: 'bibtex'
          };
          
          // Parser les champs suivants
          for (let j = i + 1; j < lines.length; j++) {
            const fieldLine = lines[j].trim();
            if (fieldLine === '}') break;
            
            const fieldMatch = fieldLine.match(/(\w+)\s*=\s*{([^}]+)}/);
            if (fieldMatch) {
              const [, key, value] = fieldMatch;
              this.parseBibTeXField(key, value, entry);
            }
          }
          
          entries.push(entry);
        }
      }
    }
    
    // Insérer dans la base de données
    const createdEntries = [];
    for (const entry of entries) {
      const created = await prisma.reference.create({
        data: entry
      });
      createdEntries.push(created);
    }
    
    return createdEntries;
  }

  private parseBibTeXField(key: string, value: string, entry: any) {
    switch (key.toLowerCase()) {
      case 'title':
        entry.title = value;
        break;
      case 'author':
        entry.authors = value.split(' and ').map((a: string) => a.trim());
        break;
      case 'year':
        entry.year = parseInt(value) || new Date().getFullYear();
        break;
      case 'journal':
        entry.journal = value;
        break;
      case 'doi':
        entry.doi = value;
        break;
    }
  }

  private mapBibTeXType(bibtexType: string): string {
    const typeMap: Record<string, string> = {
      'article': 'ARTICLE',
      'book': 'BOOK',
      'inproceedings': 'CONFERENCE'
    };
    return typeMap[bibtexType.toLowerCase()] || 'OTHER';
  }

  private async parseRIS(content: string, projectId: string, userId: string) {
    // Parser RIS simplifié
    const entries: any[] = [];
    const lines = content.split('\n');
    let currentEntry: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('TY')) {
        if (Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry);
          currentEntry = {};
        }
        currentEntry.type = this.mapRISType(trimmed.substring(3));
      } else if (trimmed.startsWith('T1')) {
        currentEntry.title = trimmed.substring(3);
      } else if (trimmed.startsWith('AU')) {
        if (!currentEntry.authors) currentEntry.authors = [];
        currentEntry.authors.push(trimmed.substring(3));
      } else if (trimmed.startsWith('PY')) {
        currentEntry.year = parseInt(trimmed.substring(3)) || new Date().getFullYear();
      }
    }
    
    if (Object.keys(currentEntry).length > 0) {
      entries.push(currentEntry);
    }
    
    // Insérer dans la base de données
    const createdEntries = [];
    for (const entry of entries) {
      const created = await prisma.reference.create({
        data: {
          ...entry,
          projectId,
          userId,
          importedFrom: 'ris'
        }
      });
      createdEntries.push(created);
    }
    
    return createdEntries;
  }

  private mapRISType(risType: string): string {
    const typeMap: Record<string, string> = {
      'JOUR': 'ARTICLE',
      'BOOK': 'BOOK',
      'CHAP': 'CHAPTER'
    };
    return typeMap[risType] || 'OTHER';
  }

  private async searchReferencesInDatabase(params: any) {
    const {
      userId,
      projectId,
      query,
      yearFrom,
      yearTo,
      type,
      folderId,
      tagIds,
      page,
      limit,
      sortBy,
      sortOrder
    } = params;
    
    const skip = (page - 1) * limit;
    
    const where: any = {
      projectId,
      OR: [
        { userId },
        { project: { collaborators: { some: { userId } } } }
      ]
    };
    
    // Filtres
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { authors: { has: query } },
        { abstract: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    if (yearFrom || yearTo) {
      where.year = {};
      if (yearFrom) where.year.gte = yearFrom;
      if (yearTo) where.year.lte = yearTo;
    }
    
    if (type) where.type = type;
    if (folderId) where.folderId = folderId;
    
    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          id: { in: tagIds }
        }
      };
    }
    
    // Compter le total
    const total = await prisma.reference.count({ where });
    
    // Obtenir les résultats
    const references = await prisma.reference.findMany({
      where,
      include: {
        tags: true,
        folder: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limit
    });
    
    return {
      references,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: (page * limit) < total
      }
    };
  }
}

export default new ReferenceController();
