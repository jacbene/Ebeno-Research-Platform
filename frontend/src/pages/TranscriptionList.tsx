import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WordCloudComponent } from '../components/WordCloud';
import { api } from '../services/api';

interface Transcription {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transcriptText: string | null;
  audioUrl: string | null;
  type?: 'audio' | 'text';
  fileName?: string;
  created_at: number;
  updated_at: number;
}

interface Analysis {
  transcriptionId: string;
  totalWords: number;
  uniqueWords: number;
  topKeywords: Array<{ word: string; count: number }>;
  wordCloud: Array<{ word: string; value: number }>;
}

const TranscriptionList: React.FC = () => {
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
      items = items.map(item => ({
        ...item,
        type: item.type || (item.audioUrl ? 'audio' : 'text')
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
      case 'COMPLETED': return '#28a745';
      case 'PENDING': return '#ffc107';
      case 'PROCESSING': return '#17a2b8';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
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

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>📜 Mes transcriptions</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 20px',
            backgroundColor: filter === 'all' ? '#007bff' : '#e9ecef',
            color: filter === 'all' ? 'white' : '#333',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: filter === 'all' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          📋 Tout
        </button>
        <button
          onClick={() => setFilter('audio')}
          style={{
            padding: '8px 20px',
            backgroundColor: filter === 'audio' ? '#007bff' : '#e9ecef',
            color: filter === 'audio' ? 'white' : '#333',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: filter === 'audio' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          🎙️ Audio
        </button>
        <button
          onClick={() => setFilter('text')}
          style={{
            padding: '8px 20px',
            backgroundColor: filter === 'text' ? '#007bff' : '#e9ecef',
            color: filter === 'text' ? 'white' : '#333',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: filter === 'text' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          📄 Texte
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : filteredTranscriptions.length === 0 ? (
        <p style={{ color: '#999' }}>Aucun élément trouvé.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTranscriptions.map((t) => {
            const isExpanded = selectedId === t.id;
            const isCompleted = t.status === 'COMPLETED';
            const hasText = !!t.transcriptText;

            return (
              <div
                key={t.id}
                onClick={() => toggleExpand(t.id)}
                style={{
                  padding: '14px 18px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  backgroundColor: isExpanded ? '#f0f7ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(t.type)}</span>
                    <span style={{ fontWeight: '500' }}>{t.title || 'Sans titre'}</span>
                    <span style={{
                      fontSize: '13px',
                      color: getStatusColor(t.status),
                      fontWeight: '600'
                    }}>
                      {getStatusLabel(t.status)}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#999' }}>
                    {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '14px' }}>
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: '#212529'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasText ? (
                        t.transcriptText
                      ) : isCompleted ? (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>
                          Aucun texte disponible.
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>
                          La transcription est en cours...
                        </span>
                      )}
                    </div>

                    {isCompleted && hasText && (
                      <div
                        style={{ marginTop: '16px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>
                          ☁️ Analyse qualitative
                        </h4>

                        {analysisLoading ? (
                          <p style={{ fontSize: '14px', color: '#666' }}>Chargement de l'analyse...</p>
                        ) : analysis ? (
                          <>
                            <WordCloudComponent words={analysis.wordCloud || []} width={500} height={300} />
                            <div style={{
                              display: 'flex',
                              gap: '20px',
                              fontSize: '13px',
                              color: '#666',
                              marginTop: '8px'
                            }}>
                              <span>📊 Total mots : <strong>{analysis.totalWords}</strong></span>
                              <span>🔤 Mots uniques : <strong>{analysis.uniqueWords}</strong></span>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>
                                Mots-clés les plus fréquents :
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {analysis.topKeywords?.slice(0, 10).map((kw) => (
                                  <span key={kw.word} style={{
                                    backgroundColor: '#e9ecef',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    color: '#333'
                                  }}>
                                    {kw.word} ({kw.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p style={{ fontSize: '14px', color: '#999' }}>
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
