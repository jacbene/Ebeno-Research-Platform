import { useState, useCallback } from 'react';
import {
  ProjectVisualizations, Visualization
} from '../types/visualization';
import { VisualizationApi } from '../services/api/visualizationApi';

export const useVisualization = (projectId: string) => {
  const [visualizations, setVisualizations] = useState<ProjectVisualizations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === RÉCUPÉRATION COMPLÈTE ===

  const fetchVisualizations = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getProjectVisualizations(projectId, filter);
      if (result.data) {
        setVisualizations(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // === VISUALISATIONS SPÉCIFIQUES ===

  const fetchCodeFrequencies = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getCodeFrequencies(projectId, filter);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchWordCloud = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getWordCloud(projectId, filter);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchCoOccurrenceMatrix = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getCoOccurrenceMatrix(projectId, filter);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchTemporalEvolution = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getTemporalEvolution(projectId, filter);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchUserComparison = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await VisualizationApi.getUserComparison(projectId, filter);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // === HELPERS ===

  const exportVisualization = useCallback((format: 'png' | 'svg' | 'csv' | 'json', data: any) => {
    // Implémentation de l'export selon le format
    switch (format) {
      case 'json':
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization-${new Date().toISOString()}.json`;
        a.click();
        break;

      case 'csv':
        // Conversion en CSV (à implémenter selon la structure)
        console.log('Export CSV à implémenter');
        break;

      default:
        console.log(`Export ${format} à implémenter`);
    }
  }, []);

  return {
    visualizations,
    loading,
    error,

    // Méthodes de récupération
    fetchVisualizations,
    fetchCodeFrequencies,
    fetchWordCloud,
    fetchCoOccurrenceMatrix,
    fetchTemporalEvolution,
    fetchUserComparison,

    // Export
    exportVisualization,

    // State setters
    setVisualizations,
  };
};