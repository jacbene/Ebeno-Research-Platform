import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: 'system', content: 'Bonjour ! Je suis l\'assistant IA de la plateforme Ebeno Research. Comment puis-je vous aider ?' }
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

    setMessages(prev => [...prev, { role: 'user', content: trimmedInput }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/deepseek/chat', {
        messages: [...messages, { role: 'user', content: trimmedInput }]
      });

      if (response.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.data?.content || 'Réponse reçue avec succès.' 
        }]);
      } else {
        setError(response.data.message || 'Erreur de communication avec l\'assistant');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.' 
        }]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, le serveur est inaccessible. Veuillez réessayer plus tard.' 
      }]);
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

  return (
    // ... JSX inchangé
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '90vh',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <h1 style={{ margin: '0 0 15px 0', fontSize: '24px' }}>🤖 Assistant IA</h1>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        border: '1px solid #e8e8e8'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '12px'
          }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: msg.role === 'user' ? '#4A90D9' : (msg.role === 'system' ? '#f0f7ff' : '#f1f1f1'),
              color: msg.role === 'user' ? 'white' : '#333',
              border: msg.role === 'system' ? '1px solid #d0e0ff' : 'none',
              fontStyle: msg.role === 'system' ? 'italic' : 'normal'
            }}>
              {msg.role === 'system' && '🤖 '}
              {msg.role === 'user' && '👤 '}
              {msg.role === 'assistant' && '🤖 '}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: '#f1f1f1', color: '#666' }}>
              ⏳ L'assistant réfléchit...
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginTop: '10px' }}>
            ❌ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question..."
          disabled={loading}
          rows={2}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            resize: 'none',
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: '50px'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4A90D9',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: (!input.trim() || loading) ? 0.6 : 1,
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
