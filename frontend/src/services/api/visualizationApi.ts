import {
    CodeFrequencyData,
    WordCloudData,
    CoOccurrenceData,
    TemporalData,
    UserComparisonData,
    ProjectVisualizations,
  } from '../../types/visualization.js';
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  export class VisualizationApi {
    private static baseUrl = API_BASE_URL;
  
    // === VISUALISATIONS SPÉCIFIQUES ===
  
    static async getCodeFrequencies(
      projectId: string,
      filter?: any
    ): Promise<{ data?: CodeFrequencyData; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations/frequencies${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des fréquences');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get code frequencies error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getWordCloud(
      projectId: string,
      filter?: any
    ): Promise<{ data?: WordCloudData; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations/word-cloud${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la génération du nuage de mots');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get word cloud error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getCoOccurrenceMatrix(
      projectId: string,
      filter?: any
    ): Promise<{ data?: CoOccurrenceData; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations/co-occurrence${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la génération de la matrice de co-occurrence');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get co-occurrence matrix error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getTemporalEvolution(
      projectId: string,
      filter?: any
    ): Promise<{ data?: TemporalData; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations/temporal${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'évolution temporelle');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get temporal evolution error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getUserComparison(
      projectId: string,
      filter?: any
    ): Promise<{ data?: UserComparisonData; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations/user-comparison${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la comparaison par utilisateur');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get user comparison error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === TOUTES LES VISUALISATIONS ===
  
    static async getProjectVisualizations(
      projectId: string,
      filter?: any
    ): Promise<{ data?: ProjectVisualizations; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/visualizations/projects/${projectId}/visualizations${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des visualisations');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get project visualizations error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  }
