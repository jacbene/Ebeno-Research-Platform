// frontend/src/pages/ChatPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import './ChatPage.css';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const ChatPage: React.FC = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Message d'accueil : recréé quand la langue change
  useEffect(() => {
    setMessages((prev) => {
      // Si l'historique est vide ou contient uniquement le message d'accueil, on le régénère
      const hasOnlyWelcome = prev.length === 0 || (prev.length === 1 && prev[0].role === 'system');
      if (hasOnlyWelcome) {
        return [{ role: 'system', content: t('chat.welcome') }];
      }
      return prev;
    });
  }, [i18n.language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmedInput }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/deepseek/chat', {
        messages: [...messages, { role: 'user', content: trimmedInput }],
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.data.data?.content || t('chat.fallbackResponse'),
          },
        ]);
      } else {
        setError(response.data.message || t('chat.errors.communication'));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t('chat.errors.assistantError') },
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('chat.errors.server'));
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.errors.serverUnreachable') },
      ]);
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: colors.body,
        borderRadius: '12px',
        transition: 'background-color 0.3s ease',
      }}
    >
      <h1 style={{ margin: '0 0 15px 0', fontSize: '24px', color: colors.dark }}>
        {t('chat.title')}
      </h1>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: colors.white,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '15px',
          border: `1px solid ${colors.gray[200]}`,
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isUser
                    ? colors.primary
                    : isSystem
                    ? colors.primary + '15'
                    : colors.gray[100],
                  color: isUser ? colors.white : colors.dark,
                  border: isSystem ? `1px solid ${colors.primary}30` : 'none',
                  fontStyle: isSystem ? 'italic' : 'normal',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {isUser && '👤 '}
                {!isUser && '🤖 '}
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: colors.gray[100],
                color: colors.gray[600],
              }}
            >
              {t('chat.loading')}
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: colors.danger + '22',
              color: colors.danger,
              borderRadius: '8px',
              marginTop: '10px',
            }}
          >
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
          placeholder={t('chat.placeholder')}
          disabled={loading}
          rows={2}
          style={{
            flex: 1,
            padding: '12px 14px',
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: '12px',
            fontSize: '15px',
            resize: 'none',
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: '54px',
            backgroundColor: colors.white,
            color: colors.dark,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: '12px',
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: !input.trim() || loading ? 0.6 : 1,
            height: '54px',
            minWidth: '70px',
            transition: 'opacity 0.2s ease',
          }}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
