// backend/services/integrations/googleScholarService.ts
// Service d'intégration avec Google Scholar
import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../../lib/prisma';

export class GoogleScholarService {
  
  // Rechercher des articles sur Google Scholar
  async searchArticles(query: string, options: {
    limit?: number;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: 'relevance' | 'date';
  } = {}) {
    try {
      const {
        limit = 20,
        yearFrom,
        yearTo,
        sortBy = 'relevance'
      } = options;
      
      // Construire l'URL de recherche
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      searchParams.set('hl', 'fr');
      searchParams.set('as_sdt', '0,5');
      searchParams.set('as_ylo', yearFrom?.toString() || '');
      searchParams.set('as_yhi', yearTo?.toString() || '');
      
      if (sortBy === 'date') {
        searchParams.set('scisbd', '1');
      }
      
      const url = `https://scholar.google.com/scholar?${searchParams.toString()}`;
      
      // Faire la requête
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Parser les résultats
      const results = this.parseSearchResults(response.data, limit);
      
      return {
        success: true,
        data: {
          query,
          totalResults: results.length,
          results
        }
      };
    } catch (error) {
      console.error('Erreur de recherche Google Scholar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Obtenir les citations d'un article
  async getArticleCitations(articleId: string) {
    try {
      const url = `https://scholar.google.com/scholar?cites=${articleId}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const citations = this.parseCitationResults(response.data);
      
      return {
        success: true,
        data: {
          articleId,
          citationCount: citations.length,
          citations
        }
      };
    } catch (error) {
      console.error('Erreur de récupération des citations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Obtenir les informations détaillées d'un article
  async getArticleDetails(scholarUrl: string) {
    try {
      const response = await axios.get(scholarUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const details = this.parseArticleDetails(response.data);
      
      return {
        success: true,
        data: details
      };
    } catch (error) {
      console.error('Erreur de récupération des détails:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Méthodes privées
  private parseSearchResults(html: string, limit: number) {
    const $ = cheerio.load(html);
    const results: any[] = [];
    
    $('.gs_r.gs_or.gs_scl').each((index, element) => {
      if (results.length >= limit) return false;
      
      const result = this.parseResultElement($, element);
      if (result) {
        results.push(result);
      }
    });
    
    return results;
  }
  
  private parseResultElement($: cheerio.CheerioAPI, element: cheerio.Element) {
    const titleElement = $(element).find('.gs_rt a');
    const title = titleElement.text().trim();
    const url = titleElement.attr('href');
    
    if (!title || !url) return null;
    
    const authorsElement = $(element).find('.gs_a');
    const authorsText = authorsElement.text().trim();
    const authors = this.extractAuthors(authorsText);
    
    const snippetElement = $(element).find('.gs_rs');
    const snippet = snippetElement.text().trim();
    
    const citationElement = $(element).find('.gs_fl a');
    const citationInfo = this.extractCitationInfo(citationElement.text());
    
    // Extraire l'année
    const yearMatch = authorsText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;
    
    // Extraire le journal/conférence
    const journal = this.extractJournal(authorsText);
    
    // Trouver l'ID Google Scholar
    const scholarId = this.extractScholarId($(element));
    
    return {
      title,
      url,
      authors,
      year,
      journal,
      snippet,
      citationCount: citationInfo.citationCount,
      relatedArticlesUrl: citationInfo.relatedUrl,
      scholarId,
      pdfUrl: this.extractPdfUrl($, element)
    };
  }
  
  private parseCitationResults(html: string) {
    const $ = cheerio.load(html);
    const citations: any[] = [];
    
    $('.gs_r.gs_or.gs_scl').each((index, element) => {
      const citation = this.parseResultElement($, element);
      if (citation) {
        citations.push(citation);
      }
    });
    
    return citations;
  }
  
  private parseArticleDetails(html: string) {
    const $ = cheerio.load(html);
    
    const title = $('#gsc_oci_title').text().trim();
    const authors = $('#gsc_oci_table .gs_scl:contains("Auteurs") .gsc_oci_value').text().trim();
    const journal = $('#gsc_oci_table .gs_scl:contains("Publication") .gsc_oci_value').text().trim();
    const date = $('#gsc_oci_table .gs_scl:contains("Date") .gsc_oci_value').text().trim();
    const volume = $('#gsc_oci_table .gs_scl:contains("Volume") .gsc_oci_value').text().trim();
    const issue = $('#gsc_oci_table .gs_scl:contains("Numéro") .gsc_oci_value').text().trim();
    const pages = $('#gsc_oci_table .gs_scl:contains("Pages") .gsc_oci_value').text().trim();
    const publisher = $('#gsc_oci_table .gs_scl:contains("Éditeur") .gsc_oci_value').text().trim();
    const description = $('#gsc_oci_table .gs_scl:contains("Description") .gsc_oci_value').text().trim();
    const citationCount = $('#gsc_oci_table .gs_scl:contains("Citations") .gsc_oci_value').text().trim();
    const url = $('#gsc_oci_table .gs_scl:contains("URL") .gsc_oci_value a').attr('href');
    const doi = $('#gsc_oci_table .gs_scl:contains("DOI") .gsc_oci_value').text().trim();
    
    return {
      title,
      authors: authors.split(',').map((a: string) => a.trim()),
      journal,
      date,
      volume,
      issue,
      pages,
      publisher,
      description,
      citationCount: parseInt(citationCount) || 0,
      url,
      doi
    };
  }
  
  private extractAuthors(text: string): string[] {
    // Format: "Auteur1, Auteur2, Auteur3 - Journal, 2020"
    const parts = text.split(' - ');
    if (parts.length > 0) {
      return parts[0].split(',').map(a => a.trim());
    }
    return [];
  }
  
  private extractJournal(text: string): string {
    const parts = text.split(' - ');
    if (parts.length > 1) {
      // Enlever l'année à la fin
      const journalPart = parts[1].replace(/\b(19|20)\d{2}\b.*$/, '').trim();
      return journalPart.replace(/,$/, '');
    }
    return '';
  }
  
  private extractCitationInfo(text: string) {
    const citationMatch = text.match(/(\d+)\s*citations?/);
    const relatedMatch = text.match(/Articles liés/);
    
    return {
      citationCount: citationMatch ? parseInt(citationMatch[1]) : 0,
      relatedUrl: relatedMatch ? 'https://scholar.google.com' + text.match(/href="([^"]+)"/)?.[1] : null
    };
  }
  
  private extractScholarId(element: cheerio.Cheerio) {
    const onclick = element.find('.gs_rt a').attr('onclick');
    if (onclick) {
      const match = onclick.match(/cites=(\d+)/);
      if (match) return match[1];
    }
    return null;
  }
  
  private extractPdfUrl($: cheerio.CheerioAPI, element: cheerio.Element) {
    const pdfLink = $(element).find('.gs_or_ggsm a');
    if (pdfLink.length) {
      return pdfLink.attr('href');
    }
    return null;
  }
  
  // Convertir un résultat Google Scholar en référence Ebeno
  async convertToReference(scholarResult: any, userId: string, projectId?: string) {
    const reference = {
      title: scholarResult.title,
      authors: scholarResult.authors,
      year: scholarResult.year,
      journal: scholarResult.journal,
      url: scholarResult.url,
      abstract: scholarResult.snippet,
      citationCount: scholarResult.citationCount,
      scholarId: scholarResult.scholarId,
      importedFrom: 'google_scholar',
      userId,
      projectId
    };
    
    // Essayer d'obtenir plus de détails
    if (scholarResult.url && scholarResult.url.includes('scholar.google.com')) {
      try {
        const details = await this.getArticleDetails(scholarResult.url);
        if (details.success) {
          Object.assign(reference, {
            doi: details.data.doi,
            volume: details.data.volume,
            issue: details.data.issue,
            pages: details.data.pages,
            publisher: details.data.publisher
          });
        }
      } catch (error) {
        // Ignorer les erreurs de détails
      }
    }
    
    return reference;
  }
  
  // Recherche et import automatique
  async searchAndImport(query: string, userId: string, projectId?: string, options?: any) {
    const searchResult = await this.searchArticles(query, options);
    
    if (!searchResult.success) {
      return searchResult;
    }
    
    const imported = [];
    for (const result of searchResult.data.results) {
      try {
        const reference = await this.convertToReference(result, userId, projectId);
        
        // Vérifier les doublons
        const existing = await this.findExistingReference(reference);
        if (!existing) {
          const created = await prisma.reference.create({
            data: reference
          });
          imported.push(created);
        }
      } catch (error) {
        console.error('Erreur d\'importation:', error);
      }
    }
    
    return {
      success: true,
      data: {
        query,
        found: searchResult.data.results.length,
        imported: imported.length,
        references: imported
      }
    };
  }
  
  private async findExistingReference(reference: any) {
    // Chercher par titre et auteurs
    const byTitle = await prisma.reference.findFirst({
      where: {
        title: reference.title,
        authors: { hasSome: reference.authors }
      }
    });
    
    if (byTitle) return byTitle;
    
    // Chercher par DOI
    if (reference.doi) {
      const byDOI = await prisma.reference.findFirst({
        where: { doi: reference.doi }
      });
      if (byDOI) return byDOI;
    }
    
    // Chercher par URL
    if (reference.url) {
      const byURL = await prisma.reference.findFirst({
        where: { url: reference.url }
      });
      if (byURL) return byURL;
    }
    
    return null;
  }
}

export const googleScholarService = new GoogleScholarService();
