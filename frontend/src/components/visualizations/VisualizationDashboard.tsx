import React from 'react';
import { ProjectVisualizations } from '../../types/visualization';
import CodeFrequencyChart from './CodeFrequencyChart';
import WordCloudVisualization from './WordCloudVisualization';
import CooccurrenceNetwork from './CoOccurenceNetwork';
import TemporalEvolutionChart from './TemporalEvolutionChart';
import { AlertTriangle, Info } from 'lucide-react';

interface VisualizationDashboardProps {
  visualizations: ProjectVisualizations | null;
  loading: boolean;
  error: string | null;
  onExport: (chartId: string, format: string) => void;
}

const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  visualizations,
  loading,
  error,
  onExport,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm animate-pulse">
            <div className="h-64 bg-gray-200 rounded-t-xl"></div>
            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-red-800 mt-4">Erreur de chargement des visualisations</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  if (!visualizations) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="h-12 w-12 text-blue-500" />
        <h3 className="text-lg font-semibold text-blue-800 mt-4">Pas de données à visualiser</h3>
        <p className="text-sm text-blue-700 mt-1">Zoomez pour commencer l'analyse.</p>
      </div>
    );
  }

  const charts = [
    {
      id: 'code-frequency',
      title: 'Fréquence des codes',
      component: visualizations.frequencies && (
        <CodeFrequencyChart 
          data={visualizations.frequencies} 
          onExport={(format) => onExport('code-frequency', format)} 
        />
      ),
    },
    {
      id: 'word-cloud',
      title: 'Nuage de mots',
      component: visualizations.wordCloud && (
        <WordCloudVisualization 
          data={visualizations.wordCloud} 
          onExport={(format) => onExport('word-cloud', format)} 
        />
      ),
    },
    {
      id: 'co-occurrence',
      title: 'Réseau de co-occurrence',
      component: visualizations.coOccurrence && (
        <CooccurrenceNetwork 
          data={visualizations.coOccurrence} 
          onExport={(format) => onExport('co-occurrence', format)} 
        />
      ),
    },
    {
      id: 'temporal-evolution',
      title: 'Évolution temporelle',
      component: visualizations.temporal && (
        <TemporalEvolutionChart 
          data={visualizations.temporal} 
          onExport={(format) => onExport('temporal-evolution', format)} 
        />
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {charts.map(chart => (
        chart.component ? ( 
          <div id={chart.id} key={chart.id}>
            {chart.component}
          </div>
        ) : null
      ))}
    </div>
  );
};

export default VisualizationDashboard;
