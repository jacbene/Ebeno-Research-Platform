// frontend/src/pages/TranscriptionList.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WordCloudComponent } from '../components/WordCloud';
import { LanguageBadge } from '../components/LanguageBadge';
import TranslateModal from '../components/TranslateModal';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import CommentSection from '../components/CommentSection';
import { useSearchParams } from 'react-router-dom';
import TranscriptionUploader from '../components/TranscriptionUploader';
import { socket } from '../services/socket';

interface Transcription {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transcriptText: string | null;
  audioUrl: string | null;
  type?: 'audio' | 'text';
  fileName?: string;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId?: string | null;
  errorMessage?: string | null;
}

interface Analysis {
  transcriptionId: string;
  totalWords: number;
  uniqueWords: number;
  topKeywords: Array<{ word: string; count: number }>;
  wordCloud: Array<{ word: string; value: number }>;
}

const sanitizeFileName = (name: string): string => {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'document';
};

const TranscriptionList: React.FC = () => {
  const [showUploader, setShowUploader] = useState(false);
  const { colors } = useTheme();
  const toast = useToast();
  const { t, i18n } = useTranslation();
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
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null); // ✅ Nouvel état pour le bouton PDF
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  // ✅ Auto-traduction
  const [translateModal, setTranslateModal] = useState<{
    open: boolean;
    documentId: string;
    documentType: 'transcription' | 'memo' | 'text';
    title: string;
  }>({ open: false, documentId: '', documentType: 'transcription', title: '' });

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
      return date.toLocaleString(i18n.language, {
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
      items = items.map((item) => ({
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

  const handleRetry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('transcriptionList.retry.confirm'))) return;

    setRetryingId(id);
    try {
      const response = await api.post(`/transcriptions/${id}/retry`);
      if (response.data.success) {
        toast.addToast({
          type: 'info',
          title: t('transcriptionList.retry.success'),
          message: t('transcriptionList.retry.successMessage'),
        });
        await fetchTranscriptions();
      } else {
        toast.addToast({
          type: 'error',
          title: t('common.error'),
          message: response.data.message || t('transcriptionList.retry.error'),
        });
      }
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('transcriptionList.retry.connectionError'),
      });
    } finally {
      setRetryingId(null);
    }
  };

  // ✅ NOUVELLE FONCTION D'EXPORT PDF
  const handleExportPDF = async (item: Transcription, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.transcriptText) return;
    if (!item.projectId) {
      toast.addToast({ type: 'error', title: 'Impossible', message: 'Cette transcription n\'est liée à aucun projet.' });
      return;
    }

    const defaultTitle = `Transcription_${sanitizeFileName(item.title)}`;
    const userTitle = window.prompt(
      "Titre du document à sauvegarder dans le projet :",
      defaultTitle
    );

    if (!userTitle) return;

    setExportingId(item.id);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const dom = window.document;
      const container = dom.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.padding = '30px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';
      container.style.fontSize = '14px';
      container.style.lineHeight = '1.6';
      container.style.boxSizing = 'border-box';

      const title = dom.createElement('h1');
      title.textContent = userTitle;
      title.style.fontSize = '22px';
      title.style.marginTop = '0';
      title.style.marginBottom = '8px';
      title.style.borderBottom = '2px solid #4A6CF7';
      title.style.paddingBottom = '8px';
      title.style.color = '#222';
      container.appendChild(title);

      const meta = dom.createElement('p');
      meta.textContent = `Transcription — Généré le ${new Date().toLocaleString('fr-FR')}`;
      meta.style.fontSize = '12px';
      meta.style.color = '#666';
      meta.style.fontStyle = 'italic';
      meta.style.marginTop = '0';
      meta.style.marginBottom = '24px';
      container.appendChild(meta);

      const content = dom.createElement('div');
      content.style.whiteSpace = 'pre-wrap';
      content.style.wordWrap = 'break-word';
      content.style.marginBottom = '24px';
      content.style.color = '#333';
      content.textContent = item.transcriptText;
      container.appendChild(content);

      const footer = dom.createElement('div');
      footer.textContent = 'Document généré depuis Ebeno Research Platform';
      footer.style.marginTop = '40px';
      footer.style.paddingTop = '12px';
      footer.style.borderTop = '1px solid #ddd';
      footer.style.fontSize = '10px';
      footer.style.color = '#999';
      footer.style.textAlign = 'center';
      container.appendChild(footer);

      dom.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800,
      });

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;
      let heightLeft = imgHeight;
      let position = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }

      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, `${sanitizeFileName(userTitle)}.pdf`);
      formData.append('title', userTitle);
      // ✅ NOUVEAU : Envoyer le texte brut
      formData.append('content', item.transcriptText || '');

      await api.post(`/projects/${item.projectId}/files/upload-generated`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.addToast({ type: 'success', title: 'PDF sauvegardé dans le projet !', message: userTitle });
      dom.body.removeChild(container);
    } catch (err: any) {
      console.error('❌ Erreur export PDF:', err);
      toast.addToast({ type: 'error', title: 'Erreur lors de la sauvegarde PDF' });
    } finally {
      setExportingId(null);
    }
  };

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  useEffect(() => {
    const handleRealtimeUpdate = (data: any) => {
      console.log('⚡ Socket event received, updating transcriptions list...', data);
      fetchTranscriptions();
    };

    socket.on('transcription-completed', handleRealtimeUpdate);
    socket.on('transcription-failed', handleRealtimeUpdate);
    socket.on('transcription-uploaded', handleRealtimeUpdate);

    return () => {
      socket.off('transcription-completed', handleRealtimeUpdate);
      socket.off('transcription-failed', handleRealtimeUpdate);
      socket.off('transcription-uploaded', handleRealtimeUpdate);
    };
  }, []);

  useEffect(() => {
    navigate(`?type=${filter}`, { replace: true });
  }, [filter, navigate]);

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`transcription-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.backgroundColor = '#FEF3C7';
          setTimeout(() => { el.style.backgroundColor = ''; }, 3000);
        }
      }, 500);
    }
  }, [highlightId, transcriptions]);

  const filteredTranscriptions = transcriptions.filter((item) => {
    if (filter === 'all') return true;
    return (item.type || 'audio') === filter;
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
    return t(`transcriptionList.status.${status}`) || t('transcriptionList.status.unknown');
  };

  const toggleExpand = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setAnalysis(null);
    } else {
      setSelectedId(id);
      const transcription = transcriptions.find((item) => item.id === id);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: colors.dark, margin: 0 }}>{t('transcriptionList.title')}</h1>
        <button
          onClick={() => setShowUploader(true)}
          style={{
            backgroundColor: colors.primary,
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          + {t('transcriptionList.newButton', 'Nouvelle transcription')}
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterButtonStyle(filter === 'all')}>
          {t('transcriptionList.filters.all')}
        </button>
        <button onClick={() => setFilter('audio')} style={filterButtonStyle(filter === 'audio')}>
          {t('transcriptionList.filters.audio')}
        </button>
        <button onClick={() => setFilter('text')} style={filterButtonStyle(filter === 'text')}>
          {t('transcriptionList.filters.text')}
        </button>
      </div>

      {loading ? (
        <p style={{ color: colors.gray[500] }}>{t('transcriptionList.loading')}</p>
      ) : filteredTranscriptions.length === 0 ? (
        <p style={{ color: colors.gray[500] }}>{t('transcriptionList.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTranscriptions.map((item) => {
            const isExpanded = selectedId === item.id;
            const isCompleted = item.status === 'COMPLETED';
            const isFailed = item.status === 'FAILED';
            const hasText = !!item.transcriptText;
            const isRetrying = retryingId === item.id;
            const isExporting = exportingId === item.id;

            return (
              <div
                key={item.id}
                id={`transcription-${item.id}`}
                onClick={() => toggleExpand(item.id)}
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(item.type)}</span>
                    <span style={{ fontWeight: '500', color: colors.dark }}>
                      {item.title || t('transcriptionList.noTitle')}
                    </span>
                    <LanguageBadge language={item.language} size="sm" showCode />
                    <span
                      style={{
                        fontSize: '13px',
                        color: getStatusColor(item.status),
                        fontWeight: '600',
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: colors.gray[500] }}>
                      {formatDateTime(item.createdAt)}
                    </span>

                    {isCompleted && hasText && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranslateModal({
                              open: true,
                              documentId: item.id,
                              documentType: 'transcription',
                              title: item.title || t('transcriptionList.noTitle'),
                            });
                          }}
                          title={t('translation.translateTooltip')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: colors.gray[100] || '#f5f5f5',
                            color: colors.primary,
                            border: `1px solid ${colors.primary}40`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          🌍 {t('translation.translateButton')}
                        </button>

                        {/* ✅ NOUVEAU BOUTON PDF */}
                        <button
                          onClick={(e) => handleExportPDF(item, e)}
                          disabled={isExporting}
                          title="Exporter en PDF et sauvegarder dans le projet"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isExporting ? colors.gray[300] : colors.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isExporting ? 'wait' : 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isExporting ? '⏳...' : '📥 PDF'}
                        </button>
                      </>
                    )}

                    {isFailed && (
                      <button
                        onClick={(e) => handleRetry(item.id, e)}
                        disabled={isRetrying}
                        title={t('transcriptionList.retry.tooltip')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isRetrying ? colors.gray[400] : colors.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isRetrying ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isRetrying ? t('transcriptionList.retry.retrying') : t('transcriptionList.retry.button')}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '14px' }}>
                    {item.errorMessage && (
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: colors.danger + '15',
                          color: colors.danger,
                          borderRadius: '8px',
                          border: `1px solid ${colors.danger}30`,
                          fontSize: '13px',
                          marginBottom: '10px',
                        }}
                      >
                        <strong>{t('transcriptionList.error.label')}</strong> {item.errorMessage}
                      </div>
                    )}

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
                        item.transcriptText
                      ) : isCompleted ? (
                        <span style={{ color: colors.gray[500], fontStyle: 'italic' }}>
                          {t('transcriptionList.noText')}
                        </span>
                      ) : isFailed ? (
                        <span style={{ color: colors.danger, fontStyle: 'italic' }}>
                          {t('transcriptionList.failed')}
                        </span>
                      ) : (
                        <span style={{ color: colors.gray[500], fontStyle: 'italic' }}>
                          {t('transcriptionList.processing')}
                        </span>
                      )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <CommentSection
                        documentId={item.id}
                        documentType="transcription"
                      />
                    </div>

                    {isCompleted && hasText && (
                      <div style={{ marginTop: '16px' }} onClick={(e) => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: colors.dark }}>
                          {t('transcriptionList.analysis.title')}
                        </h4>

                        {analysisLoading ? (
                          <p style={{ fontSize: '14px', color: colors.gray[600] }}>
                            {t('transcriptionList.analysis.loading')}
                          </p>
                        ) : analysis ? (
                          <>
                            <WordCloudComponent words={analysis.wordCloud || []} width={500} height={300} />
                            <div
                              style={{
                                display: 'flex',
                                gap: '20px',
                                fontSize: '13px',
                                color: colors.gray[600],
                                marginTop: '8px',
                              }}
                            >
                              <span>
                                {t('transcriptionList.analysis.totalWords')} :{' '}
                                <strong>{analysis.totalWords}</strong>
                              </span>
                              <span>
                                {t('transcriptionList.analysis.uniqueWords')} :{' '}
                                <strong>{analysis.uniqueWords}</strong>
                              </span>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '13px', color: colors.gray[600], fontWeight: '500' }}>
                                {t('transcriptionList.analysis.keywords')} :
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {analysis.topKeywords?.slice(0, 10).map((kw) => (
                                  <span
                                    key={kw.word}
                                    style={{
                                      backgroundColor: colors.gray[200],
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '13px',
                                      color: colors.dark,
                                    }}
                                  >
                                    {kw.word} ({kw.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p style={{ fontSize: '14px', color: colors.gray[500] }}>
                            {t('transcriptionList.analysis.unavailable')}
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

      <TranslateModal
        isOpen={translateModal.open}
        onClose={() => setTranslateModal({ ...translateModal, open: false })}
        documentId={translateModal.documentId}
        documentType={translateModal.documentType}
        documentTitle={translateModal.title}
      />

      {showUploader && (
        <div
          onClick={() => setShowUploader(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.white,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowUploader(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                border: 'none',
                background: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: colors.dark,
              }}
            >
              ✕
            </button>
            <h2 style={{ marginBottom: '16px', color: colors.dark }}>
              {t('transcriptionList.newButton', 'Nouvelle transcription')}
            </h2>
            <TranscriptionUploader
              projectId=""
              onUploadComplete={() => {
                setShowUploader(false);
                fetchTranscriptions();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionList;
