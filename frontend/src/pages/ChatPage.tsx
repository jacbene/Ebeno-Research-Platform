// frontend/src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useChatStream, type StreamDone } from '../hooks/useChatStream';
import { useToast } from '../context/ToastContext'; // ✅ AJOUT
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
  const toast = useToast(); // ✅ DOIT ÊTRE DÉCLARÉ AVANT checkQuotaWarning
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Fonction pour afficher les alertes de quota (50% / 80% / 100%)
  const checkQuotaWarning = useCallback((quota?: { used: number; limit: number }) => {
    if (!quota || !quota.limit) return;
    
    const percent = (quota.used / quota.limit) * 100;

    if (percent >= 100) {
      toast.addToast({
        type: 'error',
        title: 'Quota IA épuisé 🚫',
        message: `Vous avez utilisé vos ${quota.limit} messages. Rendez-vous sur /pricing pour recharger.`,
      });
    } else if (percent >= 80) {
      toast.addToast({
        type: 'warning',
        title: 'Quota presque atteint ⚠️',
        message: `Vous avez consommé ${percent.toFixed(0)}% de votre crédit IA (${quota.used}/${quota.limit}).`,
      });
    } else if (percent >= 50) {
      toast.addToast({
        type: 'info',
        title: 'Information sur votre quota 💡',
        message: `Vous avez consommé ${percent.toFixed(0)}% de votre crédit IA (${quota.used}/${quota.limit}).`,
      });
    }
  }, [toast]);

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
  const [streamingText, setStreamingText] = useState('');
  const [streamingModel, setStreamingModel] = useState<string>('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════
  // Socket.IO streaming hook
  // ═══════════════════════════════════════════════════════════
  const { connected: socketConnected, sendMessage: streamMessage } = useChatStream({
    onUserSaved: (data) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== 'temp-user');
        return [...withoutTemp, {
          id: data.id,
          role: 'user',
          content: data.content,
          createdAt: new Date().toISOString(),
        }];
      });
    },
    onChunk: (chunk) => {
      setStreamingModel(chunk.model);
      setStreamingText((prev) => prev + chunk.content);
    },
    onDone: async (data: StreamDone) => {
      const assistantMsg: Message = {
        id: data.messageId,
        role: 'assistant',
        content: data.fullContent,
        model: data.model,
        tokens: data.tokens,
        sources: data.sources || [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText('');
      setStreamingModel('');

      // ✅ Vérifier le quota après chaque réponse streaming
      if (data.quota) {
        checkQuotaWarning(data.quota);
      }

      if (selectedProjectId) {
        const convsRes = await api.get(
          `/chat/conversations?projectId=${selectedProjectId}`,
        );
        const list = convsRes.data.conversations || [];
        setConversations(list);
      }
    },
    onError: (err) => {
      setError(err);
      setStreamingText('');
      setStreamingModel('');
      setMessages((prev) => prev.filter((m) => m.id !== 'temp-user'));
    },
    // ✅ Gestion du dépassement de quota (Socket) via useToast
    onQuotaExceeded: (data) => {
      toast.addToast({
        type: 'error',
        title: 'Quota IA épuisé 🚫',
        message: `${data.message} Rendez-vous sur /pricing pour recharger.`,
      });
    },
  });

  // ═══════════════════════════════════════════════════════════
  // 1. Charger les projets
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get('/projects');
        const raw = res.data;
        let list: Project[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data)) list = raw.data;
        else if (Array.isArray(raw?.projects)) list = raw.projects;
        setProjects(list);

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
  // 2. Charger les conversations
  // ═══════════════════════════════════════════════════════════
  const loadConversations = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingConversations(true);
    try {
      const res = await api.get(`/chat/conversations?projectId=${projectId}`);
      const raw = res.data;
      let list: Conversation[] = [];
      if (Array.isArray(raw)) list = raw;
      else if (Array.isArray(raw?.conversations)) list = raw.conversations;
      else if (Array.isArray(raw?.data)) list = raw.data;
      setConversations(list);

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
  // 3. Charger les messages
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }
      try {
        const res = await api.get(`/chat/conversations/${selectedConversationId}`);
        const raw = res.data;
        let list: Message[] = [];
        if (Array.isArray(raw?.messages)) list = raw.messages;
        else if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data?.messages)) list = raw.data.messages;
        setMessages(list);
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
  // 5. Envoyer un message (REST)
  // ═══════════════════════════════════════════════════════════
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;

    if (!selectedConversationId) {
      await createNewConversation();
      return;
    }

    setInput('');
    setError(null);
    setLoading(true);

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

      const { userMessage, assistantMessage, quota } = res.data;

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, userMessage, assistantMessage];
      });

      // ✅ Vérifier le quota après chaque réponse REST
      if (quota) {
        checkQuotaWarning(quota);
      }

      if (selectedProjectId) {
        const convsRes = await api.get(
          `/chat/conversations?projectId=${selectedProjectId}`,
        );
        setConversations(convsRes.data.conversations || []);
      }
    } catch (err: any) {
      // ✅ Gestion propre du dépassement de quota (REST 403)
      if (err.response?.status === 403 && err.response?.data?.code === 'QUOTA_EXCEEDED') {
        toast.addToast({
          type: 'error',
          title: 'Quota IA épuisé 🚫',
          message: `${err.response.data.message} Rendez-vous sur /pricing pour recharger.`,
        });
      } else {
        setError(err.response?.data?.error || err.message || 'Erreur envoi message');
      }
      // Retirer le message temporaire si erreur
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

                {Array.isArray(m.sources) && m.sources.length > 0 && (
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

          {streamingText && (
            <div className="message message-assistant">
              <div className="message-bubble">
                <div className="message-content">
                  {streamingText.split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                  ))}
                  <span className="cursor">▊</span>
                </div>
                {streamingModel && (
                  <div className="message-meta">
                    <span className={`model-badge model-${streamingModel}`}>
                      {streamingModel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && !streamingText && (
            <div className="message message-assistant">
              <div className="message-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="chat-error">
            ⚠️ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

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
