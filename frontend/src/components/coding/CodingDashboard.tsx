import React, { useState, useEffect, useCallback } from 'react';
import { useCoding } from '../../hooks/useCoding';
import { CodingStatistics } from '../../types/coding';
import {
  BarChart3,
  PieChart,
  Users,
  Tag,
  TrendingUp,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface CodingDashboardProps {
  projectId: string;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; trend?: boolean }> = ({ icon, title, value, trend }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-blue-100 rounded-lg">{icon}</div>
      {trend && <TrendingUp className="h-5 w-5 text-green-500" />}
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-600">{title}</div>
  </div>
);

const CodingDashboard: React.FC<CodingDashboardProps> = ({ projectId }) => {
  const { loading, error, fetchStatistics } = useCoding(projectId);
  const [statistics, setStatistics] = useState<CodingStatistics | null>(null);

  const loadStatistics = useCallback(async () => {
    const result = await fetchStatistics();
    if (result.success && result.data) {
      setStatistics(result.data);
    }
    // L'erreur est déjà gérée par le hook `useCoding`
  }, [fetchStatistics]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const exportAnnotations = () => {
    // Fonction d'export à implémenter
    alert("Fonction d'export à implémenter");
  };

  if (loading && !statistics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-red-800 mt-4">Erreur de chargement</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadStatistics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!statistics) {
    return <div className="text-center text-gray-500">Aucune statistique à afficher.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tableau de bord du codage</h2>
          <p className="text-gray-600">Analyse et statistiques de vos annotations</p>
        </div>
        <button
          onClick={exportAnnotations}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          <span>Exporter</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Tag className="h-6 w-6 text-blue-600" />} 
          title="Codes créés" 
          value={statistics.totalCodes} 
          trend 
        />
        <StatCard 
          icon={<BarChart3 className="h-6 w-6 text-green-600" />} 
          title="Annotations" 
          value={statistics.totalAnnotations} 
          trend 
        />
        <StatCard 
          icon={<PieChart className="h-6 w-6 text-purple-600" />} 
          title="Annotations par code" 
          value={Math.round(statistics.totalAnnotations / Math.max(statistics.totalCodes, 1))} 
        />
        <StatCard 
          icon={<Users className="h-6 w-6 text-orange-600" />} 
          title="Utilisateurs actifs" 
          value={statistics.topUsers.length} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Codes les plus utilisés</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {statistics.topCodes.map((code, index) => (
                <div key={code.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500 font-medium w-6">#{index + 1}</div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: code.color }}
                    />
                    <div>
                      <div className="font-medium text-gray-900 truncate">{code.name}</div>
                      <div className="text-sm text-gray-600">{code._count.annotations} annotations</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-semibold">
                    {statistics.totalAnnotations > 0
                      ? `${Math.round((code._count.annotations / statistics.totalAnnotations) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Utilisateurs les plus actifs</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {statistics.topUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.count} annotations</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-semibold">
                    {statistics.totalAnnotations > 0
                      ? `${Math.round((user.count / statistics.totalAnnotations) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingDashboard;
