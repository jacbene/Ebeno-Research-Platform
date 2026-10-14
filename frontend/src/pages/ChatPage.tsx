// frontend/src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import './ChatPage.css';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Project {
  id: string;
  title: string;
}

interface Conversation {
  id: string;
  projectId: string;
  title: string;
  language: string;
  messageCount: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}

interface Source {
  type: 'document' | 'transcription' | 'summary' | 'analysis';
  id: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens?: number;
  sources?: Source[];
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════

const ChatPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Projets
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // État
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════
  // 1. Charger les projets au démarrage
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get('/projects');
        const list = res.data.projects || res.data || [];
        setProjects(list);

        // Priorité : URL param > 1er projet
        const urlProjectId = searchParams.get('projectId');
        if (urlProjectId && list.some((p: Project) => p.id === urlProjectId)) {
          setSelectedProjectId(urlProjectId);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Erreur chargement projets');
      }
    };
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 2. Charger les conversations du projet sélectionné
  // ═══════════════════════════════════════════════════════════

  const loadConversations = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingConversations(true);
    try {
      const res = await api.get(`/chat/conversations?projectId=${projectId}`);
      const list = res.data.conversations || [];
      setConversations(list);

      // Sélectionner la 1ère conversation ou aucune
      if (list.length > 0) {
        setSelectedConversationId(list[0].id);
      } else {
        setSelectedConversationId('');
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur chargement conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadConversations(selectedProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // ═══════════════════════════════════════════════════════════
  // 3. Charger les messages de la conversation sélectionnée
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }
      try {
        const res = await api.get(`/chat/conversations/${selectedConversationId}`);
        setMessages(res.data.messages || []);
      } catch (err: any) {
        setError(err.message || 'Erreur chargement messages');
      }
    };
    loadMessages();
  }, [selectedConversationId]);

  // Scroll auto
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════
  // 4. Créer une nouvelle conversation
  // ═══════════════════════════════════════════════════════════

  const createNewConversation = async () => {
    if (!selectedProjectId) {
      setError('Sélectionnez un projet d\'abord');
      return;
    }
    try {
      const res = await api.post('/chat/conversations', {
        projectId: selectedProjectId,
        language: i18n.language || 'fr',
      });
      const conv = res.data.conversation;
      setConversations((prev) => [conv, ...prev]);
      setSelectedConversationId(conv.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erreur création conversation');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 5. Envoyer un message
  // ═══════════════════════════════════════════════════════════

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;

    if (!selectedConversationId) {
      // Créer une conversation à la volée
      await createNewConversation();
      return;
    }

    setInput('');
    setError(null);
    setLoading(true);

    // Ajout optimiste du message user
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post(
        `/chat/conversations/${selectedConversationId}/messages`,
        { content },
      );

      const { userMessage, assistantMessage } = res.data;

      // Remplacer le message temporaire par le vrai + ajouter la réponse
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, userMessage, assistantMessage];
      });

      // Rafraîchir la liste des conversations (titre + updatedAt)
      if (selectedProjectId) {
        const convsRes = await api.get(
          `/chat/conversations?projectId=${selectedProjectId}`,
        );
        setConversations(convsRes.data.conversations || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur envoi message');
      // Retirer le message temporaire si erreur
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = envoyer, Shift+Enter = nouvelle ligne
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 6. Supprimer une conversation
  // ═══════════════════════════════════════════════════════════

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette conversation ?')) return;

    try {
      await api.delete(`/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        setSelectedConversationId('');
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur suppression');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 7. Changer de projet
  // ═══════════════════════════════════════════════════════════

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedConversationId('');
    setMessages([]);
    setSearchParams({ projectId });
    setSidebarOpen(false);
  };

  // ═══════════════════════════════════════════════════════════
  // Rendu
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="chat-container">
      {/* ═══════ Sidebar ═══════ */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{t('chat.title', { defaultValue: 'Chat IA' })}</h2>
          <button
            className="btn-new-conv"
            onClick={createNewConversation}
            disabled={!selectedProjectId}
            title="Nouvelle conversation"
          >
            + Nouvelle
          </button>
        </div>

        {/* Sélecteur de projet */}
        <div className="project-selector">
          <label>{t('chat.project', { defaultValue: 'Projet' })}</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={projects.length === 0}
          >
            {projects.length === 0 && <option>Aucun projet</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des conversations */}
        <div className="conversations-list">
          {loadingConversations && (
            <div className="loading-small">Chargement…</div>
          )}

          {!loadingConversations && conversations.length === 0 && (
            <div className="empty-convs">
              Aucune conversation. Cliquez sur « + Nouvelle ».
            </div>
          )}

          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${selectedConversationId === c.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedConversationId(c.id);
                setSidebarOpen(false);
              }}
            >
              <div className="conv-info">
                <div className="conv-title">{c.title}</div>
                <div className="conv-meta">
                  {c.messageCount} message{c.messageCount > 1 ? 's' : ''}
                </div>
              </div>
              <button
                className="conv-delete"
                onClick={(e) => deleteConversation(c.id, e)}
                title="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ═══════ Zone principale ═══════ */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <button
            className="btn-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menu"
          >
            ☰
          </button>
          <h1>
            {selectedConversationId
              ? conversations.find((c) => c.id === selectedConversationId)?.title || 'Chat'
              : 'Chat IA'}
          </h1>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>
                {t('chat.welcome', {
                  defaultValue: 'Posez une question sur votre projet',
                })}
              </h3>
              <p>
                L'IA a accès aux documents, transcriptions et résumés du projet
                sélectionné.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`message message-${m.role}`}>
              <div className="message-bubble">
                <div className="message-content">
                  {m.content.split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                  ))}
                </div>

                {m.model && (
                  <div className="message-meta">
                    <span className={`model-badge model-${m.model}`}>
                      {m.model === 'fallback' ? '⚠️ indisponible' : m.model}
                    </span>
                    {m.tokens && <span className="tokens">{m.tokens} tokens</span>}
                  </div>
                )}

                {m.sources && m.sources.length > 0 && (
                  <details className="message-sources">
                    <summary>
                      📚 {m.sources.length} source{m.sources.length > 1 ? 's' : ''}
                    </summary>
                    <ul>
                      {m.sources.map((s, i) => (
                        <li key={`${s.id}-${i}`}>
                          <span className={`source-type source-${s.type}`}>
                            {s.type}
                          </span>
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message message-assistant">
              <div className="message-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="chat-error">
            ⚠️ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Input */}
        <footer className="chat-input">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedConversationId
                ? t('chat.placeholder', { defaultValue: 'Posez votre question…' })
                : 'Cliquez sur « + Nouvelle » pour commencer'
            }
            disabled={loading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn-send"
          >
            {loading ? '…' : '→'}
          </button>
        </footer>
      </main>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
