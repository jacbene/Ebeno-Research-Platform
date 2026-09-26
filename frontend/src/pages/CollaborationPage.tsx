// frontend/src/pages/CollaborationPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
import { LanguageBadge } from '../components/LanguageBadge';
import TranslateModal from '../components/TranslateModal';
import CommentSection from '../components/CommentSection';

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: number;
  language?: string | null;
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

// ✅ Construit un HTML réutilisable pour Word
const buildDocumentHtml = (doc: Document, locale: string, footerText: string): string => {
  const contentHtml = escapeHtml(doc.content || '')
    .split('\n')
    .map((line) => `<p style="margin: 0 0 8px 0; line-height: 1.6;">${line || '&nbsp;'}</p>`)
    .join('');

  return `
    <h1 style="font-size: 24px; margin: 0 0 8px 0; color: #333; border-bottom: 2px solid #4A6CF7; padding-bottom: 8px; font-family: Arial, sans-serif;">
      ${escapeHtml(doc.title)}
    </h1>
    <p style="font-size: 12px; color: #666; font-style: italic; margin: 0 0 24px 0; font-family: Arial, sans-serif;">
      Version ${doc.version} — ${new Date(doc.updatedAt).toLocaleString(locale)}
    </p>
    <div style="font-size: 12px; line-height: 1.6; color: #333; font-family: Arial, sans-serif;">
      ${contentHtml}
    </div>
    <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; font-family: Arial, sans-serif;">
      ${escapeHtml(footerText)}
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

// ✅ DOCX (Word) via HTML → .doc
const downloadAsDocx = (doc: Document, locale: string, footerText: string) => {
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
      ${buildDocumentHtml(doc, locale, footerText)}
    </body>
    </html>
  `;

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

// ✅ PDF via jsPDF + html2canvas
const downloadAsPdf = async (doc: Document, locale: string, footerText: string): Promise<void> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '30px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.fontSize = '13px';
  container.style.lineHeight = '1.6';
  container.style.boxSizing = 'border-box';

  const title = document.createElement('h1');
  title.textContent = doc.title;
  title.style.fontSize = '22px';
  title.style.marginTop = '0';
  title.style.marginBottom = '8px';
  title.style.borderBottom = '2px solid #4A6CF7';
  title.style.paddingBottom = '8px';
  title.style.color = '#222';
  container.appendChild(title);

  const meta = document.createElement('p');
  meta.textContent = `Version ${doc.version} — ${new Date(doc.updatedAt).toLocaleString(locale)}`;
  meta.style.fontSize = '12px';
  meta.style.color = '#666';
  meta.style.fontStyle = 'italic';
  meta.style.marginTop = '0';
  meta.style.marginBottom = '24px';
  container.appendChild(meta);

  const content = document.createElement('div');
  content.style.whiteSpace = 'pre-wrap';
  content.style.wordWrap = 'break-word';
  content.style.color = '#333';
  content.textContent = doc.content || '';
  container.appendChild(content);

  const footer = document.createElement('div');
  footer.textContent = footerText;
  footer.style.marginTop = '40px';
  footer.style.paddingTop = '12px';
  footer.style.borderTop = '1px solid #ddd';
  footer.style.fontSize = '10px';
  footer.style.color = '#999';
  footer.style.textAlign = 'center';
  container.appendChild(footer);

  document.body.appendChild(container);

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

    pdf.save(`${sanitizeFileName(doc.title)}.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

// ============================================================
// Composant principal
// ============================================================

const CollaborationPage: React.FC = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, i18n } = useTranslation();
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

// ✅ Modal de traduction (document collaboratif)
const [translateTarget, setTranslateTarget] = useState<{
  open: boolean;
  documentId: string;
  documentTitle: string;
}>({ open: false, documentId: '', documentTitle: '' });

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
    userName: currentUser?.name || currentUser?.email || t('nav.user'),
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
          title: t('collaboration.toasts.docRenamedBy', {
            name: data.updatedByName,
            title: data.newTitle,
          }),
        });
      }
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedDoc?.id) return;
    joinDocument(selectedDoc.id);
    return () => {
      leaveDocument(selectedDoc.id);
    };
  }, [selectedDoc?.id, joinDocument, leaveDocument]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDoc && documentContent !== selectedDoc.content) {
      setSelectedDoc((prev) => (prev ? { ...prev, content: documentContent } : prev));
    }
  }, [documentContent]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editingDocId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingDocId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      alert(t('collaboration.selectProjectAlert'));
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
      alert(error.response?.data?.message || t('collaboration.toasts.createFailed'));
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
        toast.addToast({
          type: 'success',
          title: t('collaboration.toasts.downloaded', { name: `${doc.title}.txt` }),
        });
      } else if (format === 'docx') {
        downloadAsDocx(doc, i18n.language, t('collaboration.editor.emptyHint') ? 'Document généré depuis Ebeno Research Platform' : '');
        toast.addToast({
          type: 'success',
          title: t('collaboration.toasts.downloaded', { name: `${doc.title}.doc` }),
        });
      } else {
        await downloadAsPdf(doc, i18n.language, 'Document généré depuis Ebeno Research Platform');
        toast.addToast({
          type: 'success',
          title: t('collaboration.toasts.downloaded', { name: `${doc.title}.pdf` }),
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement:', error);
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: t('collaboration.toasts.downloadFailed'),
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

      toast.addToast({ type: 'success', title: t('collaboration.toasts.renamed') });
      cancelRenaming();
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('collaboration.toasts.renameFailed'),
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
    const msg = t('collaboration.members.shareMessage', {
      name: member.name || member.email,
      project: selectedProject?.title || '',
      url,
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      alert(t('collaboration.members.shareCopied', { name: member.name || member.email }));
    } else {
      prompt(t('collaboration.members.sharePrompt'), msg);
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
      <h1 style={{ marginBottom: theme.spacing.lg }}>{t('collaboration.title')}</h1>

      {projectsLoading ? (
        <p>{t('collaboration.loadingProjects')}</p>
      ) : projects.length === 0 ? (
        <Card>
          <p style={{ textAlign: 'center', color: colors.gray[500] }}>
            {t('collaboration.noProjects')}
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: colors.gray[600], marginBottom: '6px' }}>
                  {t('collaboration.projectLabel')}
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
                {selectedProject.description || t('collaboration.noDescription')}
              </div>
            )}
          </Card>

          {encodedProjectId && <PresenceBar users={projectUsers} connected={connected} />}

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <Card title={t('collaboration.members.title')}>
                {members.length === 0 ? (
                  <p style={{ fontSize: '13px', color: colors.gray[500] }}>{t('collaboration.members.empty')}</p>
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
                          title={t('collaboration.members.shareTooltip')}
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
                  {creating ? t('collaboration.documents.creating') : t('collaboration.documents.newButton')}
                </Button>

                <h4 style={{ marginTop: 0 }}>{t('collaboration.documents.title', { count: documents.length })}</h4>
                {loading ? (
                  <p>{t('collaboration.documents.loading')}</p>
                ) : documents.length === 0 ? (
                  <p style={{ color: colors.gray[500], fontSize: '13px' }}>{t('collaboration.documents.empty')}</p>
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
                                  title={t('collaboration.documents.download')}
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
                                      {t('collaboration.documents.formatPdf')}
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
                                      {t('collaboration.documents.formatWord')}
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
                                      {t('collaboration.documents.formatTxt')}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => startRenaming(doc, e)}
                                title={t('collaboration.documents.rename')}
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
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      📄 {selectedDoc.title}
                      <LanguageBadge language={selectedDoc.language} />
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
  {/* ✅ Bouton traduire */}
  <Button
    size="sm"
    variant="outline"
    onClick={() =>
      setTranslateTarget({
        open: true,
        documentId: selectedDoc.id,
        documentTitle: selectedDoc.title,
      })
    }
  >
    🌍 {t('translation.translateButton')}
  </Button>

  <Button
    size="sm"
    variant="outline"
    onClick={(e: any) => handleDownload(selectedDoc, 'pdf', e)}
  >
    {t('collaboration.editor.pdf')}
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={(e: any) => handleDownload(selectedDoc, 'docx', e)}
  >
    {t('collaboration.editor.word')}
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={(e: any) => handleDownload(selectedDoc, 'txt', e)}
  >
    {t('collaboration.editor.txt')}
  </Button>
</div>
                  </div>

  <CollaborativeEditor
    documentId={selectedDoc.id}
    title=""
    content={documentContent || selectedDoc.content || ''}
    users={uniqueDocUsers}
    typingUsers={documentTyping.filter((t_item) => t_item.context === `doc-${selectedDoc.id}`)}
    onChange={handleContentChange}
    onCursorMove={handleCursorMove}
  />

  {/* ✅ Commentaires sur le document collaboratif */}
  <CommentSection
    documentId={selectedDoc.id}
    documentType="collaboration"
  />
</>
              ) : (
                <div style={{ textAlign: 'center', padding: theme.spacing.xxl, color: colors.gray[500] }}>
                  <p style={{ fontSize: theme.typography.fontSize.lg }}>{t('collaboration.editor.empty')}</p>
                  <p>{t('collaboration.editor.emptyHint')}</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
      {/* ✅ Modal de traduction (document collaboratif) */}
      <TranslateModal
        isOpen={translateTarget.open}
        onClose={() => setTranslateTarget({ ...translateTarget, open: false })}
        documentId={translateTarget.documentId}
        documentType="collaboration"
        documentTitle={translateTarget.documentTitle}
      />      
    </div>
  );
};

export default CollaborationPage;
