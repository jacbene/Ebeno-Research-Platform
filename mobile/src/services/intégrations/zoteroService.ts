// backend/services/integrations/zoteroService.ts
// Service d'intégration avec Zotero
import axios from 'axios';
import { prisma } from '../../lib/prisma';

interface ZoteroConfig {
  apiKey: string;
  userId: string;
  libraryType: 'user' | 'group';
  libraryId: string;
}

export class ZoteroService {
  private baseURL = 'https://api.zotero.org';
  
  // Synchroniser les références avec Zotero
  async syncReferences(userId: string, config: ZoteroConfig) {
    try {
      // Récupérer les collections Zotero
      const collections = await this.getZoteroCollections(config);
      
      // Synchroniser chaque collection
      const results = [];
      for (const collection of collections) {
        const result = await this.syncCollection(collection, config, userId);
        results.push(result);
      }
      
      return {
        success: true,
        data: {
          syncedCollections: collections.length,
          totalReferences: results.reduce((sum, r) => sum + r.syncedCount, 0),
          collections: results
        }
      };
    } catch (error) {
      console.error('Erreur de synchronisation Zotero:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Exporter des références vers Zotero
  async exportToZotero(referenceIds: string[], config: ZoteroConfig) {
    try {
      // Récupérer les références depuis la base de données
      const references = await prisma.reference.findMany({
        where: {
          id: { in: referenceIds }
        }
      });
      
      // Convertir au format Zotero
      const zoteroItems = references.map(ref => this.convertToZoteroItem(ref));
      
      // Envoyer à Zotero
      const results = [];
      for (const item of zoteroItems) {
        const result = await this.createZoteroItem(item, config);
        results.push(result);
      }
      
      return {
        success: true,
        data: {
          exported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          details: results
        }
      };
    } catch (error) {
      console.error('Erreur d\'export Zotero:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Importer des références depuis Zotero
  async importFromZotero(config: ZoteroConfig, userId: string, projectId?: string) {
    try {
      // Récupérer les items Zotero
      const zoteroItems = await this.getZoteroItems(config);
      
      // Convertir au format Ebeno
      const references = zoteroItems.map(item => 
        this.convertFromZoteroItem(item, userId, projectId)
      );
      
      // Importer dans la base de données
      const imported = [];
      for (const ref of references) {
        try {
          // Vérifier si la référence existe déjà
          const existing = await this.findExistingReference(ref);
          
          if (!existing) {
            const created = await prisma.reference.create({
              data: ref
            });
            imported.push(created);
          }
        } catch (error) {
          console.error('Erreur d\'importation d\'une référence:', error);
        }
      }
      
      return {
        success: true,
        data: {
          imported: imported.length,
          skipped: references.length - imported.length,
          references: imported
        }
      };
    } catch (error) {
      console.error('Erreur d\'import Zotero:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Méthodes privées
  private async getZoteroCollections(config: ZoteroConfig) {
    const url = `${this.baseURL}/${config.libraryType}s/${config.libraryId}/collections`;
    
    const response = await axios.get(url, {
      headers: this.getHeaders(config.apiKey)
    });
    
    return response.data;
  }
  
  private async getZoteroItems(config: ZoteroConfig, collectionKey?: string) {
    let url = `${this.baseURL}/${config.libraryType}s/${config.libraryId}/items`;
    
    if (collectionKey) {
      url = `${this.baseURL}/${config.libraryType}s/${config.libraryId}/collections/${collectionKey}/items`;
    }
    
    const response = await axios.get(url, {
      headers: this.getHeaders(config.apiKey),
      params: {
        format: 'json',
        include: 'data,bib,citation',
        limit: 100
      }
    });
    
    return response.data;
  }
  
  private async syncCollection(collection: any, config: ZoteroConfig, userId: string) {
    const items = await this.getZoteroItems(config, collection.key);
    
    const imported = [];
    for (const item of items) {
      if (item.data.itemType !== 'note' && item.data.itemType !== 'attachment') {
        const reference = this.convertFromZoteroItem(item, userId);
        try {
          const existing = await this.findExistingReference(reference);
          if (!existing) {
            const created = await prisma.reference.create({
              data: reference
            });
            imported.push(created);
          }
        } catch (error) {
          console.error('Erreur de synchronisation d\'un item:', error);
        }
      }
    }
    
    return {
      collection: collection.data.name,
      totalItems: items.length,
      syncedCount: imported.length,
      references: imported
    };
  }
  
  private async createZoteroItem(item: any, config: ZoteroConfig) {
    const url = `${this.baseURL}/${config.libraryType}s/${config.libraryId}/items`;
    
    try {
      const response = await axios.post(url, [item], {
        headers: {
          ...this.getHeaders(config.apiKey),
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        itemKey: response.data.successful['0'].key,
        title: item.title
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        title: item.title
      };
    }
  }
  
  private convertToZoteroItem(reference: any) {
    const itemType = this.mapReferenceType(reference.type);
    
    return {
      itemType,
      title: reference.title,
      creators: reference.authors.map((author: string) => ({
        creatorType: 'author',
        firstName: author.split(' ')[0],
        lastName: author.split(' ').slice(1).join(' ')
      })),
      date: reference.year?.toString(),
      publicationTitle: reference.journal,
      publisher: reference.publisher,
      volume: reference.volume,
      issue: reference.issue,
      pages: reference.pages,
      DOI: reference.doi,
      ISBN: reference.isbn,
      ISSN: reference.issn,
      url: reference.url,
      abstractNote: reference.abstract,
      tags: reference.tags?.map((tag: any) => ({ tag: tag.name })),
      collections: [],
      relations: {}
    };
  }
  
  private convertFromZoteroItem(zoteroItem: any, userId: string, projectId?: string) {
    const data = zoteroItem.data;
    
    // Extraire les auteurs
    const authors = data.creators
      ?.filter((creator: any) => creator.creatorType === 'author')
      .map((creator: any) => `${creator.firstName || ''} ${creator.lastName || ''}`.trim())
      || [];
    
    // Déterminer le type
    const type = this.mapZoteroItemType(data.itemType);
    
    return {
      title: data.title || 'Sans titre',
      authors,
      year: data.date ? parseInt(data.date.substring(0, 4)) : null,
      type,
      journal: data.publicationTitle,
      publisher: data.publisher,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      abstract: data.abstractNote,
      doi: data.DOI,
      isbn: data.ISBN,
      issn: data.ISSN,
      url: data.url,
      citationKey: data.key,
      importedFrom: 'zotero',
      zoteroKey: data.key,
      zoteroVersion: data.version,
      userId,
      projectId,
      tags: data.tags?.map((tag: any) => ({ name: tag.tag })) || []
    };
  }
  
  private async findExistingReference(reference: any) {
    // Chercher par DOI
    if (reference.doi) {
      const byDOI = await prisma.reference.findFirst({
        where: { doi: reference.doi }
      });
      if (byDOI) return byDOI;
    }
    
    // Chercher par titre et auteurs
    const byTitle = await prisma.reference.findFirst({
      where: {
        title: reference.title,
        authors: { hasSome: reference.authors }
      }
    });
    
    return byTitle;
  }
  
  private mapReferenceType(type: string): string {
    const typeMap: Record<string, string> = {
      'ARTICLE': 'journalArticle',
      'BOOK': 'book',
      'CHAPTER': 'bookSection',
      'THESIS': 'thesis',
      'CONFERENCE': 'conferencePaper',
      'REPORT': 'report',
      'WEBPAGE': 'webpage'
    };
    
    return typeMap[type] || 'document';
  }
  
  private mapZoteroItemType(itemType: string): string {
    const typeMap: Record<string, string> = {
      'journalArticle': 'ARTICLE',
      'book': 'BOOK',
      'bookSection': 'CHAPTER',
      'thesis': 'THESIS',
      'conferencePaper': 'CONFERENCE',
      'report': 'REPORT',
      'webpage': 'WEBPAGE',
      'document': 'OTHER'
    };
    
    return typeMap[itemType] || 'OTHER';
  }
  
  private getHeaders(apiKey: string) {
    return {
      'Zotero-API-Key': apiKey,
      'Zotero-API-Version': '3',
      'Accept': 'application/json'
    };
  }
}

export const zoteroService = new ZoteroService();
