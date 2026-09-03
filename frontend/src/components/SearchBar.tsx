import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

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
    try {
      const response = await api.get(`/projects/${projectId}/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        onResults(response.data.data);
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
