import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { WordCloudComponent } from './WordCloud';
import html2pdf from 'html2pdf.js';

interface Document {
  id: string;
  name: string;
  type: 'file' | 'text' | 'audio' | 'memo';
  raw?: any;
  content?: string;
  transcriptText?: string;
  summary?: string;
}

interface DocumentActionsProps {
  document: Document;
  projectId: string;
  onRefresh: () => void;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({ document, projectId, onRefresh }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isAudio = document.type === 'audio' || (document.raw?.mimeType && document.raw.mimeType.startsWith('audio/'));
  const isText = document.type === 'text' || document.type === 'file' || document.type === 'memo';

  const callService = async (service: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setServiceType(service);
    setAnalysisData(null);

    const token = localStorage.getItem('authToken');
    const docId = document.id;
    const docType = document.type === 'memo' ? 'memo' : (document.type === 'file' ? 'file' : 'transcription');

    try {
      let url = '';
      let method = 'POST';

      switch (service) {
        case 'transcribe':
          url = `http://localhost:5001/api/transcriptions/upload`;
          method = 'POST';
          break;
        case 'summarize':
          url = `http://localhost:5001/api/summaries/${docType}/${docId}`;
          method = 'POST';
          break;
        case 'entities':
          url = `http://localhost:5001/api/entities/extract/${docType}/${docId}`;
          method = 'POST';
          break;
        case 'codes':
          url = `http://localhost:5001/api/codes/suggest/${projectId}`;
          method = 'POST';
          break;
        case 'analyze':
          url = `http://localhost:5001/api/analysis/document/${docType}/${docId}`;
          method = 'GET';
          break;
        default:
          setError('Service inconnu');
          setLoading(false);
          return;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        let formattedResult = '';
        switch (service) {
          case 'summarize':
            formattedResult = data.summary || data.data?.summary || data.data?.content || 'Aucun résumé disponible.';
            break;
          case 'entities':
            const entities = data.entities || data.data || {};
            const entries = Object.entries(entities)
              .filter(([key, value]) => Array.isArray(value) && value.length > 0);
            if (entries.length === 0) {
              formattedResult = 'Aucune entité trouvée.';
            } else {
              formattedResult = entries
                .map(([key, value]) => `🔹 ${key}: ${(value as string[]).join(', ')}`)
                .join('\n');
            }
            break;
          case 'codes':
            const suggestions = data.suggestions || data.data || [];
            formattedResult = suggestions.length > 0
              ? `Codes suggérés :\n${suggestions.map((c: string) => `  - ${c}`).join('\n')}`
              : 'Aucun code suggéré.';
            break;
          case 'analyze':
            const analysis = data;
            setAnalysisData(analysis);
            formattedResult = `📊 Total mots : ${analysis.totalWords}\n🔤 Mots uniques : ${analysis.uniqueWords}\n\n🏷️ Mots-clés les plus fréquents :\n${analysis.topKeywords.map((k: any) => `  - ${k.word} (${k.count})`).join('\n')}`;
            break;
          case 'transcribe':
            formattedResult = data.message || 'Transcription en cours...';
            break;
          default:
            formattedResult = data.message || 'Service exécuté avec succès';
        }
        setResult(formattedResult);
      } else {
        setError(data.error || data.message || 'Erreur lors du service');
      }
    } catch (err: any) {
      console.error('❌ Erreur service:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const element = contentRef.current;
    if (!element) return;
    html2pdf().from(element).set({
      margin: 1,
      filename: `document_${document.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handlePrint = () => {
    window.print();
  };

  const displayContent = result || document.content || document.transcriptText || '';

  return (
    <div style={{
      padding: theme.spacing.md,
      backgroundColor: colors.gray[100],
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${colors.gray[200]}`,
      marginTop: theme.spacing.md,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
        <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.md, color: colors.dark }}>
          📄 {document.name}
        </h4>
        <Badge variant="info">{document.type}</Badge>
      </div>

      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.md }}>
        {isAudio && (
          <Button size="sm" variant="primary" onClick={() => callService('transcribe')} disabled={loading}>
            🎙️ Transcrire
          </Button>
        )}
        {isText && (
          <>
            <Button size="sm" variant="primary" onClick={() => callService('summarize')} disabled={loading}>
              📝 Résumer
            </Button>
            <Button size="sm" variant="outline" onClick={() => callService('entities')} disabled={loading}>
              🏷️ Entités
            </Button>
            <Button size="sm" variant="outline" onClick={() => callService('codes')} disabled={loading}>
              🏷️ Codes
            </Button>
            <Button size="sm" variant="info" onClick={() => callService('analyze')} disabled={loading}>
              📊 Analyser
            </Button>
          </>
        )}
        <Button size="sm" variant="success" onClick={exportPDF} disabled={!displayContent}>
          📥 PDF
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePrint} disabled={!displayContent}>
          🖨️ Imprimer
        </Button>
      </div>

      {loading && <p>⏳ Chargement...</p>}
      {error && <p style={{ color: colors.danger }}>❌ {error}</p>}

      {displayContent && (
        <div
          ref={contentRef}
          id="document-content"
          style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.md,
            backgroundColor: colors.white,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${colors.gray[300]}`,
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: theme.typography.fontSize.sm,
            lineHeight: '1.8',
            color: colors.dark,
          }}
        >
          <h5 style={{ margin: '0 0 8px 0' }}>📋 Résultat :</h5>
          {serviceType && <Badge variant="info" style={{ marginBottom: '8px' }}>{serviceType}</Badge>}
          <div style={{ marginTop: '8px' }}>{displayContent}</div>

          {analysisData && analysisData.wordCloud && analysisData.wordCloud.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0' }}>☁️ Nuage de mots</h5>
              <WordCloudComponent words={analysisData.wordCloud} width={500} height={300} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
