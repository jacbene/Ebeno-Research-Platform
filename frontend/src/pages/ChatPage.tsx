import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Bonjour ! Je suis l\'assistant IA de la plateforme Ebeno Research. Comment puis-je vous aider dans votre recherche aujourd\'hui ?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('http://localhost:5001/api/deepseek/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: 'user', content: trimmedInput }]
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data?.content || 'Réponse reçue avec succès.',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const fallbackResponse = `Je comprends votre question : "${trimmedInput}".\n\nC'est une question intéressante pour votre recherche. Voici quelques pistes de réflexion :\n\n1. Analysez les sources primaires avec une approche qualitative\n2. Consultez les travaux récents dans ce domaine\n3. Structurez votre méthodologie autour des concepts clés\n\nN'hésitez pas à me poser des questions plus spécifiques.`;
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || fallbackResponse,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      const fallbackResponse = `Je comprends votre question : "${trimmedInput}".\n\nJe suis actuellement en mode hors ligne. Voici quelques conseils généraux pour votre recherche :\n\n1. Définissez clairement vos objectifs de recherche\n2. Identifiez les sources pertinentes\n3. Élaborez une méthodologie adaptée\n\nPour une aide plus précise, assurez-vous que le serveur backend est en cours d'exécution.`;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setError('Mode hors ligne : le serveur est inaccessible');
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

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'system',
        content: 'Bonjour ! Je suis l\'assistant IA de la plateforme Ebeno Research. Comment puis-je vous aider dans votre recherche aujourd\'hui ?',
        timestamp: Date.now()
      }
    ]);
    setError(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 100px)',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #e8e8e8',
        marginBottom: '15px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🤖 Assistant IA</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            DeepSeek - Analyse qualitative
          </p>
        </div>
        <button
          onClick={clearChat}
          style={{
            padding: '6px 14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          🗑️ Nouvelle conversation
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '15px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '15px'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '12px'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#4A90D9' : (msg.role === 'system' ? '#f0f7ff' : '#f1f1f1'),
                color: msg.role === 'user' ? 'white' : '#333',
                border: msg.role === 'system' ? '1px solid #d0e0ff' : 'none',
                fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                opacity: msg.role === 'system' ? 0.8 : 1,
                fontSize: msg.role === 'system' ? '14px' : '15px'
              }}
            >
              {msg.role === 'system' && <span style={{ fontWeight: 'bold' }}>🤖 Système : </span>}
              {msg.role === 'user' && <span style={{ fontWeight: 'bold' }}>👤 Vous : </span>}
              {msg.role === 'assistant' && <span style={{ fontWeight: 'bold' }}>🤖 Assistant : </span>}
              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              <div style={{
                fontSize: '10px',
                opacity: 0.6,
                marginTop: '5px',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#f1f1f1',
              color: '#666'
            }}>
              ⏳ L'assistant réfléchit...
            </div>
          </div>
        )}
        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 0',
        borderTop: '1px solid #e8e8e8'
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question sur votre recherche..."
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            resize: 'none',
            fontFamily: 'inherit',
            minHeight: '50px',
            maxHeight: '120px',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4A90D9',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: (!input.trim() || loading) ? 0.6 : 1,
            alignSelf: 'flex-end',
            height: '50px'
          }}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
