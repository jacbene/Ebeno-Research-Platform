
// backend/services/writingAssistantService.ts
// Service d'assistance à la rédaction scientifique avec IA
import { deepseekAPI } from './deepseekService';

export class WritingAssistantService {
  
  // Analyser la structure d'un document
  async analyzeDocumentStructure(content: string, documentType: string) {
    const prompt = `
      Analyser la structure du document scientifique suivant:
      
      Type de document: ${documentType}
      
      Contenu:
      ${content.substring(0, 5000)}...
      
      Veuillez analyser:
      1. La présence des sections standard
      2. La qualité de l'organisation
      3. Les lacunes structurelles
      4. Des suggestions d'amélioration
      
      Retourner au format JSON.
    `;
    
    try {
      const response = await deepseekAPI.analyzeText(prompt);
      return this.parseStructureAnalysis(response);
    } catch (error) {
      console.error('Erreur dans l\'analyse structurelle:', error);
      return this.getDefaultStructureAnalysis(documentType);
    }
  }
  
  // Vérifier les conventions académiques
  async checkAcademicConventions(content: string, style: string = 'APA') {
    const prompt = `
      Vérifier les conventions académiques ${style} dans le texte suivant:
      
      ${content.substring(0, 3000)}
      
      Veuillez vérifier:
      1. Les citations et références
      2. Le formatage des titres et sous-titres
      3. L'utilisation des abréviations
      4. Le style d'écriture académique
      5. La terminologie spécifique au domaine
      
      Retourner les problèmes détectés avec suggestions de correction.
    `;
    
    try {
      const response = await deepseekAPI.analyzeText(prompt);
      return this.parseConventionCheck(response);
    } catch (error) {
      console.error('Erreur dans la vérification des conventions:', error);
      return { issues: [], suggestions: [] };
    }
  }
  
  // Générer un template de section
  async generateSectionTemplate(sectionType: string, topic: string, requirements: any) {
    const prompt = `
      Générer un template pour la section "${sectionType}" d'un article scientifique.
      
      Sujet: ${topic}
      
      Exigences spécifiques:
      - Longueur: ${requirements.length || 'standard'}
      - Style: ${requirements.style || 'académique'}
      - Format: ${requirements.format || 'APA'}
      ${requirements.keyPoints ? `- Points clés à inclure: ${requirements.keyPoints}` : ''}
      
      Veuillez fournir:
      1. Une structure détaillée de la section
      2. Des exemples de phrases d'introduction
      3. Des conseils pour le développement
      4. Des phrases de transition recommandées
    `;
    
    try {
      const response = await deepseekAPI.generateText(prompt);
      return {
        template: response,
        structure: this.extractSectionStructure(response),
        examples: this.extractExamples(response)
      };
    } catch (error) {
      console.error('Erreur dans la génération de template:', error);
      return this.getDefaultTemplate(sectionType);
    }
  }
  
  // Améliorer le style d'écriture
  async improveWritingStyle(text: string, targetStyle: string = 'academic') {
    const prompt = `
      Améliorer le style d'écriture du texte suivant pour un public académique:
      
      Texte original:
      ${text}
      
      Veuillez:
      1. Améliorer la clarté et la précision
      2. Corriger les formulations trop informelles
      3. Optimiser la structure des phrases
      4. Suggérer des alternatives pour les répétitions
      
      Retourner le texte amélioré avec des annotations des changements.
    `;
    
    try {
      const response = await deepseekAPI.analyzeText(prompt);
      return {
        improvedText: this.extractImprovedText(response),
        changes: this.extractChanges(response),
        suggestions: this.extractStyleSuggestions(response)
      };
    } catch (error) {
      console.error('Erreur dans l\'amélioration du style:', error);
      return { improvedText: text, changes: [], suggestions: [] };
    }
  }
  
  // Générer un résumé/abstract
  async generateAbstract(content: string, length: string = 'standard') {
    const prompt = `
      Générer un abstract académique à partir du contenu suivant:
      
      ${content.substring(0, 8000)}
      
      Longueur: ${length}
      Format: IMRaD (Introduction, Méthodes, Résultats, Discussion)
      Style: Académique, concis
      
      Inclure:
      1. Contexte et objectifs
      2. Méthodologie
      3. Résultats principaux
      4. Conclusions et implications
    `;
    
    try {
      const response = await deepseekAPI.generateText(prompt);
      return {
        abstract: response,
        wordCount: response.split(' ').length,
        sections: this.analyzeAbstractSections(response)
      };
    } catch (error) {
      console.error('Erreur dans la génération d\'abstract:', error);
      return { abstract: '', wordCount: 0, sections: [] };
    }
  }
  
  // Vérificateur de plagiat (basique)
  async checkPlagiarism(content: string) {
    // Note: Ceci est une vérification basique
    // En production, intégrer avec un service comme Turnitin
    
    const prompt = `
      Analyser le texte suivant pour détecter:
      1. Les phrases trop similaires à des formulations courantes
      2. Les risques de plagiat involontaire
      3. Les citations manquantes
      4. Les paraphrases problématiques
      
      Texte:
      ${content.substring(0, 3000)}
      
      Fournir un rapport détaillé.
    `;
    
    try {
      const response = await deepseekAPI.analyzeText(prompt);
      return this.parsePlagiarismReport(response);
    } catch (error) {
      console.error('Erreur dans la vérification de plagiat:', error);
      return { score: 0, issues: [], suggestions: [] };
    }
  }
  
  // Méthodes utilitaires
  private parseStructureAnalysis(response: string) {
    try {
      // Essayer de parser JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Retourner une structure par défaut
      return {
        sectionsFound: [],
        missingSections: [],
        organizationScore: 0,
        recommendations: []
      };
    } catch (error) {
      return this.getDefaultStructureAnalysis();
    }
  }
  
  private getDefaultStructureAnalysis(documentType: string = 'article') {
    const templates: Record<string, any> = {
      article: {
        requiredSections: ['Introduction', 'Méthodes', 'Résultats', 'Discussion', 'Conclusion'],
        optionalSections: ['Résumé', 'Abstract', 'Remerciements', 'Références', 'Annexes']
      },
      thesis: {
        requiredSections: ['Introduction', 'Revue de littérature', 'Méthodologie', 'Résultats', 'Discussion', 'Conclusion'],
        optionalSections: ['Résumé', 'Abstract', 'Dédicace', 'Remerciements', 'Table des matières', 'Liste des figures', 'Références', 'Annexes']
      },
      report: {
        requiredSections: ['Introduction', 'Contexte', 'Méthodologie', 'Résultats', 'Recommandations'],
        optionalSections: ['Résumé exécutif', 'Conclusion', 'Annexes']
      }
    };
    
    return {
      documentType,
      template: templates[documentType] || templates.article,
      recommendations: [
        'Structurer clairement en sections',
        'Utiliser des titres hiérarchiques',
        'Maintenir une cohérence dans le formatage'
      ]
    };
  }
  
  private getDefaultTemplate(sectionType: string) {
    const templates: Record<string, string> = {
      introduction: `# Introduction

## Contexte
[Décrire le contexte de la recherche]

## Problématique
[Présenter le problème de recherche]

## Objectifs
[Énoncer les objectifs de l'étude]

## Structure
[Présenter la structure du document]`,
      
      methodology: `# Méthodologie

## Approche de recherche
[Décrire l'approche générale]

## Participants/Échantillon
[Détails sur l'échantillon]

## Instruments
[Description des outils de collecte]

## Procédure
[Déroulement de l'étude]

## Analyse des données
[Méthodes d'analyse utilisées]`,
      
      results: `# Résultats

## Présentation générale
[Aperçu des résultats]

## Résultats principaux
[Présentation détaillée]

## Résultats secondaires
[Résultats complémentaires]

## Tableaux et figures
[Description des visualisations]`
    };
    
    return {
      template: templates[sectionType] || '# Template non disponible',
      structure: [],
      examples: []
    };
  }
  
  private extractImprovedText(response: string): string {
    // Logique d'extraction du texte amélioré
    return response.split('\n\n')[0] || response;
  }
  
  private extractChanges(response: string): Array<{original: string, improved: string, reason: string}> {
    // Logique d'extraction des changements
    return [];
  }
  
  private extractStyleSuggestions(response: string): string[] {
    // Logique d'extraction des suggestions
    return response.split('\n').filter(line => line.includes('- ')).map(line => line.replace('- ', ''));
  }
  
  private analyzeAbstractSections(abstract: string) {
    const sections = ['Introduction', 'Méthodes', 'Résultats', 'Discussion'];
    return sections.map(section => ({
      section,
      present: abstract.toLowerCase().includes(section.toLowerCase()),
      content: ''
    }));
  }
  
  private parsePlagiarismReport(response: string) {
    return {
      score: 0,
      issues: [],
      suggestions: [
        'Citer correctement les sources',
        'Paraphraser avec vos propres mots',
        'Utiliser des guillemets pour les citations directes'
      ]
    };
  }
}

export default new WritingAssistantService();