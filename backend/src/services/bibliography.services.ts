import { prisma } from '../lib/prisma';
import { Reference, Tag } from '@prisma/client';
import { ProjectRole } from '@prisma/client';

interface ReferenceInput {
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
  tagIds?: string[];
}

export class BibliographyService {
  // Créer une référence
  static async createReference(
    userId: string,
    data: ReferenceInput
  ): Promise<Reference & { tags: Tag[] }> {
    const { tagIds = [], ...referenceData } = data;

    const reference = await prisma.reference.create({
      data: {
        ...referenceData,
        userId,
        tags: {
          connect: tagIds.map((id: string) => ({ id })) || [],
        },
      },
      include: {
        tags: true,
      },
    });

    return reference;
  }

  // Importer des références depuis un fichier BibTeX
  static async importFromBibTeX(userId: string, bibtexContent: string): Promise<Reference[]> {
    try {
      // Parser le contenu BibTeX (implémentation simplifiée)
      const references = this.parseBibTeX(bibtexContent);
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
  private static parseBibTeX(content: string): ReferenceInput[] {
    const references: ReferenceInput[] = [];
    const entries = content.split('@');

    for (const entry of entries) {
      if (!entry.trim()) continue;

      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;

      const typeLine = lines[0];
      const reference: ReferenceInput = {
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
              reference.authors = value.split(' and ').map(a => a.trim());
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
    query: string,
    filters?: {
      tags?: string[];
      yearFrom?: number;
      yearTo?: number;
    }
  ): Promise<Reference[]> {
    const where: any = {
      userId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { authors: { hasSome: [query] } },
        { journal: { contains: query, mode: 'insensitive' } },
        { abstract: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (filters?.tags?.length) {
      where.tags = {
        some: {
          id: { in: filters.tags },
        },
      };
    }

    if (filters?.yearFrom || filters?.yearTo) {
      where.year = {};
      if (filters.yearFrom) where.year.gte = filters.yearFrom;
      if (filters.yearTo) where.year.lte = filters.yearTo;
    }

    return prisma.reference.findMany({
      where,
      include: {
        tags: true,
      },
      orderBy: {
        year: 'desc',
      },
    });
  }

  // Exporter des références en format BibTeX
  static async exportToBibTeX(userId: string, referenceIds?: string[]): Promise<string> {
    const where: any = { userId };
    if (referenceIds?.length) {
      where.id = { in: referenceIds };
    }

    const references = await prisma.reference.findMany({
      where,
      include: {
        tags: true,
      },
    });

    let bibtex = '';
    references.forEach((ref: Reference & { tags: Tag[] }, index: number) => {
      bibtex += `@article{ref${index + 1},\n`;
      bibtex += `  title = {${ref.title}},\n`;
      bibtex += `  author = {${ref.authors.join(' and ')}},\n`;
      bibtex += `  year = {${ref.year}},\n`;
      if (ref.journal) bibtex += `  journal = {${ref.journal}},\n`;
      if (ref.volume) bibtex += `  volume = {${ref.volume}},\n`;
      if (ref.issue) bibtex += `  issue = {${ref.issue}},\n`;
      if (ref.pages) bibtex += `  pages = {${ref.pages}},\n`;
      if (ref.doi) bibtex += `  doi = {${ref.doi}},\n`;
      if (ref.url) bibtex += `  url = {${ref.url}},\n`;
      if (ref.abstract) bibtex += `  abstract = {${ref.abstract}},\n`;
      bibtex += '}\n\n';
    });

    return bibtex;
  }
}
