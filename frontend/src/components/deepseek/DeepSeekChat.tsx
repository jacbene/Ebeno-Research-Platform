import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { useDeepSeekChat } from '../../hooks/useDeepSeekChat';
import './DeepSeekChat.css'; // Nous créerons ce fichier après

const DeepSeekChat: React.FC = () => {
  const { messages, isLoading, error, sendMessage, clearChat } = useDeepSeekChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="deepseek-chat-container">
      <div className="chat-header">
        <div className="header-left">
          <Bot className="header-icon" size={24} />
          <div>
            <h2>Assistant de Recherche DeepSeek</h2>
            <p className="header-subtitle">Spécialisé en recherche scientifique</p>
          </div>
        </div>
        <button 
          onClick={clearChat} 
          className="clear-button"
          disabled={messages.length <= 1}
        >
          <Trash2 size={18} />
          Effacer
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? (
                <User size={20} />
              ) : (
                <Bot size={20} />
              )}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              {message.timestamp && (
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <Loader2 className="loading-icon" size={16} />
                <span>DeepSeek réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question de recherche..."
            rows={3}
            disabled={isLoading}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? (
              <Loader2 className="loading-icon" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <div className="input-hint">
          <span>Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne</span>
        </div>
      </form>

      <div className="chat-footer">
        <div className="model-info">
          <span className="model-tag">DeepSeek-Chat</span>
          <span className="model-description">Modèle spécialisé en recherche</span>
        </div>
        <div className="message-count">
          {messages.filter(m => m.role !== 'system').length} messages
        </div>
      </div>
    </div>
  );
};

export default DeepSeekChat;
