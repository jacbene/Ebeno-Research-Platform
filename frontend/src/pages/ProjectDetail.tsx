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

// ... interfaces inchangées ...

const ProjectDetail: React.FC = () => {
  const { colors } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  // ... états inchangés ...

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Projet
      const projectRes = await api.get(`/projects/${id}`);
      if (projectRes.data.success) setProject(projectRes.data.data);

      let url = `/transcriptions?projectId=${id}&limit=100`;
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

      const memoRes = await api.get(`/memos?projectId=${id}`);
      if (memoRes.status === 200) {
        setMemos(memoRes.data);
      }

      const filesRes = await api.get(`/projects/${id}/files`);
      if (filesRes.status === 200) {
        setProjectFiles(filesRes.data.files || []);
      }

    } catch (error) {
      console.error('Erreur chargement projet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!id) return;
    setAnalysisLoading(true);
    try {
      const response = await api.get(`/analysis/project/${id}`);
      if (response.status === 200) {
        setAnalysisData(response.data);
      }
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
        projectId: id
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/projects/${id}/export`, { responseType: 'blob' });
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

  // ... fonctions getStatusColor, getStatusLabel inchangées ...

  const allDocuments = useMemo(() => {
    // ... inchangé ...
  }, [projectFiles, textDocuments, sortBy]);

  const handleResultClick = (result: any) => {
    if (result.source === 'transcription') {
      navigate(`/transcription/${result.id}`);
    } else if (result.source === 'memo') {
      navigate(`/memo/${result.id}`);
    } else if (result.source === 'file') {
      setPreviewFile(result);
    } else {
      alert(`ID: ${result.id}\nSource: ${result.source}`);
    }
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
    // JSX inchangé, mais assurez-vous que les appels utilisent les fonctions corrigées
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '8px' : '0' }}>
      {/* ... le reste du rendu est inchangé, il utilise les fonctions ci-dessus ... */}
    </div>
  );
};

export default ProjectDetail;
