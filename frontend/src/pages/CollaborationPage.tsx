// frontend/src/pages/CollaborationPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PresenceBar } from '../components/PresenceBar';
import { CollaborativeEditor } from '../components/CollaborativeEditor';
import { useProjectSocket } from '../hooks/useProjectSocket';
import { useTheme } from '../context/ThemeContext';
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

const CollaborationPage: React.FC = () => {
  const { colors } = useTheme();
  const [searchParams] = useSearchParams();

  // Projets de l'utilisateur
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Membres du projet sélectionné
  const [members, setMembers] = useState<Member[]>([]);

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // ✅ IDs pour le projet sélectionné
  const rawProjectId = selectedProject?.id || '';
  const encodedProjectId = rawProjectId ? encodeURIComponent(rawProjectId) : '';

  // ✅ Socket.IO
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
    onDataChange: () => {},
  });

  // ✅ Charger les projets de l'utilisateur
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get('/projects');
        const list: Project[] = res.data.data || [];
        setProjects(list);

        // Pré-sélectionner un projet si ?projectId= dans l'URL
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

  // ✅ Charger les membres quand on change de projet
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

  // ✅ Charger les documents
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

  // Rejoindre le document
  useEffect(() => {
    if (!selectedDoc?.id) return;
    joinDocument(selectedDoc.id);
    return () => {
      leaveDocument(selectedDoc.id);
    };
  }, [selectedDoc?.id, joinDocument, leaveDocument]);

  // Synchroniser contenu depuis Socket
  useEffect(() => {
    if (selectedDoc && documentContent !== selectedDoc.content) {
      setSelectedDoc((prev) => (prev ? { ...prev, content: documentContent } : prev));
    }
  }, [documentContent]);

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
        projectId: rawProjectId, // ✅ ID BRUT
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

  const uniqueDocUsers = useMemo(() => {
    const seen = new Set<string>();
    return documentUsers.filter((u) => {
      if (seen.has(u.userId)) return false;
      seen.add(u.userId);
      return true;
    });
  }, [documentUsers]);

  // Auto-invitation : partager le lien avec un membre
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
          {/* Barre de sélection projet */}
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

          {/* Barre de présence */}
          {encodedProjectId && <PresenceBar users={projectUsers} connected={connected} />}

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            {/* Colonne gauche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {/* Membres */}
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

              {/* Documents */}
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
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      style={{
                        padding: '10px',
                        backgroundColor: selectedDoc?.id === doc.id ? colors.primary + '20' : colors.gray[100],
                        borderLeft: selectedDoc?.id === doc.id ? `3px solid ${colors.primary}` : '3px solid transparent',
                        borderRadius: theme.borderRadius.md,
                        marginBottom: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <strong style={{ fontSize: '13px' }}>{doc.title}</strong>
                      <br />
                      <Badge variant="info">v{doc.version}</Badge>
                    </div>
                  ))
                )}
              </Card>
            </div>

            {/* Colonne droite : éditeur */}
            <Card>
              {selectedDoc ? (
                <CollaborativeEditor
                  documentId={selectedDoc.id}
                  title={selectedDoc.title}
                  content={documentContent || selectedDoc.content || ''}
                  users={uniqueDocUsers}
                  typingUsers={documentTyping.filter((t) => t.context === `doc-${selectedDoc.id}`)}
                  onChange={handleContentChange}
                  onCursorMove={handleCursorMove}
                />
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
