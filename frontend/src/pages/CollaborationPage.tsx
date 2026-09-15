// frontend/src/pages/CollaborationPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PresenceBar } from '../components/PresenceBar';
import { CollaborativeEditor } from '../components/CollaborativeEditor';
import { useProjectSocket } from '../hooks/useProjectSocket';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: number;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  userId: string;
}

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

// ============================================================
// Utilitaires
// ============================================================

const sanitizeFileName = (name: string): string => {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'document';
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ✅ Construit un HTML réutilisable pour PDF et Word
const buildDocumentHtml = (doc: Document): string => {
  const contentHtml = escapeHtml(doc.content || '')
    .split('\n')
    .map((line) => `<p style="margin: 0 0 8px 0; line-height: 1.6;">${line || '&nbsp;'}</p>`)
    .join('');

  return `
    <h1 style="font-size: 24px; margin: 0 0 8px 0; color: #333; border-bottom: 2px solid #4A6CF7; padding-bottom: 8px; font-family: Arial, sans-serif;">
      ${escapeHtml(doc.title)}
    </h1>
    <p style="font-size: 12px; color: #666; font-style: italic; margin: 0 0 24px 0; font-family: Arial, sans-serif;">
      Version ${doc.version} — ${new Date(doc.updatedAt).toLocaleString('fr-FR')}
    </p>
    <div style="font-size: 12px; line-height: 1.6; color: #333; font-family: Arial, sans-serif;">
      ${contentHtml}
    </div>
    <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; font-family: Arial, sans-serif;">
      Document généré depuis Ebeno Research Platform
    </div>
  `;
};

// ✅ TXT
const downloadAsTxt = (doc: Document) => {
  const separator = '='.repeat(Math.min(doc.title.length, 60));
  const content = `${doc.title}\n${separator}\n\n${doc.content || ''}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(doc.title)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ✅ DOCX (Word) via HTML → .doc (technique standard, supportée par Word/LibreOffice/Google Docs)
const downloadAsDocx = (doc: Document) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(doc.title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #4A6CF7; padding-bottom: 8px; }
        p { line-height: 1.6; }
      </style>
    </head>
    <body>
      ${buildDocumentHtml(doc)}
    </body>
    </html>
  `;

  // Type MIME spécial pour Word
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(doc.title)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ✅ PDF via html2pdf
const downloadAsPdf = async (doc: Document): Promise<void> => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#000';
  container.style.backgroundColor = '#fff';
  container.style.maxWidth = '800px';
  container.innerHTML = buildDocumentHtml(doc);

  const options = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `${sanitizeFileName(doc.title)}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  };

  await html2pdf().from(container).set(options).save();
};

// ============================================================
// Composant principal
// ============================================================

const CollaborationPage: React.FC = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [openDownloadMenuId, setOpenDownloadMenuId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const rawProjectId = selectedProject?.id || '';
  const encodedProjectId = rawProjectId ? encodeURIComponent(rawProjectId) : '';

  const {
    connected,
    myColor,
    users: projectUsers,
    documentUsers,
    documentContent,
    setDocumentContent,
    documentTyping,
    joinDocument,
    leaveDocument,
    editDocument,
    emitTyping,
  } = useProjectSocket({
    projectId: encodedProjectId,
    userId: currentUser?.id,
    userName: currentUser?.name || currentUser?.email || 'Utilisateur',
    userEmail: currentUser?.email,
    onDataChange: (event, data) => {
      if (event === 'document-updated-title' && data?.projectId === rawProjectId) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === data.documentId ? { ...d, title: data.newTitle } : d))
        );
        if (selectedDoc?.id === data.documentId) {
          setSelectedDoc((prev) => (prev ? { ...prev, title: data.newTitle } : prev));
        }
        toast.addToast({
          type: 'info',
          title: `📝 ${data.updatedByName} a renommé le document en "${data.newTitle}"`,
        });
      }
    },
  });

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get('/projects');
        const list: Project[] = res.data.data || [];
        setProjects(list);

        const urlProjectId = searchParams.get('projectId');
        if (urlProjectId) {
          const found = list.find((p) => p.id === urlProjectId);
          if (found) setSelectedProject(found);
        } else if (list.length > 0) {
          setSelectedProject(list[0]);
        }
      } catch (e) {
        console.error('Erreur chargement projets:', e);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!encodedProjectId) return;
    const loadMembers = async () => {
      try {
        const res = await api.get(`/projects/${encodedProjectId}/members`);
        setMembers(res.data || []);
      } catch (e) {
        console.error('Erreur membres:', e);
      }
    };
    loadMembers();
  }, [encodedProjectId]);

  useEffect(() => {
    if (!encodedProjectId) return;
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/collaboration/project/${encodedProjectId}`);
        if (response.data.success) setDocuments(response.data.data || []);
      } catch (error) {
        console.error('❌ Erreur documents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [encodedProjectId]);

  useEffect(() => {
    if (!selectedDoc?.id) return;
    joinDocument(selectedDoc.id);
    return () => {
      leaveDocument(selectedDoc.id);
    };
  }, [selectedDoc?.id, joinDocument, leaveDocument]);

  useEffect(() => {
    if (selectedDoc && documentContent !== selectedDoc.content) {
      setSelectedDoc((prev) => (prev ? { ...prev, content: documentContent } : prev));
    }
  }, [documentContent]);

  useEffect(() => {
    if (editingDocId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingDocId]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDownloadMenuId(null);
    if (openDownloadMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDownloadMenuId]);

  const handleContentChange = (newContent: string) => {
    if (!selectedDoc) return;
    setDocumentContent(newContent);
    setSelectedDoc((prev) => (prev ? { ...prev, content: newContent } : prev));
    editDocument(selectedDoc.id, newContent);

    emitTyping(`doc-${selectedDoc.id}`, true);
    if ((window as any).__docTypingTimeout) clearTimeout((window as any).__docTypingTimeout);
    (window as any).__docTypingTimeout = setTimeout(() => {
      emitTyping(`doc-${selectedDoc.id}`, false);
    }, 1500);
  };

  const handleCursorMove = (position: number) => {
    if (!selectedDoc) return;
    editDocument(selectedDoc.id, documentContent, position);
  };

  const createDocument = async () => {
    if (!rawProjectId) {
      alert('Veuillez sélectionner un projet');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/collaboration', {
        title: `Document ${documents.length + 1}`,
        projectId: rawProjectId,
        content: 'Contenu initial...',
      });

      if (response.data.success) {
        const newDoc = response.data.data;
        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setDocumentContent(newDoc.content || '');
      }
    } catch (error: any) {
      console.error('❌ Erreur création document:', error);
      alert(error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (
    doc: Document,
    format: 'txt' | 'docx' | 'pdf',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setOpenDownloadMenuId(null);
    setDownloading(doc.id);

    try {
      if (format === 'txt') {
        downloadAsTxt(doc);
        toast.addToast({ type: 'success', title: `📥 "${doc.title}.txt" téléchargé` });
      } else if (format === 'docx') {
        downloadAsDocx(doc);
        toast.addToast({ type: 'success', title: `📥 "${doc.title}.doc" téléchargé` });
      } else {
        await downloadAsPdf(doc);
        toast.addToast({ type: 'success', title: `📥 "${doc.title}.pdf" téléchargé` });
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement:', error);
      toast.addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de télécharger le document',
      });
    } finally {
      setDownloading(null);
    }
  };

  const startRenaming = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditingTitle(doc.title);
    setOpenDownloadMenuId(null);
  };

  const cancelRenaming = () => {
    setEditingDocId(null);
    setEditingTitle('');
  };

  const saveRenaming = async (docId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      cancelRenaming();
      return;
    }

    setSavingTitle(true);
    try {
      const res = await api.put(`/collaboration/${docId}`, { title: trimmed });
      const updated = res.data.data;

      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, title: updated.title } : d))
      );
      if (selectedDoc?.id === docId) {
        setSelectedDoc((prev) => (prev ? { ...prev, title: updated.title } : prev));
      }

      toast.addToast({ type: 'success', title: 'Document renommé ✅' });
      cancelRenaming();
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de renommer',
      });
    } finally {
      setSavingTitle(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, docId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRenaming(docId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRenaming();
    }
  };

  const shareWithMember = (member: Member) => {
    const url = `${window.location.origin}/collaboration?projectId=${encodedProjectId}`;
    const msg = `Bonjour ${member.name || member.email},\n\nRejoins-moi sur le document collaboratif du projet "${selectedProject?.title}" :\n${url}\n\nÀ bientôt !`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      alert(`✅ Message copié pour ${member.name || member.email}. Collez-le dans un email.`);
    } else {
      prompt('Copiez ce message :', msg);
    }
  };

  const uniqueDocUsers = useMemo(() => {
    const seen = new Set<string>();
    return documentUsers.filter((u) => {
      if (seen.has(u.userId)) return false;
      seen.add(u.userId);
      return true;
    });
  }, [documentUsers]);

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: theme.spacing.lg }}>🤝 Collaboration en temps réel</h1>

      {projectsLoading ? (
        <p>Chargement de vos projets...</p>
      ) : projects.length === 0 ? (
        <Card>
          <p style={{ textAlign: 'center', color: colors.gray[500] }}>
            Vous n'avez encore aucun projet. Créez-en un d'abord depuis le tableau de bord.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: colors.gray[600], marginBottom: '6px' }}>
                  📁 Projet
                </label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const p = projects.find((x) => x.id === e.target.value);
                    setSelectedProject(p || null);
                    setSelectedDoc(null);
                    setDocuments([]);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: '14px',
                    backgroundColor: colors.white,
                    color: colors.dark,
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProject && (
              <div style={{ marginTop: theme.spacing.sm, fontSize: '12px', color: colors.gray[500] }}>
                {selectedProject.description || 'Aucune description'}
              </div>
            )}
          </Card>

          {encodedProjectId && <PresenceBar users={projectUsers} connected={connected} />}

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <Card title="👥 Membres du projet">
                {members.length === 0 ? (
                  <p style={{ fontSize: '13px', color: colors.gray[500] }}>Aucun membre</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: theme.borderRadius.sm,
                          backgroundColor: colors.gray[50] || '#fafafa',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: colors.primary,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}
                        >
                          {(m.name || m.email).substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.name || m.email}
                          </div>
                          <div style={{ fontSize: '11px', color: colors.gray[500] }}>{m.role}</div>
                        </div>
                        <button
                          onClick={() => shareWithMember(m)}
                          title="Copier un message d'invitation"
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: colors.primary,
                          }}
                        >
                          📤
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <Button
                  variant="success"
                  onClick={createDocument}
                  disabled={creating || !selectedProject}
                  style={{ width: '100%', marginBottom: theme.spacing.md }}
                >
                  {creating ? '⏳ Création...' : '+ Nouveau document'}
                </Button>

                <h4 style={{ marginTop: 0 }}>📄 Documents ({documents.length})</h4>
                {loading ? (
                  <p>Chargement...</p>
                ) : documents.length === 0 ? (
                  <p style={{ color: colors.gray[500], fontSize: '13px' }}>Aucun document</p>
                ) : (
                  documents.map((doc) => {
                    const isEditing = editingDocId === doc.id;
                    const isSelected = selectedDoc?.id === doc.id;
                    const isMenuOpen = openDownloadMenuId === doc.id;
                    const isDownloading = downloading === doc.id;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => !isEditing && setSelectedDoc(doc)}
                        style={{
                          padding: '10px',
                          backgroundColor: isSelected ? colors.primary + '20' : colors.gray[100],
                          borderLeft: isSelected ? `3px solid ${colors.primary}` : '3px solid transparent',
                          borderRadius: theme.borderRadius.md,
                          marginBottom: '6px',
                          cursor: isEditing ? 'default' : 'pointer',
                          position: 'relative',
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, doc.id)}
                              disabled={savingTitle}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '13px',
                                border: `1px solid ${colors.primary}`,
                                borderRadius: '4px',
                                outline: 'none',
                                minWidth: 0,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRenaming(doc.id);
                              }}
                              disabled={savingTitle}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingTitle ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {savingTitle ? '⏳' : '✓'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelRenaming();
                              }}
                              disabled={savingTitle}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: colors.gray[400],
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{
                                fontSize: '13px',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {doc.title}
                              </strong>
                              <Badge variant="info">v{doc.version}</Badge>
                            </div>

                            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDownloadMenuId(isMenuOpen ? null : doc.id);
                                  }}
                                  disabled={isDownloading}
                                  title="Télécharger"
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: isDownloading ? 'wait' : 'pointer',
                                    fontSize: '14px',
                                    color: colors.primary,
                                    padding: '4px',
                                    borderRadius: '4px',
                                    opacity: 0.7,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                                >
                                  {isDownloading ? '⏳' : '📥'}
                                </button>

                                {isMenuOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      marginTop: '4px',
                                      backgroundColor: colors.white,
                                      border: `1px solid ${colors.gray[200]}`,
                                      borderRadius: theme.borderRadius.sm,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                      zIndex: 100,
                                      minWidth: '160px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <button
                                      onClick={(e) => handleDownload(doc, 'pdf', e)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        color: colors.dark,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      📕 Format PDF (.pdf)
                                    </button>
                                    <button
                                      onClick={(e) => handleDownload(doc, 'docx', e)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        color: colors.dark,
                                        borderTop: `1px solid ${colors.gray[100]}`,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      📘 Format Word (.doc)
                                    </button>
                                    <button
                                      onClick={(e) => handleDownload(doc, 'txt', e)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        color: colors.dark,
                                        borderTop: `1px solid ${colors.gray[100]}`,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      📄 Texte brut (.txt)
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => startRenaming(doc, e)}
                                title="Renommer"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: colors.primary,
                                  padding: '4px',
                                  borderRadius: '4px',
                                  flexShrink: 0,
                                  opacity: 0.7,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                              >
                                ✏️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            <Card>
              {selectedDoc ? (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.md,
                    paddingBottom: theme.spacing.sm,
                    borderBottom: `1px solid ${colors.gray[200]}`,
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>
                      📄 {selectedDoc.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e: any) => handleDownload(selectedDoc, 'pdf', e)}
                      >
                        📕 PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e: any) => handleDownload(selectedDoc, 'docx', e)}
                      >
                        📘 Word
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e: any) => handleDownload(selectedDoc, 'txt', e)}
                      >
                        📄 TXT
                      </Button>
                    </div>
                  </div>

                  <CollaborativeEditor
                    documentId={selectedDoc.id}
                    title=""
                    content={documentContent || selectedDoc.content || ''}
                    users={uniqueDocUsers}
                    typingUsers={documentTyping.filter((t) => t.context === `doc-${selectedDoc.id}`)}
                    onChange={handleContentChange}
                    onCursorMove={handleCursorMove}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: theme.spacing.xxl, color: colors.gray[500] }}>
                  <p style={{ fontSize: theme.typography.fontSize.lg }}>📄 Sélectionnez un document</p>
                  <p>ou créez-en un nouveau pour commencer la collaboration</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CollaborationPage;
