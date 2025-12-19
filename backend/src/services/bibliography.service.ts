
// src/modules/bibliography/services/reference.service.ts
import { prisma } from '../../../lib/prisma';
import { 
  CreateReferenceInput, 
  UpdateReferenceInput,
  SearchReferencesInput 
} from '../types/reference.types';
import { BibTeXParser } from '../parsers/bibtex.parser';
import { RISParser } from '../parsers/ris.parser';
import { CrossrefAPI } from '../apis/crossref.api';

export class ReferenceService {
  private bibtexParser = new BibTeXParser();
  private risParser = new RISParser();
  private crossrefAPI = new CrossrefAPI();

  async createReference(data: CreateReferenceInput) {
    // Générer une clé de citation si non fournie
    if (!data.citationKey) {
      data.citationKey = this.generateCitationKey(data);
    }
    
    return await prisma.reference.create({
      data: {
        ...data,
        tags: {
          connect: data.tagIds?.map(id => ({ id })) || []
        }
      },
      include: {
        tags: true,
        folder: true,
        attachments: true
      }
    });
  }

  async importBibTeX(content: string, projectId: string, userId: string) {
    const entries = this.bibtexParser.parse(content);
    const references = [];
    
    for (const entry of entries) {
      try {
        // Vérifier les doublons
        const existing = await prisma.reference.findFirst({
          where: {
            OR: [
              { doi: entry.doi },
              { title: entry.title },
              { 
                AND: [
                  { authors: { hasSome: entry.authors } },
                  { year: entry.year }
                ]
              }
            ]
          }
        });
        
        if (!existing) {
          const reference = await prisma.reference.create({
            data: {
              ...entry,
              projectId,
              userId,
              importedFrom: 'bibtex'
            }
          });
          references.push(reference);
        }
      } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
      }
    }
    
    return references;
  }

  async importRIS(content: string, projectId: string, userId: string) {
    const entries = this.risParser.parse(content);
    const references = [];
    
    for (const entry of entries) {
      try {
        const reference = await prisma.reference.create({
          data: {
            ...entry,
            projectId,
            userId,
            importedFrom: 'ris'
          }
        });
        references.push(reference);
      } catch (error) {
        console.error('Erreur lors de l\'importation RIS:', error);
      }
    }
    
    return references;
  }

  async searchReferences(params: SearchReferencesInput) {
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

  async searchCrossref(query: string) {
    return await this.crossrefAPI.search(query);
  }

  private generateCitationKey(data: CreateReferenceInput): string {
    // Logique pour générer une clé de citation unique
    const author = data.authors[0]?.split(' ')[0] || 'Unknown';
    const year = data.year;
    const titleWord = data.title.split(' ')[0].substring(0, 5);
    
    return `${author}${year}${titleWord}`.toLowerCase();
  }
}