// backend/services/surveyAnalysisService.ts
// Service d'analyse IA pour les enquêtes
import { prisma } from '../lib/prisma';
import { deepseekAPI } from './deepseekService';

export class SurveyAnalysisService {
  
  // Analyser les réponses ouvertes avec IA
  async analyzeOpenEndedResponses(surveyId: string) {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });
    
    // Filtrer les questions ouvertes
    const openEndedQuestions = await prisma.question.findMany({
      where: {
        surveyId,
        type: { in: ['TEXT', 'TEXTAREA'] }
      }
    });
    
    const analysisResults = [];
    
    for (const question of openEndedQuestions) {
      const questionResponses = responses
        .map(r => r.answers.find(a => a.questionId === question.id))
        .filter(Boolean)
        .map(a => a.textValue || '');
      
      if (questionResponses.length > 0) {
        const analysis = await this.analyzeTextResponses(question.text, questionResponses);
        analysisResults.push({
          questionId: question.id,
          questionText: question.text,
          analysis
        });
      }
    }
    
    return analysisResults;
  }
  
  private async analyzeTextResponses(question: string, responses: string[]) {
    const prompt = `
      Analyser les réponses à la question suivante:
      
      Question: ${question}
      
      Réponses:
      ${responses.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      
      Veuillez fournir:
      1. Une analyse thématique des réponses
      2. Les mots-clés les plus fréquents
      3. Une synthèse des opinions principales
      4. Des recommandations pour améliorer la question
      
      Format de réponse en JSON:
      {
        "thematicAnalysis": [],
        "topKeywords": [],
        "summary": "",
        "recommendations": []
      }
    `;
    
    try {
      const aiResponse = await deepseekAPI.analyzeText(prompt);
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('Erreur dans l\'analyse IA:', error);
      return {
        thematicAnalysis: [],
        topKeywords: [],
        summary: 'Analyse non disponible',
        recommendations: []
      };
    }
  }
  
  // Générer un rapport automatique
  async generateSurveyReport(surveyId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: true,
        _count: {
          select: { responses: true }
        }
      }
    });
    
    if (!survey) {
      throw new Error('Enquête non trouvée');
    }
    
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });
    
    // Analyser avec IA
    const aiAnalysis = await this.analyzeOpenEndedResponses(surveyId);
    
    // Générer le rapport
    const report = {
      surveyTitle: survey.title,
      surveyDescription: survey.description,
      totalResponses: survey._count.responses,
      responseRate: this.calculateResponseRate(survey),
      completionRate: survey.completionRate,
      averageDuration: survey.averageDuration,
      
      // Analyse quantitative
      quantitativeAnalysis: this.analyzeQuantitativeData(survey.questions, responses),
      
      // Analyse qualitative
      qualitativeAnalysis: aiAnalysis,
      
      // Insights clés
      keyInsights: await this.generateKeyInsights(survey, responses, aiAnalysis),
      
      // Recommandations
      recommendations: await this.generateRecommendations(survey, responses)
    };
    
    return report;
  }
  
  private calculateResponseRate(survey: any): number {
    // Logique pour calculer le taux de réponse
    // À adapter selon les besoins
    return survey.responseCount > 0 ? 100 : 0;
  }
  
  private analyzeQuantitativeData(questions: any[], responses: any[]) {
    return questions.map(question => {
      const questionResponses = responses
        .map(r => r.answers.find(a => a.questionId === question.id))
        .filter(Boolean);
      
      return {
        questionId: question.id,
        questionText: question.text,
        type: question.type,
        responseCount: questionResponses.length,
        stats: this.calculateQuestionStats(question, questionResponses)
      };
    });
  }
  
  private calculateQuestionStats(question: any, responses: any[]) {
    switch (question.type) {
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
        return this.calculateChoiceStats(question, responses);
      case 'LIKERT_SCALE':
        return this.calculateLikertStats(responses);
      default:
        return { responseCount: responses.length };
    }
  }
  
  private calculateChoiceStats(question: any, responses: any[]) {
    const options = question.options || [];
    const distribution: Record<string, number> = {};
    
    responses.forEach(response => {
      const values = Array.isArray(response.value) ? response.value : [response.value];
      values.forEach((value: string) => {
        distribution[value] = (distribution[value] || 0) + 1;
      });
    });
    
    return {
      total: responses.length,
      distribution: options.map((option: any) => ({
        label: option.label,
        value: option.value,
        count: distribution[option.value] || 0,
        percentage: responses.length > 0 
          ? ((distribution[option.value] || 0) / responses.length) * 100 
          : 0
      }))
    };
  }
  
  private calculateLikertStats(responses: any[]) {
    const values = responses
      .map(r => r.value)
      .filter(v => typeof v === 'number');
    
    if (values.length === 0) {
      return { mean: 0, median: 0, mode: 0 };
    }
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
    
    // Mode
    const frequency: Record<number, number> = {};
    values.forEach(v => {
      frequency[v] = (frequency[v] || 0) + 1;
    });
    
    let mode = 0;
    let maxFreq = 0;
    Object.entries(frequency).forEach(([key, freq]) => {
      if (freq > maxFreq) {
        mode = parseInt(key);
        maxFreq = freq;
      }
    });
    
    return {
      mean: parseFloat(mean.toFixed(2)),
      median,
      mode,
      distribution: frequency
    };
  }
  
  private async generateKeyInsights(survey: any, responses: any[], aiAnalysis: any[]) {
    const insights = [];
    
    // Insight 1: Taux de réponse
    if (survey.responseCount > 0) {
      insights.push({
        type: 'RESPONSE_RATE',
        title: 'Taux de participation',
        description: `${survey.responseCount} réponses collectées`,
        significance: survey.responseCount > 50 ? 'HIGH' : 'MEDIUM'
      });
    }
    
    // Insight 2: Taux de complétion
    if (survey.completionRate < 70) {
      insights.push({
        type: 'COMPLETION_RATE',
        title: 'Taux de complétion faible',
        description: `Seulement ${survey.completionRate.toFixed(1)}% des répondants ont terminé l'enquête`,
        recommendation: 'Simplifiez l\'enquête ou réduisez le nombre de questions'
      });
    }
    
    // Insight 3: Analyse des réponses ouvertes
    if (aiAnalysis.length > 0) {
      aiAnalysis.forEach((analysis: any) => {
        if (analysis.analysis.topKeywords && analysis.analysis.topKeywords.length > 0) {
          insights.push({
            type: 'KEYWORDS',
            title: `Mots-clés: ${analysis.questionText.substring(0, 50)}...`,
            description: `Mots-clés fréquents: ${analysis.analysis.topKeywords.slice(0, 5).join(', ')}`,
            significance: 'MEDIUM'
          });
        }
      });
    }
    
    return insights;
  }
  
  private async generateRecommendations(survey: any, responses: any[]) {
    const recommendations = [];
    
    // Recommandation sur la durée
    if (survey.averageDuration && survey.averageDuration > 600) {
      recommendations.push({
        type: 'DURATION',
        title: 'Durée trop longue',
        description: `L'enquête prend en moyenne ${Math.round(survey.averageDuration / 60)} minutes`,
        suggestion: 'Réduisez le nombre de questions ou simplifiez-les'
      });
    }
    
    // Recommandation sur le taux de réponse
    if (survey.responseCount < 10) {
      recommendations.push({
        type: 'RESPONSE_COUNT',
        title: 'Trop peu de réponses',
        description: `Seulement ${survey.responseCount} réponses collectées`,
        suggestion: 'Diffusez l\'enquête plus largement ou offrez des incitations'
      });
    }
    
    return recommendations;
  }
  
  private parseAIResponse(response: string): any {
    try {
      // Essayer de parser comme JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Essayer de parser tout le texte comme JSON
      return JSON.parse(response);
    } catch (error) {
      // Retourner une structure par défaut
      return {
        thematicAnalysis: ['Analyse non disponible'],
        topKeywords: [],
        summary: response.substring(0, 500),
        recommendations: []
      };
    }
  }
}

export default new SurveyAnalysisService();
