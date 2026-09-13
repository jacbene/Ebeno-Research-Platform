// frontend/src/pages/CollaborationPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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

const CollaborationPage: React.FC = () => {
  const { colors } = useTheme();
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  // Utilisateur courant
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const encodedProjectId = projectId ? encodeURIComponent(projectId) : '';

  // ✅ Socket.IO unifié
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
    onDataChange: () => {}, // Rien ici, on gère manuellement
  });

  // Charger les documents du projet
  useEffect(() => {
    if (!encodedProjectId) return;
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/collaboration/project/${encodedProjectId}`);
        if (response.data.success) {
          setDocuments(response.data.data || []);
        }
      } catch (error) {
        console.error('❌ Erreur chargement documents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [encodedProjectId]);

  // Rejoindre le document quand il est sélectionné
  useEffect(() => {
    if (!selectedDoc?.id) return;
    joinDocument(selectedDoc.id);

    return () => {
      leaveDocument(selectedDoc.id);
    };
  }, [selectedDoc?.id, joinDocument, leaveDocument]);

  // Quand le contenu du document change côté serveur (autre utilisateur)
  useEffect(() => {
    if (selectedDoc && documentContent !== selectedDoc.content) {
      setSelectedDoc((prev) => prev ? { ...prev, content: documentContent } : prev);
    }
  }, [documentContent]);

  const handleContentChange = (newContent: string) => {
    if (!selectedDoc) return;

    setDocumentContent(newContent);
    setSelectedDoc((prev) => prev ? { ...prev, content: newContent } : prev);

    // Sauvegarder via socket
    editDocument(selectedDoc.id, newContent);

    // Indicateur de frappe
    emitTyping(`doc-${selectedDoc.id}`, true);
    if ((window as any).__docTypingTimeout) {
      clearTimeout((window as any).__docTypingTimeout);
    }
    (window as any).__docTypingTimeout = setTimeout(() => {
      emitTyping(`doc-${selectedDoc.id}`, false);
    }, 1500);
  };

  const handleCursorMove = (position: number) => {
    if (!selectedDoc) return;
    // Utiliser editDocument pour envoyer la position du curseur
    editDocument(selectedDoc.id, documentContent, position);
  };

  const createDocument = async () => {
    if (!encodedProjectId) {
      alert('Veuillez saisir un ID de projet');
      return;
    }
    try {
      const response = await api.post('/collaboration', {
        title: `Document ${documents.length + 1}`,
        projectId: encodedProjectId,
        content: 'Contenu initial...',
      });
      if (response.data.success) {
        const newDoc = response.data.data;
        setDocuments([...documents, newDoc]);
        setSelectedDoc(newDoc);
        setDocumentContent(newDoc.content || '');
      }
    } catch (error) {
      console.error('❌ Erreur création document:', error);
      alert('Erreur lors de la création du document');
    }
  };

  // Filtrer les utilisateurs du document (uniques)
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

      {/* Barre de présence globale du projet */}
      {encodedProjectId && <PresenceBar users={projectUsers} connected={connected} />}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: theme.spacing.lg, marginTop: theme.spacing.lg }}>
        {/* Colonne de gauche : documents */}
        <Card>
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
            <Input
              type="text"
              placeholder="ID du projet"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={() => {}}>OK</Button>
          </div>

          <Button
            variant="success"
            onClick={createDocument}
            style={{ width: '100%', marginBottom: theme.spacing.md }}
          >
            + Nouveau document
          </Button>

          <h3 style={{ marginTop: 0 }}>📄 Documents ({documents.length})</h3>
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
                  padding: theme.spacing.md,
                  backgroundColor: selectedDoc?.id === doc.id ? colors.primary + '20' : colors.gray[100],
                  borderLeft: selectedDoc?.id === doc.id ? `3px solid ${colors.primary}` : '3px solid transparent',
                  borderRadius: theme.borderRadius.md,
                  marginBottom: theme.spacing.xs,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <strong style={{ fontSize: '14px' }}>{doc.title}</strong>
                <br />
                <span style={{ fontSize: '11px', color: colors.gray[500] }}>
                  <Badge variant="info">v{doc.version}</Badge>
                </span>
              </div>
            ))
          )}
        </Card>

        {/* Colonne de droite : éditeur */}
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
    </div>
  );
};

export default CollaborationPage;
