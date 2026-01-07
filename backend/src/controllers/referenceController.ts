import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Reference, Tag } from '@prisma/client';

export class ReferenceController {
  // Créer une référence
  async createReference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { title, authors, year, journal, volume, issue, pages, doi, url, abstract, tagIds, projectId } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Validation basique
      if (!title || !authors || !year || !projectId) {
        return res.status(400).json({ 
          message: 'Le titre, les auteurs, l\'année et le projet sont requis' 
        });
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ 
          message: 'Vous n\'avez pas accès à ce projet' 
        });
      }

      // Créer la référence
      const reference = await prisma.reference.create({
        data: {
          title,
          authors,
          year: parseInt(year),
          journal,
          volume,
          issue,
          pages,
          doi,
          url,
          abstract,
          userId,
          projectId,
          tags: {
            connect: (tagIds || []).map((id: string) => ({ id })),
          },
        },
        include: {
          tags: true,
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

      res.status(201).json({
        success: true,
        data: reference,
      });
    } catch (error: any) {
      console.error('Error creating reference:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de la référence',
        error: error.message 
      });
    }
  }

  // Rechercher des références
  async searchReferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { 
        query = '', 
        projectId, 
        tags, 
        yearFrom, 
        yearTo,
        page = 1,
        limit = 20
      } = req.query;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      const where: any = {
        userId,
      };

      if (projectId) {
        where.projectId = projectId as string;
      }

      // Recherche textuelle
      if (query) {
        where.OR = [
          { title: { contains: query as string, mode: 'insensitive' } },
          { authors: { hasSome: [query as string] } },
          { journal: { contains: query as string, mode: 'insensitive' } },
          { abstract: { contains: query as string, mode: 'insensitive' } },
        ];
      }

      // Filtres par tags
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = {
          some: {
            id: { in: tagArray.map(tag => tag as string) },
          },
        };
      }

      // Filtres par année
      if (yearFrom || yearTo) {
        where.year = {};
        if (yearFrom) where.year.gte = parseInt(yearFrom as string);
        if (yearTo) where.year.lte = parseInt(yearTo as string);
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const [references, total] = await Promise.all([
        prisma.reference.findMany({
          where,
          include: {
            tags: true,
            project: {
              select: {
                id: true,
                title: true,
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
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take,
        }),
        prisma.reference.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: references,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error: any) {
      console.error('Error searching references:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la recherche des références',
        error: error.message 
      });
    }
  }

  // Obtenir une référence par ID
  async getReferenceById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      const reference = await prisma.reference.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          tags: true,
          project: {
            select: {
              id: true,
              title: true,
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

      if (!reference) {
        return res.status(404).json({ 
          success: false, 
          message: 'Référence non trouvée' 
        });
      }

      res.status(200).json({
        success: true,
        data: reference,
      });
    } catch (error: any) {
      console.error('Error getting reference:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération de la référence',
        error: error.message 
      });
    }
  }

  // Mettre à jour une référence
  async updateReference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, authors, year, journal, volume, issue, pages, doi, url, abstract, tagIds } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Vérifier que la référence existe et appartient à l'utilisateur
      const existingReference = await prisma.reference.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingReference) {
        return res.status(404).json({ 
          success: false, 
          message: 'Référence non trouvée ou non autorisée' 
        });
      }

      // Mettre à jour la référence
      const updatedReference = await prisma.reference.update({
        where: { id },
        data: {
          title: title || existingReference.title,
          authors: authors || existingReference.authors,
          year: year ? parseInt(year) : existingReference.year,
          journal: journal !== undefined ? journal : existingReference.journal,
          volume: volume !== undefined ? volume : existingReference.volume,
          issue: issue !== undefined ? issue : existingReference.issue,
          pages: pages !== undefined ? pages : existingReference.pages,
          doi: doi !== undefined ? doi : existingReference.doi,
          url: url !== undefined ? url : existingReference.url,
          abstract: abstract !== undefined ? abstract : existingReference.abstract,
          tags: {
            set: tagIds ? (tagIds as string[]).map((tagId: string) => ({ id: tagId })) : undefined,
          },
        },
        include: {
          tags: true,
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

      res.status(200).json({
        success: true,
        data: updatedReference,
      });
    } catch (error: any) {
      console.error('Error updating reference:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour de la référence',
        error: error.message 
      });
    }
  }

  // Supprimer une référence
  async deleteReference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Vérifier que la référence existe et appartient à l'utilisateur
      const existingReference = await prisma.reference.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingReference) {
        return res.status(404).json({ 
          success: false, 
          message: 'Référence non trouvée ou non autorisée' 
        });
      }

      // Supprimer la référence
      await prisma.reference.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Référence supprimée avec succès',
      });
    } catch (error: any) {
      console.error('Error deleting reference:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression de la référence',
        error: error.message 
      });
    }
  }

  // Importer des références depuis BibTeX
  async importReferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { projectId } = req.params;
      const { bibtexContent } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      if (!bibtexContent) {
        return res.status(400).json({ 
          success: false, 
          message: 'Contenu BibTeX requis' 
        });
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ 
          success: false, 
          message: 'Vous n\'avez pas accès à ce projet' 
        });
      }

      // Parser BibTeX (version simplifiée)
      const references = this.parseBibTeX(bibtexContent);
      const createdReferences = [];

      for (const ref of references) {
        const created = await prisma.reference.create({
          data: {
            title: ref.title,
            authors: ref.authors,
            year: ref.year,
            journal: ref.journal,
            volume: ref.volume,
            issue: ref.issue,
            pages: ref.pages,
            doi: ref.doi,
            url: ref.url,
            abstract: ref.abstract,
            userId,
            projectId,
          },
        });
        createdReferences.push(created);
      }

      res.status(201).json({
        success: true,
        message: `${createdReferences.length} référence(s) importée(s) avec succès`,
        data: createdReferences,
      });
    } catch (error: any) {
      console.error('Error importing references:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'importation des références',
        error: error.message 
      });
    }
  }

  // Parser BibTeX (version simplifiée)
  private parseBibTeX(content: string): Array<{
    title: string;
    authors: string[];
    year: number;
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
    abstract?: string;
  }> {
    const references = [];
    const entries = content.split('@');

    for (const entry of entries) {
      if (!entry.trim()) continue;

      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;

      const reference: any = {
        title: '',
        authors: [],
        year: new Date().getFullYear(),
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim().replace(/[{}",]/g, '');

          switch (key.trim().toLowerCase()) {
            case 'title':
              reference.title = value;
              break;
            case 'author':
              reference.authors = value.split(' and ').map((a: string) => a.trim());
              break;
            case 'year':
              reference.year = parseInt(value) || new Date().getFullYear();
              break;
            case 'journal':
              reference.journal = value;
              break;
            case 'volume':
              reference.volume = value;
              break;
            case 'issue':
              reference.issue = value;
              break;
            case 'pages':
              reference.pages = value;
              break;
            case 'doi':
              reference.doi = value;
              break;
            case 'url':
              reference.url = value;
              break;
            case 'abstract':
              reference.abstract = value;
              break;
          }
        }
      }

      if (reference.title) {
        references.push(reference);
      }
    }

    return references;
  }
}

export default new ReferenceController();
