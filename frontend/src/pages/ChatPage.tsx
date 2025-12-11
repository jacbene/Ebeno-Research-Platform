import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, MessageSquare, BookOpen } from 'lucide-react';
import DeepSeekChat from '../components/deepseek/DeepSeekChat';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <Link to="/" className="back-button">
            <ArrowLeft size={20} />
            Retour au Dashboard
          </Link>
          <h2>
            <Brain size={24} />
            Assistant IA
          </h2>
        </div>

        <div className="conversations-list">
          <div className="conversation-header">
            <MessageSquare size={18} />
            <span>Conversations</span>
          </div>
          <div className="conversation-item active">
            <div className="conversation-preview">Nouvelle conversation</div>
            <div className="conversation-time">Maintenant</div>
          </div>
          {/* Vous pouvez ajouter plus de conversations ici */}
        </div>

        <div className="sidebar-actions">
          <button className="new-chat-button">
            + Nouvelle conversation
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="ai-info">
            <div className="ai-model">
              <span className="model-badge">DeepSeek-Chat</span>
              <span className="model-status">Connecté</span>
            </div>
            <p className="ai-description">
              Assistant IA spécialisé en recherche scientifique
            </p>
          </div>
        </div>
      </aside>

      {/* Chat principal */}
      <main className="chat-main">
        <DeepSeekChat />
      </main>

      {/* Sidebar droite (analyse/outils) */}
      <aside className="tools-sidebar">
        <div className="tools-header">
          <h3>Outils d'analyse</h3>
        </div>

        <div className="tools-section">
          <h4>
            <BookOpen size={18} />
            Analyse de recherche
          </h4>
          <p className="tools-description">
            Collez votre texte de recherche pour une analyse approfondie
          </p>
          
          <div className="analysis-tools">
            <button className="tool-button">
              Résumé automatique
            </button>
            <button className="tool-button">
              Analyse de méthodologie
            </button>
            <button className="tool-button">
              Vérification de sources
            </button>
            <button className="tool-button">
              Suggestions d'amélioration
            </button>
          </div>
        </div>

        <div className="tools-section">
          <h4>Paramètres</h4>
          <div className="settings">
            <div className="setting-item">
              <label>Modèle</label>
              <select defaultValue="deepseek-chat" className="model-select">
                <option value="deepseek-chat">DeepSeek-Chat (Général)</option>
                <option value="deepseek-coder">DeepSeek-Coder (Code)</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Température</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                defaultValue="0.7" 
                className="temperature-slider"
              />
              <span className="temperature-value">0.7</span>
            </div>
            <div className="setting-item">
              <label>Longueur maximale</label>
              <select defaultValue="2000" className="length-select">
                <option value="1000">1000 tokens</option>
                <option value="2000">2000 tokens</option>
                <option value="4000">4000 tokens</option>
              </select>
            </div>
          </div>
        </div>

        <div className="tools-section">
          <h4>Statistiques</h4>
          <div className="stats">
            <div className="stat-item">
              <div className="stat-label">Messages aujourd'hui</div>
              <div className="stat-value">12</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Tokens utilisés</div>
              <div className="stat-value">4,532</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Temps de réponse moyen</div>
              <div className="stat-value">2.3s</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ChatPage;
