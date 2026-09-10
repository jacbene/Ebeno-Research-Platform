// frontend/src/pages/ProjectDetail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProjectMembers } from '../components/ProjectMembers';
import { WordCloudComponent } from '../components/WordCloud';
import { FileUpload } from '../components/FileUpload';
import { SearchBar } from '../components/SearchBar';
import { FiltersPanel } from '../components/FiltersPanel';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { SummaryButton } from '../components/SummaryButton';
import { DocumentActions } from '../components/DocumentActions';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';
import TranscriptionUploader from '../components/TranscriptionUploader';
import { api } from '../services/api';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

interface ContentItem {
  id: string;
  title: string;
  status?: string;
  transcriptText?: string | null;
  content?: string;
  createdAt: number;
  type?: 'audio' | 'text' | 'memo';
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedAt: number;
}

interface Filters {
  type: 'all' | 'audio' | 'text' | 'memo' | 'file';
  status: 'all' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fromDate: string;
  toDate: string;
}

// ============================================================
// ✅ Utilitaires d'affichage
// ============================================================

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '-';
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (!ts || isNaN(ts)) return '-';
  const date = new Date(ts);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['txt', 'md', 'rtf'].includes(ext)) return '📄';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return '🎵';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return '🎬';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  return '📎';
};

const getFileTypeLabel = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop() || 'FICHIER';
  return ext.toUpperCase();
};

const getFileTypeColor = (fileName: string): { bg: string; color: string } => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return { bg: '#fdecea', color: '#c0392b' };
  if (['doc', 'docx'].includes(ext)) return { bg: '#e6f0ff', color: '#0052cc' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { bg: '#e6f5e6', color: '#1a7a1a' };
  if (['ppt', 'pptx'].includes(ext)) return { bg: '#fff0e6', color: '#d35400' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { bg: '#fce6ff', color: '#8000a0' };
  if (['mp3', 'wav', 'm4a'].includes(ext)) return { bg: '#e6f9ff', color: '#0080a0' };
  if (['mp4', 'mov', 'avi'].includes(ext)) return { bg: '#ffe6f0', color: '#c00060' };
  if (['txt', 'md'].includes(ext)) return { bg: '#f0f0f0', color: '#555' };
  return { bg: '#f0f0f0', color: '#666' };
};

// ============================================================
// Composant principal
// ============================================================

const ProjectDetail: React.FC = () => {
  const { colors } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  // États
  const [project, setProject] = useState<Project | null>(null);
  const [transcriptions, setTranscriptions] = useState<ContentItem[]>([]);
  const [memos, setMemos] = useState<ContentItem[]>([]);
  const [projectFiles, setProjectFiles] = useState<UploadedFile[]>([]);
  const [textDocuments, setTextDocuments] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audio' | 'memos' | 'analysis' | 'members' | 'documents'>('audio');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [creatingMemo, setCreatingMemo] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    status: 'all',
    fromDate: '',
    toDate: '',
  });

  const encodedId = id ? encodeURIComponent(id) : '';

  useEffect(() => {
    if (!id) return;
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const projectRes = await api.get(`/projects/${encodedId}`);
      if (projectRes.data.success) setProject(projectRes.data.data);

      let url = `/transcriptions?projectId=${encodedId}&limit=100`;
      if (filters.type !== 'all') url += `&type=${filters.type}`;
      if (filters.status !== 'all') url += `&status=${filters.status}`;
      if (filters.fromDate) {
        const fromTimestamp = new Date(filters.fromDate).getTime();
        url += `&from=${fromTimestamp}`;
      }
      if (filters.toDate) {
        const toTimestamp = new Date(filters.toDate).getTime() + 86400000;
        url += `&to=${toTimestamp}`;
      }

      const transRes = await api.get(url);
      if (transRes.data.success) {
        const all = transRes.data.data.transcriptions || [];
        setTranscriptions(all.filter((t: any) => t.type === 'audio'));
        setTextDocuments(all.filter((t: any) => t.type === 'text'));
      }

      const memoRes = await api.get(`/memos?projectId=${encodedId}`);
      if (memoRes.status === 200) setMemos(memoRes.data);

      const filesRes = await api.get(`/projects/${encodedId}/files`);
      if (filesRes.status === 200) {
        setProjectFiles(filesRes.data.files || []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement projet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!id) return;
    setAnalysisLoading(true);
    try {
      const response = await api.get(`/analysis/project/${encodedId}`);
      if (response.status === 200) setAnalysisData(response.data);
    } catch (error) {
      console.error('Erreur analyse:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const createMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoTitle.trim() || !newMemoContent.trim()) return;
    setCreatingMemo(true);
    try {
      const response = await api.post('/memos', {
        title: newMemoTitle.trim(),
        content: newMemoContent.trim(),
        projectId: encodedId,
      });
      if (response.status === 200 || response.status === 201) {
        setNewMemoTitle('');
        setNewMemoContent('');
        fetchProjectData();
      }
    } catch (error) {
      console.error('Erreur création memo:', error);
    } finally {
      setCreatingMemo(false);
    }
  };

  const deleteMemo = async (memoId: string) => {
    if (!confirm('Supprimer ce memo ?')) return;
    try {
      await api.delete(`/memos/${memoId}`);
      fetchProjectData();
    } catch (error) {
      console.error('Erreur suppression memo:', error);
    }
  };

  // ✅ Suppression d'un document (fichier uploadé ou texte importé)
  const deleteDocument = async (doc: any) => {
    const confirmMsg = doc.type === 'file'
      ? `Supprimer le fichier "${doc.name}" ?\n\nCette action est irréversible. Le fichier sera supprimé de Cloudinary, ses entités et son résumé seront également supprimés.`
      : `Supprimer le document "${doc.name}" ?\n\nCette action est irréversible.`;

    if (!confirm(confirmMsg)) return;

    setDeletingId(doc.id);

    try {
      if (doc.type === 'file') {
        await api.delete(`/projects/${encodedId}/files/${doc.id}`);
        console.log(`✅ Fichier supprimé : ${doc.name}`);
      } else {
        await api.delete(`/transcriptions/${doc.id}`);
        console.log(`✅ Document texte supprimé : ${doc.name}`);
      }

      // Si le document supprimé était sélectionné, désélectionner
      if (selectedDocument?.id === doc.id) {
        setSelectedDocument(null);
      }

      // Rafraîchir la liste
      await fetchProjectData();
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/projects/${encodedId}/export`, { responseType: 'blob' });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers['content-disposition'];
      const fileName = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || `projet_${id}.zip`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export du projet');
    } finally {
      setExporting(false);
    }
  };

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

  const totalDocuments = projectFiles.length + textDocuments.length;

  const allDocuments = useMemo(() => {
    const docs = [
      ...projectFiles.map(f => ({
        id: f.id,
        name: f.fileName,
        date: f.uploadedAt,
        size: f.fileSize,
        mimeType: f.mimeType,
        type: 'file' as const,
        icon: getFileIcon(f.fileName),
        raw: f,
      })),
      ...textDocuments.map(d => ({
        id: d.id,
        name: d.title,
        date: d.createdAt,
        size: null,
        mimeType: 'text/plain',
        type: 'text' as const,
        icon: '📄',
        raw: d,
      })),
    ];

    switch (sortBy) {
      case 'name':
        return docs.sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return docs.sort((a, b) => b.date - a.date);
      case 'size':
        return docs.sort((a, b) => (b.size || 0) - (a.size || 0));
      case 'type':
        return docs.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return docs;
    }
  }, [projectFiles, textDocuments, sortBy]);

  const handleResultClick = (result: any) => {
    if (result.source === 'transcription') navigate(`/transcription/${result.id}`);
    else if (result.source === 'memo') navigate(`/memo/${result.id}`);
    else if (result.source === 'file') setPreviewFile(result);
    else alert(`ID: ${result.id}\nSource: ${result.source}`);
  };

  const tabs = [
    { key: 'audio', label: `🎙️ Audio (${transcriptions.length})` },
    { key: 'memos', label: `📝 Memos (${memos.length})` },
    { key: 'analysis', label: '📊 Analyse' },
    { key: 'members', label: '👥 Membres' },
    { key: 'documents', label: `📁 Documents (${totalDocuments})` },
  ];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
  if (!project) return <div style={{ padding: '40px', textAlign: 'center' }}>Projet non trouvé</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '8px' : '0' }}>
      {/* En-tête du projet */}
      <Card>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0' }}>{project.title}</h1>
            <p style={{ color: colors.gray[600], margin: '0 0 8px 0' }}>
              {project.description || 'Aucune description'}
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="info">{project.status}</Badge>
              <Badge variant="secondary">{project.visibility}</Badge>
              <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: theme.spacing.sm,
            flexWrap: 'wrap',
            width: isMobile ? '100%' : 'auto',
          }}>
            <Button variant="primary" onClick={() => navigate(`/transcription?projectId=${encodedId}`)} style={{ width: isMobile ? '100%' : 'auto' }}>
              🎙️ Nouvelle transcription
            </Button>
            <Button variant="outline" onClick={() => navigate(`/text-upload?projectId=${encodedId}`)} style={{ width: isMobile ? '100%' : 'auto' }}>
              📄 Importer un texte
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exporting} style={{ width: isMobile ? '100%' : 'auto' }}>
              {exporting ? '⏳ Export...' : '📥 Exporter le projet'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Barre de recherche */}
      <div style={{ marginTop: theme.spacing.lg }}>
        <SearchBar projectId={encodedId} onResults={setSearchResults} placeholder="Rechercher dans ce projet..." />
      </div>

      {/* Filtres */}
      <div style={{ marginTop: theme.spacing.sm }}>
        <FiltersPanel
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            fetchProjectData();
          }}
          onReset={() => {
            setFilters({ type: 'all', status: 'all', fromDate: '', toDate: '' });
            fetchProjectData();
          }}
        />
      </div>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <Card title="🔍 Résultats de la recherche" style={{ marginTop: theme.spacing.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {searchResults.map((result) => (
              <div
                key={`${result.source}-${result.id}`}
                style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: colors.white,
                  cursor: 'pointer',
                }}
                onClick={() => handleResultClick(result)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    <span>{result.source === 'transcription' ? (result.type === 'audio' ? '🎙️' : '📄') : result.source === 'memo' ? '📝' : '📎'}</span>
                    <strong>{result.title || result.fileName}</strong>
                    <Badge variant="info">{result.source === 'transcription' ? 'Transcription' : result.source === 'memo' ? 'Memo' : 'Fichier'}</Badge>
                  </div>
                  <span style={{ fontSize: '12px', color: colors.gray[500] }}>
                    {formatDate(result.createdAt || result.uploadedAt)}
                  </span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: colors.gray[600] }}>
                  {result.transcriptText || result.content || result.fileName || ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sélecteur d'onglets */}
      {isMobile ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <select
            value={activeTab}
            onChange={(e) => {
              const tab = e.target.value as any;
              setActiveTab(tab);
              if (tab === 'analysis') fetchAnalysis();
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.md,
              backgroundColor: colors.white,
              color: colors.dark,
            }}
          >
            {tabs.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, borderBottom: `1px solid ${colors.gray[200]}` }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'analysis') fetchAnalysis();
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: theme.typography.fontSize.md,
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                color: activeTab === tab.key ? colors.primary : colors.gray[600],
                borderBottom: activeTab === tab.key ? `2px solid ${colors.primary}` : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenu des onglets */}
      <div style={{ marginTop: theme.spacing.lg }}>
        {activeTab === 'audio' && (
          <Card title="Transcriptions audio">
            <TranscriptionUploader projectId={encodedId} onUploadComplete={() => fetchProjectData()} />
            <hr style={{ margin: '16px 0' }} />
            {transcriptions.length === 0 ? (
              <p style={{ color: colors.gray[500] }}>Aucune transcription audio.</p>
            ) : (
              transcriptions.map(t => (
                <div key={t.id} style={{ padding: theme.spacing.sm, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.title}</span>
                  <span style={{ color: getStatusColor(t.status || '') }}>{getStatusLabel(t.status || '')}</span>
                </div>
              ))
            )}
          </Card>
        )}

        {activeTab === 'memos' && (
          <Card title="Memos de recherche">
            <form onSubmit={createMemo} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
              <input
                type="text"
                placeholder="Titre du memo"
                value={newMemoTitle}
                onChange={(e) => setNewMemoTitle(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
              <textarea
                placeholder="Contenu du memo..."
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
                rows={3}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
              <Button type="submit" disabled={creatingMemo} style={{ alignSelf: 'flex-start' }}>
                {creatingMemo ? 'Création...' : '+ Ajouter un memo'}
              </Button>
            </form>

            {memos.length === 0 ? (
              <p style={{ color: colors.gray[500] }}>Aucun memo.</p>
            ) : (
              memos.map(m => (
                <div key={m.id} style={{ padding: theme.spacing.sm, borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    <div>
                      <strong>{m.title}</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#555' }}>{m.content}</p>
                      <small style={{ color: '#999' }}>{new Date(m.createdAt).toLocaleString('fr-FR')}</small>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button onClick={() => deleteMemo(m.id)} style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', alignSelf: 'flex-end' }}>✕</button>
                      <SummaryButton documentId={m.id} type="memo" onSummaryGenerated={() => {}} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {activeTab === 'analysis' && (
          <Card title="📊 Analyse qualitative du projet">
            {analysisLoading ? (
              <p>Chargement de l'analyse...</p>
            ) : analysisData && analysisData.totalWords > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                  <p><strong>Total mots :</strong> {analysisData.totalWords}</p>
                  <p><strong>Mots uniques :</strong> {analysisData.uniqueWords}</p>
                </div>
                <WordCloudComponent words={analysisData.wordCloud || []} width={isMobile ? 350 : 600} height={isMobile ? 250 : 400} />
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>🏷️ Mots-clés les plus fréquents</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {analysisData.topKeywords?.slice(0, 20).map((k: any) => (
                      <span key={k.word} style={{
                        padding: '4px 12px',
                        backgroundColor: colors.gray[100],
                        borderRadius: '20px',
                        fontSize: '13px',
                        color: colors.dark,
                      }}>
                        {k.word} ({k.count})
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p>Aucune donnée d'analyse disponible pour ce projet.</p>
                <Button variant="primary" size="sm" onClick={() => { setAnalysisLoading(true); fetchAnalysis(); }}>
                  🔄 Générer l'analyse
                </Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'members' && (
          <Card title="Gestion des membres">
            <ProjectMembers projectId={encodedId} />
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card title="📁 Documents du projet">
            <FileUpload projectId={id} onUploadSuccess={fetchProjectData} />

            <div style={{ marginTop: '16px' }}>
              {/* En-tête tri */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  📚 Liste des documents ({allDocuments.length})
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ padding: '6px 12px', border: `1px solid ${colors.gray[300]}`, borderRadius: '6px', fontSize: '14px', backgroundColor: colors.white }}
                >
                  <option value="date">📅 Trier par date</option>
                  <option value="name">🔤 Trier par nom</option>
                  <option value="size">📊 Trier par taille</option>
                  <option value="type">📂 Trier par type</option>
                </select>
              </div>

              {/* Liste des documents */}
              {allDocuments.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: colors.gray[500],
                  border: `2px dashed ${colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                  <p style={{ margin: 0 }}>Aucun document dans ce projet.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Uploadez un fichier pour commencer.</p>
                </div>
              ) : (
                allDocuments.map((doc) => {
                  const isSelected = selectedDocument?.id === doc.id;
                  const typeColor = getFileTypeColor(doc.name);
                  const isDeleting = deletingId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      style={{
                        padding: '12px 14px',
                        marginBottom: '8px',
                        border: `1px solid ${isSelected ? colors.primary : colors.gray[200]}`,
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: isSelected ? colors.primary + '0d' : colors.white,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        opacity: isDeleting ? 0.5 : 1,
                        boxShadow: isSelected ? `0 0 0 2px ${colors.primary}33` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = colors.gray[50];
                          e.currentTarget.style.borderColor = colors.gray[300];
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = colors.white;
                          e.currentTarget.style.borderColor = colors.gray[200];
                        }
                      }}
                    >
                      {/* Icône du fichier */}
                      <div style={{ fontSize: '32px', flexShrink: 0, lineHeight: 1 }}>
                        {doc.icon}
                      </div>

                      {/* Nom + métadonnées */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '14px',
                          color: colors.dark,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '4px',
                        }}>
                          {doc.name}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Badge type */}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: typeColor.bg,
                            color: typeColor.color,
                            letterSpacing: '0.5px',
                          }}>
                            {getFileTypeLabel(doc.name)}
                          </span>

                          {/* Taille */}
                          <span style={{ fontSize: '12px', color: colors.gray[600] }}>
                            💾 {doc.size !== null ? formatFileSize(doc.size) : 'N/A'}
                          </span>

                          {/* Source */}
                          <span style={{ fontSize: '12px', color: colors.gray[500] }}>
                            {doc.type === 'text' ? '📄 Texte importé' : '📎 Fichier uploadé'}
                          </span>
                        </div>

                        {/* Date d'insertion */}
                        <div style={{ fontSize: '11px', color: colors.gray[400], marginTop: '4px' }}>
                          📅 Ajouté le {formatDate(doc.date)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SummaryButton
                          documentId={doc.id}
                          type={doc.type === 'file' ? 'file' : 'transcription'}
                          onSummaryGenerated={() => {}}
                        />
                        <button
                          onClick={() => deleteDocument(doc)}
                          disabled={isDeleting}
                          title="Supprimer ce document"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: isDeleting ? colors.gray[400] : (colors.danger || '#dc3545'),
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.borderRadius.sm,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            lineHeight: 1,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {isDeleting ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedDocument && (
              <DocumentActions
                document={selectedDocument}
                projectId={encodedId}
                onRefresh={fetchProjectData}
              />
            )}
          </Card>
        )}
      </div>

      {/* Modal d'aperçu */}
      {previewFile && (
        <FilePreviewModal
          file={{
            id: previewFile.id,
            fileName: previewFile.name,
            filePath: previewFile.raw?.filePath || '',
            mimeType: previewFile.raw?.mimeType || 'application/octet-stream',
            fileSize: previewFile.size || 0,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
