// frontend/src/components/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SearchResult {
  id: string;
  title: string;
  transcriptText?: string;
  content?: string;
  fileName?: string;
  type?: string;
  source: 'transcription' | 'memo' | 'file';
  created_at: number;
}

interface SearchBarProps {
  projectId: string;
  onResults: (results: SearchResult[]) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ projectId, onResults, placeholder = 'Rechercher dans le projet...' }) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      performSearch();
    } else {
      onResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    if (query.length < 2) return;
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${projectId}/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        onResults(data.data);
      } else {
        onResults([]);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      onResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (result: SearchResult) => {
    if (result.source === 'transcription') {
      return result.type === 'audio' ? '🎙️' : '📄';
    }
    if (result.source === 'memo') return '📝';
    if (result.source === 'file') return '📎';
    return '📄';
  };

  const getContentPreview = (result: SearchResult) => {
    const text = result.transcriptText || result.content || result.fileName || '';
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 40);
      const end = Math.min(text.length, index + query.length + 40);
      return '...' + text.substring(start, end) + '...';
    }
    return text.substring(0, 80) + '...';
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'transcription': return 'Transcription';
      case 'memo': return 'Memo';
      case 'file': return 'Fichier';
      default: return '';
    }
  };

  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', color: colors.gray[500], zIndex: 1 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 10px 10px 36px',
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: colors.white,
            color: colors.dark,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        {loading && <span style={{ position: 'absolute', right: '12px' }}>⏳</span>}
        {query && !loading && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.gray[500],
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
