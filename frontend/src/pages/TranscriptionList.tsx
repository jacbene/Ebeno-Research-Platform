// frontend/src/pages/TranscriptionList.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WordCloudComponent } from '../components/WordCloud';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

interface Transcription {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transcriptText: string | null;
  audioUrl: string | null;
  type?: 'audio' | 'text';
  fileName?: string;
  // ✅ Support des deux formats (défensive)
  createdAt?: number | string;
  updatedAt?: number | string;
  created_at?: number | string;
  updated_at?: number | string;
}

interface Analysis {
  transcriptionId: string;
  totalWords: number;
  uniqueWords: number;
  topKeywords: Array<{ word: string; count: number }>;
  wordCloud: Array<{ word: string; value: number }>;
}

// ✅ Fonction de formatage robuste
const formatDateTime = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';

  try {
    let date: Date;

    if (typeof value === 'number') {
      date = new Date(value);
    } else if (typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num) && value.length >= 10) {
        date = new Date(num);
      } else {
        date = new Date(value);
      }
    } else {
      return '-';
    }

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const TranscriptionList: React.FC = () => {
  const { colors } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialFilter = (params.get('type') as 'all' | 'audio' | 'text') || 'all';

  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'audio' | 'text'>(initialFilter);

  const fetchTranscriptions = async () => {
    try {
      const response = await api.get('/transcriptions');
      let items: Transcription[] = [];
      if (response.data.success && response.data.data) {
        if (Array.isArray(response.data.data)) {
          items = response.data.data;
        } else if (response.data.data.transcriptions) {
          items = response.data.data.transcriptions;
        }
      }
      // ✅ Log pour diagnostiquer
      console.log('📋 [TranscriptionList] Premier item:', items[0]);

      items = items.map(item => ({
        ...item,
        type: item.type || (item.audioUrl ? 'audio' : 'text'),
      }));
      setTranscriptions(items);
    } catch (error) {
      console.error('❌ Erreur fetch transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async (id: string) => {
    setAnalysisLoading(true);
    try {
      const response = await api.get(`/analysis/${id}`);
      if (response.status === 200) {
        setAnalysis(response.data);
      }
    } catch (error) {
      console.error('❌ Erreur analyse:', error);
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  useEffect(() => {
    navigate(`?type=${filter}`, { replace: true });
  }, [filter, navigate]);

  const filteredTranscriptions = transcriptions.filter(t => {
    if (filter === 'all') return true;
    return (t.type || 'audio') === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return colors.success;
      case 'PENDING': return colors.warning;
      case 'PROCESSING': return colors.info;
      case 'FAILED': return colors.danger;
      default: return colors.gray[500];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '✅ Terminé';
      case 'PENDING': return '⏳ En attente';
      case 'PROCESSING': return '⚙️ Traitement';
      case 'FAILED': return '❌ Échec';
      default: return 'Inconnu';
    }
  };

  const toggleExpand = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setAnalysis(null);
    } else {
      setSelectedId(id);
      const transcription = transcriptions.find(t => t.id === id);
      if (transcription?.status === 'COMPLETED' && transcription.transcriptText) {
        fetchAnalysis(id);
      } else {
        setAnalysis(null);
      }
    }
  };

  const getTypeIcon = (type?: string) => {
    if (type === 'audio') return '🎙️';
    if (type === 'text') return '📄';
    return '📄';
  };

  const filterButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    backgroundColor: active ? colors.primary : colors.gray[200],
    color: active ? colors.white : colors.dark,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
    transition: '0.2s',
  });

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: colors.dark }}>📜 Mes transcriptions</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterButtonStyle(filter === 'all')}>
          📋 Tout
        </button>
        <button onClick={() => setFilter('audio')} style={filterButtonStyle(filter === 'audio')}>
          🎙️ Audio
        </button>
        <button onClick={() => setFilter('text')} style={filterButtonStyle(filter === 'text')}>
          📄 Texte
        </button>
      </div>

      {loading ? (
        <p style={{ color: colors.gray[500] }}>Chargement...</p>
      ) : filteredTranscriptions.length === 0 ? (
        <p style={{ color: colors.gray[500] }}>Aucun élément trouvé.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTranscriptions.map((t) => {
            const isExpanded = selectedId === t.id;
            const isCompleted = t.status === 'COMPLETED';
            const hasText = !!t.transcriptText;

            // ✅ Utilise les deux noms possibles pour la date
            const dateValue = t.createdAt ?? t.created_at;

            return (
              <div
                key={t.id}
                onClick={() => toggleExpand(t.id)}
                style={{
                  padding: '14px 18px',
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: '10px',
                  backgroundColor: isExpanded ? colors.primary + '10' : colors.white,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(t.type)}</span>
                    <span style={{ fontWeight: '500', color: colors.dark }}>
                      {t.title || 'Sans titre'}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: getStatusColor(t.status),
                      fontWeight: '600',
                    }}>
                      {getStatusLabel(t.status)}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: colors.gray[500] }}>
                    {/* ✅ Utilise la fonction robuste */}
                    {formatDateTime(dateValue)}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '14px' }}>
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: colors.gray[100],
                        borderRadius: '8px',
                        border: `1px solid ${colors.gray[200]}`,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: colors.dark,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasText ? (
                        t.transcriptText
                      ) : isCompleted ? (
                        <span style={{ color: colors.gray[500], fontStyle: 'italic' }}>
                          Aucun texte disponible.
                        </span>
                      ) : (
                        <span style={{ color: colors.gray[500], fontStyle: 'italic' }}>
                          La transcription est en cours...
                        </span>
                      )}
                    </div>

                    {isCompleted && hasText && (
                      <div style={{ marginTop: '16px' }} onClick={(e) => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: colors.dark }}>
                          ☁️ Analyse qualitative
                        </h4>

                        {analysisLoading ? (
                          <p style={{ fontSize: '14px', color: colors.gray[600] }}>Chargement de l'analyse...</p>
                        ) : analysis ? (
                          <>
                            <WordCloudComponent words={analysis.wordCloud || []} width={500} height={300} />
                            <div style={{
                              display: 'flex',
                              gap: '20px',
                              fontSize: '13px',
                              color: colors.gray[600],
                              marginTop: '8px',
                            }}>
                              <span>📊 Total mots : <strong>{analysis.totalWords}</strong></span>
                              <span>🔤 Mots uniques : <strong>{analysis.uniqueWords}</strong></span>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '13px', color: colors.gray[600], fontWeight: '500' }}>
                                Mots-clés les plus fréquents :
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {analysis.topKeywords?.slice(0, 10).map((kw) => (
                                  <span key={kw.word} style={{
                                    backgroundColor: colors.gray[200],
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    color: colors.dark,
                                  }}>
                                    {kw.word} ({kw.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p style={{ fontSize: '14px', color: colors.gray[500] }}>
                            Analyse non disponible.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TranscriptionList;
