import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: number;
}

interface User {
  id: string;
  name: string;
  color: string;
}

const CollaborationPage: React.FC = () => {
  const { colors } = useTheme();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ebeno-backend.onrender.com';

  // Charger les documents du projet
  useEffect(() => {
    if (!projectId) return;
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/collaboration/project/${projectId}`);
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
  }, [projectId]);

  // Connexion Socket.IO
  useEffect(() => {
    if (!selectedDoc || !user.id) return;

    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);
    setIsConnected(true);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connecté');
      newSocket.emit('join-document', {
        documentId: selectedDoc.id,
        userId: user.id,
        userName: user.name || user.email
      });
    });

    newSocket.on('document-content', (data: { document: Document, users: User[] }) => {
      setContent(data.document.content || '');
      setUsers(data.users);
    });

    newSocket.on('document-updated', (data: { content: string, userId: string, version: number }) => {
      if (data.userId !== user.id) {
        setContent(data.content);
      }
    });

    newSocket.on('user-joined', (data: User) => {
      setUsers(prev => [...prev, data]);
    });

    newSocket.on('user-left', (data: { userId: string }) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    newSocket.on('users-list', (data: User[]) => {
      setUsers(data);
    });

    return () => {
      newSocket.close();
      setIsConnected(false);
    };
  }, [selectedDoc, user.id]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (socket && selectedDoc) {
      socket.emit('edit-document', {
        documentId: selectedDoc.id,
        content: newContent
      });
    }
  };

  const createDocument = async () => {
    if (!projectId) {
      alert('Veuillez sélectionner un projet');
      return;
    }
    try {
      const response = await api.post('/collaboration', {
        title: `Document ${documents.length + 1}`,
        projectId,
        content: 'Contenu initial...'
      });
      if (response.data.success) {
        setDocuments([...documents, response.data.data]);
        setSelectedDoc(response.data.data);
        setContent(response.data.data.content || '');
      }
    } catch (error) {
      console.error('❌ Erreur création document:', error);
    }
  };

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: theme.spacing.lg }}>🤝 Collaboration en temps réel</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: theme.spacing.lg }}>
        <Card>
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
            <Input
              type="text"
              placeholder="ID du projet"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={() => setProjectId(projectId)}>Charger</Button>
          </div>

          <Button variant="success" onClick={createDocument} style={{ width: '100%', marginBottom: theme.spacing.md }}>
            + Nouveau document
          </Button>

          <h3>Documents</h3>
          {loading ? (
            <p>Chargement...</p>
          ) : documents.length === 0 ? (
            <p style={{ color: colors.gray[500] }}>Aucun document</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                style={{
                  padding: theme.spacing.md,
                  backgroundColor: selectedDoc?.id === doc.id ? colors.primaryLight : colors.gray[100],
                  borderRadius: theme.borderRadius.md,
                  marginBottom: theme.spacing.xs,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <strong>{doc.title}</strong>
                <br />
                <Badge variant="info">v{doc.version}</Badge>
              </div>
            ))
          )}
        </Card>

        <Card>
          {selectedDoc ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <h2 style={{ margin: 0 }}>{selectedDoc.title}</h2>
                <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
                  <Badge variant={isConnected ? 'success' : 'danger'}>
                    {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
                  </Badge>
                  <Badge variant="info">{users.length} utilisateur(s)</Badge>
                </div>
              </div>

              <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.md }}>
                {users.map((u) => (
                  <span key={u.id} style={{
                    display: 'inline-block',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: u.color,
                    color: 'white',
                    borderRadius: theme.borderRadius.sm,
                    fontSize: theme.typography.fontSize.xs,
                  }}>
                    {u.name}
                  </span>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                style={{
                  width: '100%',
                  minHeight: '500px',
                  padding: theme.spacing.md,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.md,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                }}
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
    </div>
  );
};

export default CollaborationPage;
