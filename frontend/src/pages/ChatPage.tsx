// frontend/src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useChatStream, type StreamDone } from '../hooks/useChatStream';
import { useToast } from '../context/ToastContext';
import ReactMarkdown from 'react-markdown'; // ✅ AJOUT
import './ChatPage.css';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
    
    let threshold: number | null = null;
    if (percent >= 100) threshold = 100;
    else if (percent >= 95) threshold = 95;
    else if (percent >= 75) threshold = 75;
    else if (percent >= 50) threshold = 50;
    
    if (threshold === null) return;
    
    let userId = 'anon';
    try {
      userId = JSON.parse(localStorage.getItem('user') || '{}')?.id || 'anon';
    } catch {}
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const storageKey = `quota_warning_${userId}_${month}_${threshold}`;
    
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
    
    if (threshold === 100) {
      toast.addToast({
        type: 'error',
        title: 'Quota IA épuisé 🚫',
        message: `Vous avez utilisé vos ${quota.limit} messages. Rendez-vous sur /pricing pour recharger.`,
        duration: 6000,
      });
    } else if (threshold === 95) {
      toast.addToast({
        type: 'error',
        title: 'Quota presque épuisé 🚨',
        message: `Il ne vous reste que ${quota.limit - quota.used} message(s) sur ${quota.limit}. Rechargez bientôt.`,
        duration: 6000,
      });
    } else if (threshold === 75) {
      toast.addToast({
        type: 'warning',
        title: 'Attention, quota à 75% ⚠️',
        message: `Vous avez consommé ${Math.round(percent)}% de votre crédit IA (${quota.used}/${quota.limit}).`,
        duration: 6000,
      });
    } else if (threshold === 50) {
      toast.addToast({
        type: 'info',
        title: 'Information : 50% du quota utilisé 💡',
        message: `Vous avez consommé la moitié de votre crédit IA (${quota.used}/${quota.limit}).`,
        duration: 6000,
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
      if (err.response?.status === 403 && err.response?.data?.code === 'QUOTA_EXCEEDED') {
        toast.addToast({
          type: 'error',
          title: 'Quota IA épuisé 🚫',
          message: `${err.response.data.message} Rendez-vous sur /pricing pour recharger.`,
        });
      } else {
        setError(err.response?.data?.error || err.message || 'Erreur envoi message');
      }
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

  // ✅ 1. Fonction d'export Markdown
const exportToMarkdown = () => {
  if (messages.length === 0) return;

  const convTitle = conversations.find((c) => c.id === selectedConversationId)?.title || 'Conversation';
  const date = new Date().toLocaleString(i18n.language);

  let mdContent = `# ${convTitle}\n\n`;
  mdContent += `*Exporté depuis Ebeno Research Platform le ${date}*\n\n---\n\n`;

  messages.forEach((m) => {
    const role = m.role === 'user' ? '🧑‍🔬 **Chercheur**' : '🤖 **Assistant IA**';
    mdContent += `### ${role}\n\n${m.content}\n\n`;
    
    if (m.sources && m.sources.length > 0) {
      mdContent += `> **Sources citées :**\n`;
      m.sources.forEach((s) => {
        mdContent += `> - [${s.type}] ${s.name}\n`;
      });
      mdContent += `\n`;
    }
    mdContent += `---\n\n`;
  });

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${convTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ✅ 2. Fonction d'export PDF
const exportToPDF = async () => {
  if (messages.length === 0) return;

  const convTitle = conversations.find((c) => c.id === selectedConversationId)?.title || 'Conversation';
  const dom = window.document;

  // Création d'un conteneur hors-écran pour le rendu propre
  const container = dom.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#000';

  // En-tête
  const header = dom.createElement('div');
  header.innerHTML = `
    <h1 style="color: #1e3a8a; margin-bottom: 4px;">Ebeno Research Platform</h1>
    <h2 style="color: #333; margin-top: 0;">${convTitle}</h2>
    <p style="font-size: 12px; color: #666;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
  `;
  container.appendChild(header);

  // Messages
  messages.forEach((m) => {
    const msgDiv = dom.createElement('div');
    msgDiv.style.marginBottom = '20px';
    msgDiv.style.padding = '12px';
    msgDiv.style.borderRadius = '8px';
    
    if (m.role === 'user') {
      msgDiv.style.backgroundColor = '#f3f4f6';
      msgDiv.innerHTML = `<strong>Chercheur :</strong><br/>${m.content.replace(/\n/g, '<br/>')}`;
    } else {
      msgDiv.style.backgroundColor = '#eff6ff';
      msgDiv.style.borderLeft = '4px solid #3b82f6';
      // Nettoyage basique du markdown pour le PDF (html2canvas gère mal les balises complexes)
      const cleanContent = m.content.replace(/\*\*/g, '').replace(/#/g, '');
      msgDiv.innerHTML = `<strong>Assistant IA :</strong><br/>${cleanContent.replace(/\n/g, '<br/>')}`;
      
      if (m.sources && m.sources.length > 0) {
        msgDiv.innerHTML += `<br/><br/><span style="font-size: 11px; color: #666;">Sources : ${m.sources.map(s => s.name).join(', ')}</span>`;
      }
    }
    container.appendChild(msgDiv);
  });

  dom.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`${convTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  } catch (error) {
    console.error('❌ Erreur export PDF chat:', error);
    toast.addToast({ type: 'error', title: 'Erreur lors de l\'export PDF' });
  } finally {
    dom.body.removeChild(container);
  }
};

const [savingToProject, setSavingToProject] = useState(false);

const saveToProject = async () => {
  if (!selectedConversationId || !selectedProjectId) {
    toast.addToast({ type: 'error', title: 'Sélectionnez une conversation et un projet' });
    return;
  }

  setSavingToProject(true);
  try {
    const res = await api.post(`/chat/conversations/${selectedConversationId}/export-to-project`);
    toast.addToast({ 
      type: 'success', 
      title: 'Conversation sauvegardée !', 
      message: res.data.data.fileName 
    });
  } catch (err: any) {
    toast.addToast({ 
      type: 'error', 
      title: 'Erreur', 
      message: err.response?.data?.error || 'Impossible de sauvegarder la conversation' 
    });
  } finally {
    setSavingToProject(false);
  }
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
        <header className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
  </div>

  {/* ✅ NOUVEAU : Boutons d'export */}
  {messages.length > 0 && (
    <div style={{ display: 'flex', gap: '8px' }}>
     <button
      onClick={saveToProject}
      disabled={savingToProject}
      title="Sauvegarder dans les documents du projet"
      style={{ 
        padding: '6px 12px', 
        backgroundColor: savingToProject ? '#e5e7eb' : '#e0f2fe', 
        color: '#0369a1',
        border: '1px solid #bae6fd', 
        borderRadius: '6px', 
        cursor: savingToProject ? 'wait' : 'pointer', 
        fontSize: '13px',
        fontWeight: 'bold'
      }}
    >
      {savingToProject ? '⏳...' : '💾 Projet'}
    </button>
      <button
        onClick={exportToMarkdown}
        title="Exporter en Markdown"
        style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
      >
        📄 .md
      </button>
      <button
        onClick={exportToPDF}
        title="Exporter en PDF"
        style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
      >
        📑 PDF
      </button>
    </div>
  )}
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
                {/* ✅ CHANGEMENT ICI : Utilisation de ReactMarkdown */}
                <div className="message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                   {m.content}
                  </ReactMarkdown>
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
                {/* ✅ CHANGEMENT ICI : Utilisation de ReactMarkdown pour le streaming */}
                <div className="message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingText}
                  </ReactMarkdown>
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
