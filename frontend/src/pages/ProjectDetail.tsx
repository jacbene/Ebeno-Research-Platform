// frontend/src/pages/ProjectDetail.tsx
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProjectMembers } from '../components/ProjectMembers';
const WordCloudComponent = lazy(() =>
  import('../components/WordCloud').then((m) => ({ default: m.WordCloudComponent }))
);
import { FileUpload } from '../components/FileUpload';
import { SearchBar } from '../components/SearchBar';
import { FiltersPanel } from '../components/FiltersPanel';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { SummaryButton } from '../components/SummaryButton';
import { DocumentActions } from '../components/DocumentActions';
import { PresenceBar } from '../components/PresenceBar';
import { ActivityFeed } from '../components/ActivityFeed';
import { TypingIndicator } from '../components/TypingIndicator';
import { PresenceDetail } from '../components/PresenceDetail';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useProjectSocket } from '../hooks/useProjectSocket';
import { useToast } from '../context/ToastContext';
import { breakpoints } from '../styles/breakpoints';
import TranscriptionUploader from '../components/TranscriptionUploader';
import { api } from '../services/api';
import { LanguageBadge } from '../components/LanguageBadge';
import TranslateModal from '../components/TranslateModal';
import CommentSection from '../components/CommentSection';

// ✅ ErrorBoundary local pour isoler les composants qui plantent
class LocalErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { hasError: boolean; errorName: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorName: '' };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`❌ ErrorBoundary [${this.props.name}] :`, error);
    console.trace();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#fdecea',
          border: '1px solid #dc3545',
          borderRadius: '6px',
          color: '#c0392b',
          fontSize: '13px',
        }}>
          ❌ Erreur dans le composant <strong>{this.props.name}</strong> — cet élément est désactivé temporairement.
        </div>
      );
    }
    return this.props.children;
  }
}

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
  deletedAt?: number | null;
}

interface Filters {
  type: 'all' | 'audio' | 'text' | 'memo' | 'file';
  status: 'all' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fromDate: string;
  toDate: string;
}

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

const ProjectDetail: React.FC = () => {
  const { colors } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const toast = useToast();
  const { t, i18n } = useTranslation();

  // ✅ Helper de formatage de date selon la langue active
  const formatDate = (timestamp: number | string | null | undefined): string => {
  if (timestamp === null || timestamp === undefined) return '-';
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (!ts || isNaN(ts)) return '-';
  try {
    return new Date(ts).toLocaleDateString(i18n.language, {
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

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [project, setProject] = useState<Project | null>(null);
  const [transcriptions, setTranscriptions] = useState<ContentItem[]>([]);
  const [memos, setMemos] = useState<ContentItem[]>([]);
  const [projectFiles, setProjectFiles] = useState<UploadedFile[]>([]);
  const [trashedFiles, setTrashedFiles] = useState<UploadedFile[]>([]);
  const [trashedTranscriptions, setTrashedTranscriptions] = useState<ContentItem[]>([]);
  const [textDocuments, setTextDocuments] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audio' | 'memos' | 'analysis' | 'members' | 'documents' | 'activity' | 'trash' | 'presence'>('audio');
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

const [editingProject, setEditingProject] = useState(false);
const [editTitle, setEditTitle] = useState('');
const [editDescription, setEditDescription] = useState('');
const [savingProject, setSavingProject] = useState(false);

// ✅ Modal de traduction (memo ou document)
const [translateTarget, setTranslateTarget] = useState<{
  open: boolean;
  documentId: string;
  documentTitle: string;
  documentType: 'memo' | 'text' | 'transcription';
}>({ open: false, documentId: '', documentTitle: '', documentType: 'memo' });

  const encodedId = id ? encodeURIComponent(id) : '';
  const isOwner = project?.userId === currentUser?.id;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return;
    fetchProjectData();
  }, [id]);

  const {
    connected,
    users,
    activities,
    setActivities,
    typingUsers,
    emitTyping,
    myColor,
  } = useProjectSocket({
    projectId: encodedId,
    userId: currentUser?.id,
    userName: currentUser?.name || currentUser?.email || t('nav.user'),
    userEmail: currentUser?.email,
    onDataChange: (event, data) => {
      console.log('🔄 Rafraîchissement auto suite à :', event);

      // ✅ Messages d'événements traduits
      const eventKeys: Record<string, { key: string; params: any; type: any }> = {
        'file-uploaded': { key: 'projectDetail.events.file-uploaded', params: { name: data?.file?.fileName || '' }, type: 'info' },
        'file-trashed': { key: 'projectDetail.events.file-trashed', params: { name: data?.fileName || '' }, type: 'warning' },
        'file-restored': { key: 'projectDetail.events.file-restored', params: { name: data?.fileName || '' }, type: 'success' },
        'file-deleted-permanently': { key: 'projectDetail.events.file-deleted-permanently', params: { name: data?.fileName || '' }, type: 'error' },
        'transcription-uploaded': { key: 'projectDetail.events.transcription-uploaded', params: { title: data?.title || '' }, type: 'info' },
        'transcription-trashed': { key: 'projectDetail.events.transcription-trashed', params: {}, type: 'warning' },
        'transcription-restored': { key: 'projectDetail.events.transcription-restored', params: {}, type: 'success' },
        'transcription-deleted-permanently': { key: 'projectDetail.events.transcription-deleted-permanently', params: {}, type: 'error' },
        'trash-emptied': { key: 'projectDetail.events.trash-emptied', params: { count: data?.count || 0 }, type: 'warning' },
        'document-uploaded': { key: 'projectDetail.events.document-uploaded', params: { name: data?.fileName || '' }, type: 'info' },
    		'memo-created': { key: 'projectDetail.events.memo-created', params: { title: data?.title || data?.memo?.title || '' }, type: 'info' },
      };

      const msg = eventKeys[event];
      if (msg) {
        toast.addToast({ type: msg.type, title: t(msg.key, msg.params), duration: 3000 });
      }

      fetchProjectData();
    },
  });

  useEffect(() => {
    const loadActivity = async () => {
      if (!encodedId) return;
      try {
        const res = await api.get(`/activity/project/${encodedId}?limit=50`);
        if (res.data.success) {
          setActivities(res.data.activity || []);
        }
      } catch (error) {
        console.error('❌ Erreur chargement activité:', error);
      }
    };
    loadActivity();
  }, [encodedId, setActivities]);

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
      if (filesRes.status === 200) setProjectFiles(filesRes.data.files || []);

      await fetchTrashedData();
    } catch (error) {
      console.error('❌ Erreur chargement projet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrashedData = async () => {
    try {
      const filesRes = await api.get(`/projects/${encodedId}/files/trash`);
      if (filesRes.status === 200) setTrashedFiles(filesRes.data.files || []);

      const transRes = await api.get(`/transcriptions/trash?projectId=${encodedId}`);
      if (transRes.status === 200) setTrashedTranscriptions(transRes.data.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement corbeille:', error);
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

  const openEditProject = () => {
    if (!isOwner) return;
    setEditTitle(project?.title || '');
    setEditDescription(project?.description || '');
    setEditingProject(true);
  };

  const saveProject = async () => {
    if (!editTitle.trim() || editTitle.trim().length < 3) {
      toast.addToast({ type: 'error', title: t('common.error'), message: t('projectDetail.editModal.titleRequired') });
      return;
    }
    setSavingProject(true);
    try {
      await api.put(`/projects/${encodedId}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      await fetchProjectData();
      setEditingProject(false);
      toast.addToast({ type: 'success', title: t('projectDetail.editModal.success') });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('projectDetail.editModal.error'),
      });
    } finally {
      setSavingProject(false);
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
        projectId: id,
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
    if (!confirm(t('projectDetail.memos.deleteConfirm'))) return;
    try {
      await api.delete(`/memos/${memoId}`);
      fetchProjectData();
    } catch (error) {
      console.error('Erreur suppression memo:', error);
    }
  };

  const deleteDocument = async (doc: any) => {
    const confirmMsg = t('projectDetail.trash.deleteConfirm', { name: doc.name });
    if (!confirm(confirmMsg)) return;

    setDeletingId(doc.id);
    try {
      const realId = doc.type === 'transcription' && doc.raw?._originalId
        ? doc.raw._originalId
        : doc.id;

      if (doc.type === 'file') {
        await api.delete(`/projects/${encodedId}/files/${realId}`);
      } else {
        await api.delete(`/transcriptions/${realId}`);
      }
      if (selectedDocument?.id === doc.id) setSelectedDocument(null);
      await fetchProjectData();
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      alert(error.response?.data?.error || t('projectDetail.trash.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const restoreItem = async (item: any, kind: 'file' | 'transcription') => {
    const name = item.fileName || item.title;
    if (!confirm(t('projectDetail.trash.restoreConfirm', { name }))) return;
    setDeletingId(item.id);
    try {
      if (kind === 'file') {
        await api.patch(`/projects/${encodedId}/files/${item.id}/restore`);
      } else {
        await api.patch(`/transcriptions/${item.id}/restore`);
      }
      await fetchProjectData();
    } catch (error: any) {
      console.error('❌ Erreur restauration:', error);
      alert(error.response?.data?.error || t('projectDetail.trash.restoreError'));
    } finally {
      setDeletingId(null);
    }
  };

  const permanentlyDeleteItem = async (item: any, kind: 'file' | 'transcription') => {
    const name = item.fileName || item.title;
    if (!confirm(t('projectDetail.trash.permanentDeleteConfirm', { name }))) return;

    setDeletingId(item.id);
    try {
      if (kind === 'file') {
        await api.delete(`/projects/${encodedId}/files/${item.id}/permanent`);
      } else {
        await api.delete(`/transcriptions/${item.id}/permanent`);
      }
      await fetchProjectData();
    } catch (error: any) {
      console.error('❌ Erreur suppression définitive:', error);
      alert(error.response?.data?.error || t('projectDetail.trash.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const emptyTrash = async () => {
    const total = trashedFiles.length + trashedTranscriptions.length;
    if (total === 0) {
      alert(t('projectDetail.trash.emptyAlready'));
      return;
    }
    if (!confirm(t('projectDetail.trash.emptyConfirm', { count: total }))) {
      return;
    }
    try {
      if (trashedFiles.length > 0) {
        await api.delete(`/projects/${encodedId}/files/trash/empty`);
      }
      if (trashedTranscriptions.length > 0) {
        await api.delete(`/transcriptions/trash/empty?projectId=${encodedId}`);
      }
      await fetchProjectData();
      alert(t('projectDetail.trash.emptySuccess'));
    } catch (error: any) {
      console.error('❌ Erreur vidage corbeille:', error);
      alert(error.response?.data?.error || t('projectDetail.trash.emptyError'));
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
      alert(t('projectDetail.actions.exporting'));
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
    return t(`projectDetail.status.${status}`) || t('projectDetail.status.unknown');
  };

  const totalDocuments = projectFiles.length + textDocuments.length + transcriptions.filter(t => t.status === 'COMPLETED').length;
  const totalTrashed = trashedFiles.length + trashedTranscriptions.length;

  const allDocuments = useMemo(() => {
    const docs: any[] = [
      ...projectFiles.map(f => ({
        id: f.id,
        name: f.fileName,
        date: f.uploadedAt,
        size: f.fileSize,
        mimeType: f.mimeType,
        type: 'file' as const,
        icon: getFileIcon(f.fileName),
        raw: f,
        status: null,
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
        status: d.status,
      })),
      ...transcriptions
  .filter((trans) => trans.status === 'COMPLETED' && trans.transcriptText && trans.transcriptText.trim().length > 0)
  .map((trans) => ({
    id: `transcript-${trans.id}`,
    name: `📝 ${trans.title}`,
    date: trans.createdAt,
    size: null,
    mimeType: 'text/plain',
    type: 'transcription' as const,
    icon: '📝',
    raw: { ...trans, _originalId: trans.id },
    status: 'COMPLETED',
  })),
    ];

    switch (sortBy) {
      case 'name': return docs.sort((a, b) => a.name.localeCompare(b.name));
      case 'date': return docs.sort((a, b) => b.date - a.date);
      case 'size': return docs.sort((a, b) => (b.size || 0) - (a.size || 0));
      case 'type': return docs.sort((a, b) => a.type.localeCompare(b.type));
      default: return docs;
    }
  }, [projectFiles, textDocuments, transcriptions, sortBy]);

  const handleResultClick = (result: any) => {
    if (result.source === 'transcription') navigate(`/transcription/${result.id}`);
    else if (result.source === 'memo') navigate(`/memo/${result.id}`);
    else if (result.source === 'file') setPreviewFile(result);
  };

  // ✅ Onglets traduits
  const tabs = [
    { key: 'audio', label: t('projectDetail.tabs.audio', { count: transcriptions.length }) },
    { key: 'memos', label: t('projectDetail.tabs.memos', { count: memos.length }) },
    { key: 'analysis', label: t('projectDetail.tabs.analysis') },
    { key: 'members', label: t('projectDetail.tabs.members') },
    { key: 'documents', label: t('projectDetail.tabs.documents', { count: totalDocuments }) },
    { key: 'activity', label: t('projectDetail.tabs.activity', { count: activities.length }) },
    { key: 'trash', label: t('projectDetail.tabs.trash', { count: totalTrashed }) },
    { key: 'presence', label: t('projectDetail.tabs.presence', { count: users.length }) },
  ];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('projectDetail.loading')}</div>;
  if (!project) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('projectDetail.notFound')}</div>;

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
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>{project.title}</h1>

              {isOwner && (
                <>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '10px',
                    backgroundColor: '#ffc107',
                    color: '#856404',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {t('projectDetail.owner')}
                  </span>
                  <button
                    onClick={openEditProject}
                    title={t('projectDetail.editProject')}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: colors.primary,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary + '15')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>

            <p style={{ color: colors.gray[600], margin: '0 0 8px 0' }}>
              {project.description || t('projectDetail.noDescription')}
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="info">{project.status}</Badge>
              <Badge variant="secondary">{project.visibility}</Badge>
              <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                {t('projectDetail.createdOn', { date: new Date(project.createdAt).toLocaleDateString(i18n.language) })}
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
              {t('projectDetail.actions.newTranscription')}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/text-upload?projectId=${encodedId}`)} style={{ width: isMobile ? '100%' : 'auto' }}>
              {t('projectDetail.actions.importText')}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exporting} style={{ width: isMobile ? '100%' : 'auto' }}>
              {exporting ? t('projectDetail.actions.exporting') : t('projectDetail.actions.exportProject')}
            </Button>
          </div>
        </div>
      </Card>

     <LocalErrorBoundary name="PresenceBar">
       <PresenceBar users={Array.isArray(users) ? users : []} connected={!!connected} />
     </LocalErrorBoundary>

      <div style={{ marginTop: theme.spacing.lg }}>
       <LocalErrorBoundary name="SearchBar">
         <SearchBar
             projectId={encodedId}
             onResults={setSearchResults}
             placeholder={t('projectDetail.searchPlaceholder')}
             />
       </LocalErrorBoundary>
      </div>

      <div style={{ marginTop: theme.spacing.sm }}>
        <LocalErrorBoundary name="FiltersPanel">
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
</LocalErrorBoundary>
      </div>

      {searchResults.length > 0 && (
        <Card title={t('projectDetail.searchResults')} style={{ marginTop: theme.spacing.lg }}>
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
                    <Badge variant="info">
                      {result.source === 'transcription' ? t('projectDetail.sourceTypes.transcription') :
                       result.source === 'memo' ? t('projectDetail.sourceTypes.memo') :
                       t('projectDetail.sourceTypes.file')}
                    </Badge>
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
        <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, borderBottom: `1px solid ${colors.gray[200]}`, flexWrap: 'wrap' }}>
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

      <div style={{ marginTop: theme.spacing.lg }}>
        {activeTab === 'audio' && (
  <Card title={t('projectDetail.audio.title')}>
    <TranscriptionUploader projectId={id || ''} onUploadComplete={() => fetchProjectData()} />
    <hr style={{ margin: '16px 0' }} />
    {transcriptions.length === 0 ? (
      <p style={{ color: colors.gray[500] }}>{t('projectDetail.audio.empty')}</p>
    ) : (
      transcriptions.map((trans) => (
        <div
          key={trans.id}
          style={{
            padding: theme.spacing.sm,
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span>{trans.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: getStatusColor(trans.status || '') }}>
              {getStatusLabel(trans.status || '')}
            </span>
            {trans.status === 'FAILED' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(t('projectDetail.audio.retryConfirm'))) return;
                  try {
                    await api.post(`/transcriptions/${trans.id}/retry`);
                    toast.addToast({ type: 'info', title: t('projectDetail.audio.retrySuccess') });
                    setTimeout(() => fetchProjectData(), 1000);
                  } catch (err: any) {
                    toast.addToast({
                      type: 'error',
                      title: t('common.error'),
                      message: err.response?.data?.message || t('projectDetail.audio.retryError'),
                    });
                  }
                }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {t('projectDetail.audio.retry')}
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </Card>
)}
        {activeTab === 'memos' && (
          <Card title={t('projectDetail.memos.title')}>
            <form onSubmit={createMemo} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
              <input
                type="text"
                placeholder={t('projectDetail.memos.placeholderTitle')}
                value={newMemoTitle}
                onChange={(e) => setNewMemoTitle(e.target.value)}
                onFocus={() => emitTyping('memo-title', true)}
                onBlur={() => emitTyping('memo-title', false)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
              <textarea
                placeholder={t('projectDetail.memos.placeholderContent')}
                value={newMemoContent}
                onChange={(e) => {
                  setNewMemoContent(e.target.value);
                  emitTyping('memo', true);
                  if ((window as any).__typingTimeout) {
                    clearTimeout((window as any).__typingTimeout);
                  }
                  (window as any).__typingTimeout = setTimeout(() => {
                    emitTyping('memo', false);
                  }, 1500);
                }}
                onFocus={() => emitTyping('memo', true)}
                onBlur={() => emitTyping('memo', false)}
                rows={3}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
              <Button type="submit" disabled={creatingMemo} style={{ alignSelf: 'flex-start' }}>
                {creatingMemo ? t('projectDetail.memos.adding') : t('projectDetail.memos.addButton')}
              </Button>
            </form>

            <TypingIndicator typingUsers={typingUsers} context="memo" />

            {memos.length === 0 ? (
              <p style={{ color: colors.gray[500] }}>{t('projectDetail.memos.empty')}</p>
            ) : (
              memos.map(m => (
              <div key={m.id} style={{ padding: theme.spacing.sm, borderBottom: '1px solid #eee' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.sm }}>
    <div>
      <strong>{m.title}</strong>
      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#555' }}>{m.content}</p>
      <small style={{ color: '#999' }}>{new Date(m.createdAt).toLocaleString(i18n.language)}</small>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
      <button onClick={() => deleteMemo(m.id)} style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', alignSelf: 'flex-end' }}>✕</button>
      <SummaryButton documentId={m.id} type="memo" onSummaryGenerated={() => {}} />
      <button
        onClick={() =>
          setTranslateTarget({
            open: true,
            documentId: m.id,
            documentTitle: m.title,
            documentType: 'memo',
          })
        }
        title={t('translation.translateTooltip')}
        style={{
          padding: '4px 10px',
          backgroundColor: colors.gray[100] || '#f5f5f5',
          color: colors.primary,
          border: `1px solid ${colors.primary}40`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          alignSelf: 'flex-end',
        }}
      >
        🌍 {t('translation.translateButton')}
      </button>
    </div>
  </div>

  {/* ✅ Commentaires sur le memo */}
  <CommentSection
    documentId={m.id}
    documentType="memo"
    compact
  />
</div>
              ))
            )}
          </Card>
        )}

        {activeTab === 'analysis' && (
          <Card title={t('projectDetail.analysis.title')}>
            {analysisLoading ? (
              <p>{t('projectDetail.analysis.loading')}</p>
            ) : analysisData && analysisData.totalWords > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                  <p><strong>{t('projectDetail.analysis.totalWords')} :</strong> {analysisData.totalWords}</p>
                  <p><strong>{t('projectDetail.analysis.uniqueWords')} :</strong> {analysisData.uniqueWords}</p>
                </div>
                <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>{t('projectDetail.analysis.wordCloudLoading')}</div>}>
                  <WordCloudComponent
                    words={analysisData.wordCloud || []}
                    width={isMobile ? 350 : 600}
                    height={isMobile ? 250 : 400}
                  />
                </Suspense>
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{t('projectDetail.analysis.keywords')}</h4>
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
                <p>{t('projectDetail.analysis.noData')}</p>
                <Button variant="primary" size="sm" onClick={() => { setAnalysisLoading(true); fetchAnalysis(); }}>
                  {t('projectDetail.analysis.generate')}
                </Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'members' && (
          <Card title={t('projectDetail.members.title')}>
            <LocalErrorBoundary name="ProjectMembers">
  <ProjectMembers projectId={encodedId} />
</LocalErrorBoundary>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card title={t('projectDetail.activity.title')}>
            <LocalErrorBoundary name="ActivityFeed">
  <ActivityFeed activities={Array.isArray(activities) ? activities : []} />
</LocalErrorBoundary>
          </Card>
        )}

        {activeTab === 'presence' && (
          <Card title={t('projectDetail.presence.title')}>
            <LocalErrorBoundary name="PresenceDetail">
  <PresenceDetail
    users={Array.isArray(users) ? users : []}
    connected={!!connected}
    myColor={myColor || '#4A6CF7'}
    currentUserId={currentUser?.id}
  />
</LocalErrorBoundary>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card title={t('projectDetail.documents.title')}>
            <FileUpload projectId={id} onUploadSuccess={fetchProjectData} />

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {t('projectDetail.documents.listTitle', { count: allDocuments.length })}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ padding: '6px 12px', border: `1px solid ${colors.gray[300]}`, borderRadius: '6px', fontSize: '14px', backgroundColor: colors.white }}
                >
                  <option value="date">{t('projectDetail.documents.sortDate')}</option>
                  <option value="name">{t('projectDetail.documents.sortName')}</option>
                  <option value="size">{t('projectDetail.documents.sortSize')}</option>
                  <option value="type">{t('projectDetail.documents.sortType')}</option>
                </select>
              </div>

              {allDocuments.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: colors.gray[500],
                  border: `2px dashed ${colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                  <p style={{ margin: 0 }}>{t('projectDetail.documents.empty')}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{t('projectDetail.documents.emptyHint')}</p>
                </div>
              ) : (
                allDocuments.map((doc) => {
                  const isSelected = selectedDocument?.id === doc.id;
                  const typeColor = getFileTypeColor(doc.name);
                  const isDeleting = deletingId === doc.id;
                  const statusColor = doc.status ? getStatusColor(doc.status) : null;

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
    opacity: isDeleting ? 0.5 : 1,
    boxShadow: isSelected ? `0 0 0 2px ${colors.primary}33` : 'none',
    boxSizing: 'border-box',
    width: '100%',
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
  {/* ✅ Ligne 1 : icône + contenu + actions */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ fontSize: '32px', flexShrink: 0, lineHeight: 1 }}>{doc.icon}</div>

    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Contenu SANS les commentaires ici */}
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
        <span style={{
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          fontWeight: 'bold',
          backgroundColor: typeColor.bg,
          color: typeColor.color,
          letterSpacing: '0.5px',
        }}>
          {doc.type === 'transcription' ? t('projectDetail.documents.typeTranscription') : getFileTypeLabel(doc.name)}
        </span>

        <LanguageBadge language={doc.raw?.language} />

        {statusColor && (
          <span style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 'bold',
            backgroundColor: statusColor + '20',
            color: statusColor,
          }}>
            {getStatusLabel(doc.status || '')}
          </span>
        )}

        {doc.size !== null && (
          <span style={{ fontSize: '12px', color: colors.gray[600] }}>
            💾 {formatFileSize(doc.size)}
          </span>
        )}

        <span style={{ fontSize: '12px', color: colors.gray[500] }}>
          {doc.type === 'text' ? t('projectDetail.documents.typeText') :
           doc.type === 'transcription' ? t('projectDetail.documents.typeTranscriptionShort') :
           t('projectDetail.documents.typeFile')}
        </span>
      </div>

      <div style={{ fontSize: '11px', color: colors.gray[400], marginTop: '4px' }}>
        {t('projectDetail.documents.addedOn', { date: formatDate(doc.date) })}
      </div>
    </div>

    <div
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ✅ Bouton Traduire (textes importés + transcriptions) */}
      {(doc.type === 'text' || doc.type === 'transcription') && (
        <button
          onClick={() =>
            setTranslateTarget({
              open: true,
              documentId: doc.type === 'transcription' && doc.raw?._originalId
                ? doc.raw._originalId
                : doc.id,
              documentTitle: doc.name,
              documentType: doc.type === 'text' ? 'text' : 'transcription',
            })
          }
          title={t('translation.translateTooltip')}
          style={{
            padding: '6px 10px',
            backgroundColor: colors.gray[100] || '#f5f5f5',
            color: colors.primary,
            border: `1px solid ${colors.primary}40`,
            borderRadius: theme.borderRadius.sm,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          🌍
        </button>
      )}

      <SummaryButton
        documentId={doc.type === 'transcription' && doc.raw?._originalId ? doc.raw._originalId : doc.id}
        type={doc.type === 'file' ? 'file' : 'transcription'}
        onSummaryGenerated={() => {}}
      />
      <button
        onClick={() => deleteDocument(doc)}
        disabled={isDeleting}
        title={t('projectDetail.documents.deleteTooltip')}
        style={{
          padding: '6px 10px',
          backgroundColor: isDeleting ? colors.gray[400] : (colors.danger || '#dc3545'),
          color: 'white',
          border: 'none',
          borderRadius: theme.borderRadius.sm,
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          lineHeight: 1,
        }}
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>
    </div>
  </div>

  {/* ✅ Ligne 2 : Commentaires PLEINE LARGEUR (hors flex-row) */}
  {(doc.type === 'transcription' || doc.type === 'text') && (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ width: '100%', marginTop: '8px' }}
    >
      <CommentSection
        documentId={
          doc.type === 'transcription' && doc.raw?._originalId
            ? doc.raw._originalId
            : doc.id
        }
        documentType="transcription"
        compact
      />
    </div>
  )}
</div>
            
                  );
                })
              )}
            </div>

            {selectedDocument && (
              <DocumentActions
                document={{
                  ...selectedDocument,
                  id: selectedDocument.raw?._originalId || selectedDocument.id,
                }}
                projectId={encodedId}
                onRefresh={fetchProjectData}
              />
            )}
          </Card>
        )}

        {activeTab === 'trash' && (
          <Card title={t('projectDetail.trash.title')}>
            {totalTrashed === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.gray[500],
                border: `2px dashed ${colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🗑️</div>
                <p style={{ margin: 0 }}>{t('projectDetail.trash.empty')}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  {t('projectDetail.trash.emptyHint')}
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div style={{ fontSize: '13px', color: '#856404', flex: 1 }}>
                    {t('projectDetail.trash.warning', { count: totalTrashed })}
                  </div>
                  <button
                    onClick={emptyTrash}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: theme.borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('projectDetail.trash.emptyButton')}
                  </button>
                </div>

                {trashedFiles.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.gray[700] }}>
                      {t('projectDetail.trash.files', { count: trashedFiles.length })}
                    </h4>
                    {trashedFiles.map((doc) => {
                      const isDeleting = deletingId === doc.id;
                      const typeColor = getFileTypeColor(doc.fileName);
                      const icon = getFileIcon(doc.fileName);

                      return (
                        <div
                          key={doc.id}
                          style={{
                            padding: '12px 14px',
                            marginBottom: '8px',
                            border: `1px solid ${colors.gray[200]}`,
                            borderRadius: theme.borderRadius.md,
                            backgroundColor: '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            opacity: isDeleting ? 0.5 : 0.9,
                          }}
                        >
                          <div style={{ fontSize: '32px', flexShrink: 0, lineHeight: 1, filter: 'grayscale(0.4)' }}>
                            {icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '600',
                              fontSize: '14px',
                              color: colors.gray[600],
                              textDecoration: 'line-through',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px',
                            }}>
                              {doc.fileName}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                backgroundColor: typeColor.bg,
                                color: typeColor.color,
                              }}>
                                {getFileTypeLabel(doc.fileName)}
                              </span>
                              <span style={{ fontSize: '12px', color: colors.gray[600] }}>
                                💾 {formatFileSize(doc.fileSize)}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: colors.gray[400], marginTop: '4px' }}>
                              {t('projectDetail.trash.deletedOn', { date: formatDate(doc.deletedAt) })}
                            </div>
                          </div>

                          <div style={{ flexShrink: 0, display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => restoreItem(doc, 'file')}
                              disabled={isDeleting}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.borderRadius.sm,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                              }}
                            >
                              {t('projectDetail.trash.restore')}
                            </button>
                            <button
                              onClick={() => permanentlyDeleteItem(doc, 'file')}
                              disabled={isDeleting}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.borderRadius.sm,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              {isDeleting ? '⏳' : '💥'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {trashedTranscriptions.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.gray[700] }}>
                      {t('projectDetail.trash.transcriptions', { count: trashedTranscriptions.length })}
                    </h4>
                    {trashedTranscriptions.map((t_item) => {
                      const isDeleting = deletingId === t_item.id;
                      const icon = t_item.type === 'audio' ? '🎙️' : '📄';

                      return (
                        <div
                          key={t_item.id}
                          style={{
                            padding: '12px 14px',
                            marginBottom: '8px',
                            border: `1px solid ${colors.gray[200]}`,
                            borderRadius: theme.borderRadius.md,
                            backgroundColor: '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            opacity: isDeleting ? 0.5 : 0.9,
                          }}
                        >
                          <div style={{ fontSize: '32px', flexShrink: 0, lineHeight: 1, filter: 'grayscale(0.4)' }}>
                            {icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '600',
                              fontSize: '14px',
                              color: colors.gray[600],
                              textDecoration: 'line-through',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px',
                            }}>
                              {t_item.title}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                backgroundColor: '#e6f0ff',
                                color: '#0052cc',
                              }}>
                                {t_item.type === 'audio' ? 'AUDIO' : 'TEXTE'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: colors.gray[400], marginTop: '4px' }}>
                              {t('projectDetail.trash.deletedOn', { date: formatDate((t_item as any).deletedAt) })}
                            </div>
                          </div>

                          <div style={{ flexShrink: 0, display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => restoreItem(t_item, 'transcription')}
                              disabled={isDeleting}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.borderRadius.sm,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                              }}
                            >
                              {t('projectDetail.trash.restore')}
                            </button>
                            <button
                              onClick={() => permanentlyDeleteItem(t_item, 'transcription')}
                              disabled={isDeleting}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.borderRadius.sm,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              {isDeleting ? '⏳' : '💥'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>

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

      {editingProject && isOwner && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => !savingProject && setEditingProject(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.white,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>{t('projectDetail.editModal.title')}</h2>

            <label style={{ display: 'block', fontSize: '13px', color: colors.gray[700], marginBottom: '4px' }}>
              {t('projectDetail.editModal.titleLabel')}
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={savingProject}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
                marginBottom: theme.spacing.md,
                outline: 'none',
              }}
            />

            <label style={{ display: 'block', fontSize: '13px', color: colors.gray[700], marginBottom: '4px' }}>
              {t('projectDetail.editModal.descriptionLabel')}
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={savingProject}
              rows={4}
              placeholder={t('projectDetail.editModal.descriptionPlaceholder')}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: theme.spacing.lg,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setEditingProject(false)} disabled={savingProject}>
                {t('projectDetail.editModal.cancel')}
              </Button>
              <Button variant="primary" onClick={saveProject} disabled={savingProject}>
                {savingProject ? t('projectDetail.editModal.saving') : t('projectDetail.editModal.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
   {editingProject && isOwner && (
  <div
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}
    onClick={() => !savingProject && setEditingProject(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: colors.white,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{t('projectDetail.editModal.title')}</h2>

      <label style={{ display: 'block', fontSize: '13px', color: colors.gray[700], marginBottom: '4px' }}>
        {t('projectDetail.editModal.titleLabel')}
      </label>
      <input
        type="text"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        disabled={savingProject}
        style={{
          width: '100%',
          padding: '10px',
          border: `1px solid ${colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          fontSize: '14px',
          marginBottom: theme.spacing.md,
          outline: 'none',
        }}
      />

      <label style={{ display: 'block', fontSize: '13px', color: colors.gray[700], marginBottom: '4px' }}>
        {t('projectDetail.editModal.descriptionLabel')}
      </label>
      <textarea
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        disabled={savingProject}
        rows={4}
        placeholder={t('projectDetail.editModal.descriptionPlaceholder')}
        style={{
          width: '100%',
          padding: '10px',
          border: `1px solid ${colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          fontSize: '14px',
          resize: 'vertical',
          marginBottom: theme.spacing.lg,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={() => setEditingProject(false)} disabled={savingProject}>
          {t('projectDetail.editModal.cancel')}
        </Button>
        <Button variant="primary" onClick={saveProject} disabled={savingProject}>
          {savingProject ? t('projectDetail.editModal.saving') : t('projectDetail.editModal.save')}
        </Button>
      </div>
    </div>
  </div>
)} 

      {/* ✅ Modal de traduction */}
<TranslateModal
  isOpen={translateTarget.open}
  onClose={() => setTranslateTarget({ ...translateTarget, open: false })}
  documentId={translateTarget.documentId}
  documentType={translateTarget.documentType}
  documentTitle={translateTarget.documentTitle}
/>
    </div>
  );
};

export default ProjectDetail;
