import { prisma } from '../lib/prisma';
import { Reference, Tag, ReferenceTag } from '@prisma/client';

interface ReferenceInput {
  title: string;
  author: string;
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  tagIds?: string[];
  projectId: string;
  userId?: string;
}

type ReferenceWithTags = Reference & { tags: Tag[] };

export class SurveyAnalysisService {
  // Créer une référence
  static async createReference(
    userId: string,
    data: ReferenceInput
  ): Promise<ReferenceWithTags> {
    const { tagIds = [], ...referenceData } = data;

    // Créer la référence d'abord
    const reference = await prisma.reference.create({
      data: {
        ...referenceData,
        userId,
      },
    });

    // Ajouter les tags via la table de jointure si nécessaire
    if (tagIds.length > 0) {
      await prisma.referenceTag.createMany({
        data: tagIds.map(tagId => ({
          referenceId: reference.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Récupérer la référence avec ses tags
    return this.getReferenceWithTags(reference.id);
  }

  // Obtenir une référence avec ses tags
  private static async getReferenceWithTags(referenceId: string): Promise<ReferenceWithTags> {
    const referenceWithTags = await prisma.reference.findUnique({
      where: { id: referenceId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!referenceWithTags) {
      throw new Error('Référence non trouvée');
    }

    // Transformer la structure pour avoir directement les tags
    return {
      ...referenceWithTags,
      tags: referenceWithTags.tags.map(refTag => refTag.tag),
    };
  }

  // Importer des références depuis un fichier BibTeX
  static async importFromBibTeX(
    userId: string, 
    projectId: string, 
    bibtexContent: string
  ): Promise<Reference[]> {
    try {
      const references = this.parseBibTeX(bibtexContent, projectId);
      const createdReferences: Reference[] = [];

      for (const ref of references) {
        const created = await this.createReference(userId, ref);
        createdReferences.push(created);
      }

      return createdReferences;
    } catch (error) {
      console.error('BibTeX import error:', error);
      throw new Error('Échec de l\'importation BibTeX');
    }
  }

  // Parser BibTeX (simplifié)
  private static parseBibTeX(content: string, projectId: string): ReferenceInput[] {
    const references: ReferenceInput[] = [];
    const entries = content.split('@');

    for (const entry of entries) {
      if (!entry.trim()) continue;

      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;

      const reference: ReferenceInput = {
        title: '',
        author: '',
        year: new Date().getFullYear(),
        projectId: projectId,
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
              reference.author = value;
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

  // Rechercher des références
  static async searchReferences(
    userId: string,
    projectId: string,
    query: string,
    filters?: {
      tags?: string[];
      yearFrom?: number;
      yearTo?: number;
    }
  ): Promise<ReferenceWithTags[]> {
    const where: any = {
      projectId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { journal: { contains: query, mode: 'insensitive' } },
        { abstract: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Ajouter le filtre par userId si l'utilisateur n'est pas admin
    // (ajustez selon vos règles d'autorisation)
    // where.userId = userId;

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filters.tags },
        },
      };
    }

    if (filters?.yearFrom || filters?.yearTo) {
      where.year = {};
      if (filters.yearFrom) where.year.gte = filters.yearFrom;
      if (filters.yearTo) where.year.lte = filters.yearTo;
    }

    const references = await prisma.reference.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    });

    // Transformer la structure pour avoir directement les tags
    return references.map(ref => ({
      ...ref,
      tags: ref.tags.map(refTag => refTag.tag),
    }));
  }

  // Exporter des références en format BibTeX
  static async exportToBibTeX(
    userId: string,
    projectId: string,
    referenceIds?: string[]
  ): Promise<string> {
    const where: any = { projectId };
    
    if (referenceIds?.length) {
      where.id = { in: referenceIds };
    }

    const references = await prisma.reference.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    let bibtex = '';
    references.forEach((ref: any, index: number) => {
      bibtex += `@article{ref${index + 1},\n`;
      bibtex += `  title = {${ref.title}},\n`;
      bibtex += `  author = {${ref.author}},\n`;
      bibtex += `  year = {${ref.year}},\n`;
      if (ref.journal) bibtex += `  journal = {${ref.journal}},\n`;
      if (ref.volume) bibtex += `  volume = {${ref.volume}},\n`;
      if (ref.issue) bibtex += `  issue = {${ref.issue}},\n`;
      if (ref.pages) bibtex += `  pages = {${ref.pages}},\n`;
      if (ref.doi) bibtex += `  doi = {${ref.doi}},\n`;
      if (ref.url) bibtex += `  url = {${ref.url}},\n`;
      if (ref.abstract) bibtex += `  abstract = {${ref.abstract}},\n`;
      
      // Transformer les tags en keywords
      const tags = ref.tags.map((refTag: any) => refTag.tag);
      if (tags.length > 0) {
        bibtex += `  keywords = {${tags.map((t: Tag) => t.name).join(', ')}},\n`;
      }
      
      bibtex += '}\n\n';
    });

    return bibtex;
  }

  // Mettre à jour une référence
  static async updateReference(
    referenceId: string,
    data: Partial<ReferenceInput>,
    userId: string
  ): Promise<ReferenceWithTags> {
    const { tagIds, ...updateData } = data;

    // Vérifier que l'utilisateur a le droit de modifier cette référence
    const reference = await prisma.reference.findUnique({
      where: { id: referenceId },
    });

    if (!reference) {
      throw new Error('Référence non trouvée');
    }

    if (reference.userId !== userId) {
      // Ajouter des vérifications d'autorisation supplémentaires si nécessaire
      throw new Error('Non autorisé à modifier cette référence');
    }

    // Mettre à jour la référence
    const updatedReference = await prisma.reference.update({
      where: { id: referenceId },
      data: updateData,
    });

    // Mettre à jour les tags si fournis
    if (tagIds !== undefined) {
      // Supprimer tous les tags existants
      await prisma.referenceTag.deleteMany({
        where: { referenceId },
      });

      // Ajouter les nouveaux tags
      if (tagIds.length > 0) {
        await prisma.referenceTag.createMany({
          data: tagIds.map(tagId => ({
            referenceId,
            tagId,
          })),
        });
      }
    }

    // Récupérer la référence mise à jour avec ses tags
    return this.getReferenceWithTags(referenceId);
  }

  // Supprimer une référence
  static async deleteReference(
    referenceId: string,
    userId: string
  ): Promise<void> {
    const reference = await prisma.reference.findUnique({
      where: { id: referenceId },
    });

    if (!reference) {
      throw new Error('Référence non trouvée');
    }

    if (reference.userId !== userId) {
      // Ajouter des vérifications d'autorisation supplémentaires si nécessaire
      throw new Error('Non autorisé à supprimer cette référence');
    }

    // Supprimer les ReferenceTag associés d'abord (cascade devrait s'en occuper, mais on le fait explicitement)
    await prisma.referenceTag.deleteMany({
      where: { referenceId },
    });

    // Supprimer la référence
    await prisma.reference.delete({
      where: { id: referenceId },
    });
  }

  // Obtenir toutes les références d'un projet avec leurs tags
  static async getProjectReferences(
    projectId: string,
    userId?: string
  ): Promise<ReferenceWithTags[]> {
    const where: any = { projectId };
    
    // Filtrer par utilisateur si spécifié
    if (userId) {
      where.userId = userId;
    }

    const references = await prisma.reference.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    });

    return references.map(ref => ({
      ...ref,
      tags: ref.tags.map(refTag => refTag.tag),
    }));
  }
}

