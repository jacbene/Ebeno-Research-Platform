import { prisma } from '../lib/prisma';
import { Reference, Tag } from '@prisma/client';

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
}

export class BibliographyService {
  // Créer une référence
  static async createReference(
    userId: string,
    data: ReferenceInput
  ): Promise<Reference & { tags: Tag[] }> {
    const { tagIds = [], ...referenceData } = data;

    const referenceWithJoin = await prisma.reference.create({
      data: {
        ...referenceData,
        userId,
        tags: {
          create: tagIds.map((tagId: string) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return {
      ...referenceWithJoin,
      tags: referenceWithJoin.tags.map((refTag) => refTag.tag),
    };
  }

  // Importer des références depuis un fichier BibTeX
  static async importFromBibTeX(userId: string, projectId: string, bibtexContent: string): Promise<Reference[]> {
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

      const typeLine = lines[0];
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
  ): Promise<(Reference & { tags: Tag[] })[]> {
    const where: any = {
      userId,
      projectId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { journal: { contains: query, mode: 'insensitive' } },
        { abstract: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (filters?.tags?.length) {
      where.tags = {
        some: {
          tag: { id: { in: filters.tags } },
        },
      };
    }

    if (filters?.yearFrom || filters?.yearTo) {
      where.year = {};
      if (filters.yearFrom) where.year.gte = filters.yearFrom;
      if (filters.yearTo) where.year.lte = filters.yearTo;
    }

    const referencesWithJoin = await prisma.reference.findMany({
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

    return referencesWithJoin.map((ref) => ({
      ...ref,
      tags: ref.tags.map((refTag) => refTag.tag),
    }));
  }

  // Exporter des références en format BibTeX
  static async exportToBibTeX(userId: string, projectId: string, referenceIds?: string[]): Promise<string> {
    const where: any = { userId, projectId };
    if (referenceIds?.length) {
      where.id = { in: referenceIds };
    }

    const referencesWithJoin = await prisma.reference.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const references = referencesWithJoin.map((ref) => ({
        ...ref,
        tags: ref.tags.map((refTag) => refTag.tag),
    }));

    let bibtex = '';
    references.forEach((ref: Reference & { tags: Tag[] }, index: number) => {
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
      if (ref.tags.length > 0) bibtex += `  keywords = {${ref.tags.map(t => t.name).join(', ')}},\n`;
      bibtex += '}\n\n';
    });

    return bibtex;
  }
}
