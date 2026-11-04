// frontend/src/components/DocumentActions.tsx
import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { api } from '../services/api';
import { useQuotaWarning } from '../hooks/useQuotaWarning';
import { useToast } from '../context/ToastContext';
// ✅ IMPORTS MARKDOWN
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentData {
  id: string;
  name: string;
  type: 'file' | 'text' | 'audio' | 'memo';
  raw?: any;
  content?: string;
  transcriptText?: string;
  summary?: string;
}

interface DocumentActionsProps {
  document: DocumentData;
  projectId: string;
  onRefresh: () => void;
}

// ✅ Helper : nom de fichier sûr pour l'export PDF
const sanitizeFileName = (name: string): string => {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'document';
};

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  document: doc,
  projectId,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const toast = useToast();
  const checkQuotaWarning = useQuotaWarning();
  
  const [loading, setLoading] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false); // ✅ Nouvel état pour le bouton PDF
  const [result, setResult] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isAudio =
    doc.type === 'audio' ||
    (doc.raw?.mimeType && doc.raw.mimeType.startsWith('audio/'));
  const isText = doc.type === 'text' || doc.type === 'file' || doc.type === 'memo';

  const callService = async (service: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setServiceType(service);
    setAnalysisData(null);

    const docId = doc.id;
    const docType =
      doc.type === 'memo' ? 'memo' : doc.type === 'file' ? 'file' : 'transcription';

    try {
      let url = '';
      let method = 'POST';

      switch (service) {
        case 'transcribe':
          url = '/transcriptions/upload';
          method = 'POST';
          break;
        case 'summarize':
          url = `/summaries/${docType}/${docId}`;
          method = 'POST';
          break;
        case 'entities':
          url = `/entities/extract/${docType}/${docId}`;
          method = 'POST';
          break;
        case 'codes':
          url = `/codes/suggest/${projectId}`;
          method = 'POST';
          break;
        case 'analyze':
          url = `/analysis/document/${docType}/${docId}`;
          method = 'GET';
          break;
       case 'sentiment':
         url = `/analysis/sentiment/${docType}/${docId}`;
         method = 'POST';
         break;         
        default:
          setError('Service inconnu');
          setLoading(false);
          return;
      }

      const response = await api({ method, url });

      if (response.status >= 200 && response.status < 300) {
        let formattedResult = '';
        switch (service) {
          case 'summarize': {
            formattedResult =
              response.data.summary ||
              response.data.data?.summary ||
              response.data.data?.content ||
              'Aucun résumé disponible.';
            break;
          }
          case 'entities': {
            const entities = response.data.entities || response.data.data || {};
            const entries = Object.entries(entities).filter(
              ([key, value]) => Array.isArray(value) && value.length > 0
            );
            if (entries.length === 0) {
              formattedResult = 'Aucune entité trouvée.';
            } else {
              formattedResult = entries
                .map(([key, value]) => `🔹 **${key}**: ${(value as string[]).join(', ')}`)
                .join('\n\n');
            }
            break;
          }
          case 'codes': {
            const suggestions = response.data.suggestions || response.data.data || [];
            formattedResult =
              suggestions.length > 0
                ? `**Codes suggérés :**\n${suggestions
                    .map((c: string) => `- ${c}`)
                    .join('\n')}`
                : 'Aucun code suggéré.';
            break;
          }
          case 'analyze': {
            const analysis = response.data;
            if (analysis.wordCloud && Array.isArray(analysis.wordCloud)) {
              analysis.wordCloud = analysis.wordCloud.map((item: any) => ({
                text: item.word || item.text,
                value: item.count || item.value || 1,
              }));
            }
            setAnalysisData(analysis);
            const totalWords = analysis?.totalWords || 0;
            const uniqueWords = analysis?.uniqueWords || 0;
            const topKeywords = analysis?.topKeywords || [];
            formattedResult = `📊 **Total mots :** ${totalWords}\n🔤 **Mots uniques :** ${uniqueWords}\n\n🏷️ **Mots-clés les plus fréquents :**\n${topKeywords
              .map((k: any) => `- ${k.word} (${k.count})`)
              .join('\n')}`;
            break;
          }
          case 'transcribe':
            formattedResult = response.data.message || 'Transcription en cours...';
            break;
          case 'sentiment': {
            formattedResult = response.data.data?.markdown || 'Analyse indisponible.';
            break;
         }  
          default:
            formattedResult = response.data.message || 'Service exécuté avec succès';
        }
        setResult(formattedResult);

        if (response.data?.quota) {
          checkQuotaWarning(response.data.quota);
        }
      } else {
        setError(
          response.data.error || response.data.message || 'Erreur lors du service'
        );
      }
    } catch (err: any) {
  console.error('❌ Erreur service:', err);

  // ✅ Gestion du quota IA
  if (
    err.response?.status === 403 &&
    err.response?.data?.code === 'QUOTA_EXCEEDED'
  ) {
    toast.addToast({
      type: 'error',
      title: 'Quota IA épuisé 🚫',
      message: `${err.response.data.message || err.response.data.error} Rendez-vous sur /pricing pour recharger.`,
      duration: 6000,
    });
    setError('');
    return;
  }

  // ✅ NOUVEAU : Afficher un message explicite pour toutes les autres erreurs
  const backendMessage =
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    'Erreur de connexion';

  // Cas spécifique : type de document non supporté pour le sentiment
  if (err.response?.status === 400 && serviceType === 'sentiment') {
    setError(
      `❌ ${backendMessage}\n\n💡 L'analyse de sentiment fonctionne uniquement sur les transcriptions et les mémos (pas sur les fichiers PDF/images).`
    );
  } else if (err.response?.status === 404) {
    setError(`❌ ${backendMessage}\n\n💡 Le document n'existe peut-être plus, ou vous n'y avez pas accès.`);
  } else {
    setError(`❌ ${backendMessage}`);
  }
} finally {
  setLoading(false);
}
  };

  // ✅ EXPORT PDF MODIFIÉ : Sauvegarde dans le projet avec titre personnalisé
  const exportPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const displayContentLocal =
      result || doc.content || doc.transcriptText || '';
    if (!displayContentLocal) {
      setError('Aucun contenu à exporter.');
      return;
    }

    // 1. Demander le titre à l'utilisateur
    const defaultTitle = `${sanitizeFileName(doc.name)}${serviceType ? '_' + serviceType : ''}`;
    const userTitle = window.prompt(
      "Titre du document à sauvegarder dans le projet :",
      defaultTitle
    );

    if (!userTitle) return; // L'utilisateur a annulé

    setSavingPdf(true);
    setError(null);

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
    title.textContent = userTitle; // On utilise le titre choisi
    title.style.fontSize = '22px';
    title.style.marginTop = '0';
    title.style.marginBottom = '8px';
    title.style.borderBottom = '2px solid #4A6CF7';
    title.style.paddingBottom = '8px';
    title.style.color = '#222';
    container.appendChild(title);

    const meta = dom.createElement('p');
    meta.textContent = `Type : ${doc.type} — Généré le ${new Date().toLocaleString(
      'fr-FR'
    )}`;
    meta.style.fontSize = '12px';
    meta.style.color = '#666';
    meta.style.fontStyle = 'italic';
    meta.style.marginTop = '0';
    meta.style.marginBottom = '24px';
    container.appendChild(meta);

    if (serviceType) {
      const badge = dom.createElement('div');
      badge.textContent = `🔧 Service : ${serviceType}`;
      badge.style.display = 'inline-block';
      badge.style.padding = '4px 10px';
      badge.style.backgroundColor = '#e6f0ff';
      badge.style.color = '#0052cc';
      badge.style.borderRadius = '12px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = 'bold';
      badge.style.marginBottom = '16px';
      container.appendChild(badge);
    }

    const content = dom.createElement('div');
    content.style.whiteSpace = 'pre-wrap';
    content.style.wordWrap = 'break-word';
    content.style.marginBottom = '24px';
    content.style.color = '#333';
    content.textContent = displayContentLocal;
    container.appendChild(content);

    if (analysisData?.wordCloud && analysisData.wordCloud.length > 0) {
      const wcTitle = dom.createElement('h2');
      wcTitle.textContent = '☁️ Nuage de mots';
      wcTitle.style.fontSize = '16px';
      wcTitle.style.marginTop = '24px';
      wcTitle.style.marginBottom = '12px';
      wcTitle.style.color = '#222';
      container.appendChild(wcTitle);

      const wcContainer = dom.createElement('div');
      wcContainer.style.display = 'flex';
      wcContainer.style.flexWrap = 'wrap';
      wcContainer.style.justifyContent = 'center';
      wcContainer.style.alignItems = 'center';
      wcContainer.style.gap = '8px 12px';
      wcContainer.style.padding = '16px';
      wcContainer.style.backgroundColor = '#f9f9f9';
      wcContainer.style.borderRadius = '8px';
      wcContainer.style.border = '1px solid #e0e0e0';

      const maxCount = Math.max(
        ...analysisData.wordCloud.map((w: any) => w.value || 1)
      );

      analysisData.wordCloud.forEach((item: any, idx: number) => {
        const span = dom.createElement('span');
        span.textContent = item.text || item.word || '';
        const size = 12 + 24 * ((item.value || 1) / maxCount);
        span.style.fontSize = `${size}px`;
        span.style.fontWeight = size > 24 ? 'bold' : 'normal';
        span.style.color = `hsl(${(idx * 37) % 360}, 70%, 50%)`;
        span.style.padding = '2px 4px';
        wcContainer.appendChild(span);
      });
      container.appendChild(wcContainer);
    }

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

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

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

      // ✅ 2. Au lieu de pdf.save(), on convertit en Blob et on envoie au backend
 // frontend/src/components/DocumentActions.tsx
// ... (dans la fonction exportPDF, vers la fin)

      const pdfBlob = pdf.output('blob');
      
      const formData = new FormData();
      formData.append('file', pdfBlob, `${sanitizeFileName(userTitle)}.pdf`);
      formData.append('title', userTitle);
      // ✅ NOUVEAU : Envoyer le texte brut pour que l'analyse fonctionne
      formData.append('content', displayContentLocal);

      await api.post(`/projects/${projectId}/files/upload-generated`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.addToast({ 
        type: 'success', 
        title: 'PDF sauvegardé dans le projet !',
        message: userTitle 
      });

      if (onRefresh) onRefresh(); // Rafraîchir la liste des documents

    } catch (err: any) {
      console.error('❌ Erreur export PDF:', err);
      setError(`Erreur PDF : ${err?.response?.data?.error || err?.message || 'inconnue'}`);
      toast.addToast({ type: 'error', title: 'Erreur lors de la sauvegarde PDF' });
    } finally {
      if (dom.body.contains(container)) {
        dom.body.removeChild(container);
      }
      setSavingPdf(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const displayContent = result || doc.content || doc.transcriptText || '';

  return (
    <div
      style={{
        padding: theme.spacing.md,
        backgroundColor: colors.gray[100],
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${colors.gray[200]}`,
        marginTop: theme.spacing.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.md,
            color: colors.dark,
          }}
        >
          📄 {doc.name}
        </h4>
        <Badge variant="info">{doc.type}</Badge>
      </div>

      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
          marginBottom: theme.spacing.md,
        }}
      >
        {isAudio && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => callService('transcribe')}
            disabled={loading}
          >
            🎙️ Transcrire
          </Button>
        )}
        {isText && (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={() => callService('summarize')}
              disabled={loading}
            >
              📝 Résumer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callService('entities')}
              disabled={loading}
            >
              🏷️ Entités
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callService('codes')}
              disabled={loading}
            >
              🏷️ Codes
            </Button>
            <Button
              size="sm"
              variant="info"
              onClick={() => callService('analyze')}
              disabled={loading}
            >
              📊 Analyser
            </Button>
            <Button
  size="sm"
  variant="outline"
  onClick={() => callService('sentiment')}
  disabled={loading}
  style={{ borderColor: '#f59e0b', color: '#d97706' }}
>
  😊 Sentiment
</Button>
          </>
        )}
        
        {/* ✅ BOUTON PDF MODIFIÉ */}
        <Button
          size="sm"
          variant="success"
          onClick={exportPDF}
          disabled={!displayContent || loading || savingPdf}
        >
          {savingPdf ? '⏳ Sauvegarde...' : '📥 PDF'}
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          onClick={handlePrint}
          disabled={!displayContent}
        >
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
            fontSize: theme.typography.fontSize.sm,
            lineHeight: '1.8',
            color: colors.dark,
          }}
        >
          <h5 style={{ margin: '0 0 8px 0' }}>📋 Résultat :</h5>
          {serviceType && (
            <Badge variant="info" style={{ marginBottom: '8px' }}>
              {serviceType}
            </Badge>
          )}
          
          <div className="markdown-content" style={{ marginTop: '8px' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>

          {analysisData && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0' }}>☁️ Nuage de mots</h5>
              {analysisData.wordCloud && analysisData.wordCloud.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px 12px',
                    padding: '16px',
                    backgroundColor: colors.gray[50],
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${colors.gray[200]}`,
                  }}
                >
                  {analysisData.wordCloud.map((item: any, idx: number) => {
                    const maxCount = Math.max(
                      ...analysisData.wordCloud.map((w: any) => w.value || 1)
                    );
                    const minSize = 12;
                    const maxSize = 36;
                    const size =
                      minSize +
                      (maxSize - minSize) * ((item.value || 1) / maxCount);
                    const hue = (idx * 37) % 360;
                    return (
                      <span
                        key={idx}
                        style={{
                          fontSize: `${size}px`,
                          fontWeight: size > 24 ? 'bold' : 'normal',
                          color: `hsl(${hue}, 70%, 50%)`,
                          padding: '2px 4px',
                          cursor: 'default',
                          transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = 'scale(1.1)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = 'scale(1)')
                        }
                        title={`${item.text || item.word} (${item.value || 1})`}
                      >
                        {item.text || item.word}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: colors.gray[500], fontSize: '14px' }}>
                  ⚠️ Aucun mot‑clé pour le nuage.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
