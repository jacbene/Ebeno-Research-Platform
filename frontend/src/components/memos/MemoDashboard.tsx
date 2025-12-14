import React, { useState, useEffect } from 'react';
import { useMemo } from '../../hooks/useMemo';
import { 
  PieChart, 
  TrendingUp, 
  Users, 
  FileText,
  Tag,
  MessageSquare,
  Calendar,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MemoDashboardProps {
  projectId: string;
}

interface MemoStatistics {
  totalMemos: number;
  memosByUser: {
    userId: string;
    name: string;
    count: number;
  }[];
  memosByType: {
    linkedToCode: number;
    linkedToDocument: number;
    linkedToAnnotation: number;
    standalone: number;
  };
  recentMemos: any[];
}

const MemoDashboard: React.FC<MemoDashboardProps> = ({ projectId }) => {
  const { 
    fetchStatistics,
    loading 
  } = useMemo(projectId);
  
  const [statistics, setStatistics] = useState<MemoStatistics | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    const result = await fetchStatistics();
    if (result.data) {
      setStatistics(result.data as MemoStatistics);
    }
  };

  const exportMemos = () => {
    alert('Fonction d\'export à implémenter');
  };

  if (loading && !statistics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tableau de bord des mémos</h2>
          <p className="text-gray-600">
            Analyse et statistiques de vos mémos analytiques
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">3 derniers mois</option>
            <option value="all">Tout le temps</option>
          </select>
          <button
            onClick={exportMemos}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      {statistics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {statistics.totalMemos}
              </div>
              <div className="text-sm text-gray-600">Mémos créés</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {statistics.memosByUser.length}
              </div>
              <div className="text-sm text-gray-600">Auteurs</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {statistics.memosByType.linkedToCode + statistics.memosByType.linkedToDocument + statistics.memosByType.linkedToAnnotation}
              </div>
              <div className="text-sm text-gray-600">Mémos liés</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Tag className="h-6 w-6 text-orange-600" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {statistics.memosByType.standalone}
              </div>
              <div className="text-sm text-gray-600">Mémos standalone</div>
            </div>
          </div>

          {/* Graphique de répartition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Répartition par type</h3>
              <div className="space-y-4">
                {[
                  { label: 'Liés à un code', value: statistics.memosByType.linkedToCode, color: 'bg-blue-500' },
                  { label: 'Liés à un document', value: statistics.memosByType.linkedToDocument, color: 'bg-green-500' },
                  { label: 'Liés à une annotation', value: statistics.memosByType.linkedToAnnotation, color: 'bg-purple-500' },
                  { label: 'Standalone', value: statistics.memosByType.standalone, color: 'bg-gray-500' },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span className="text-gray-600">
                        {item.value} ({statistics.totalMemos > 0 ? Math.round((item.value / statistics.totalMemos) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${statistics.totalMemos > 0 ? (item.value / statistics.totalMemos) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Auteurs les plus actifs</h3>
              <div className="space-y-4">
                {statistics.memosByUser.map((user: any) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-600">
                          {user.count} mémos
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {statistics.totalMemos > 0 ? Math.round((user.count / statistics.totalMemos) * 100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mémos récents */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Mémos récents</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {statistics.recentMemos.map((memo: any) => (
                  <div key={memo.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">
                          {memo.codeId ? 'Code' : memo.documentId ? 'Document' : 'Standalone'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{memo.title}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {memo.user.profile.firstName} {memo.user.profile.lastName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(memo.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/memos/${memo.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Voir →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MemoDashboard;
