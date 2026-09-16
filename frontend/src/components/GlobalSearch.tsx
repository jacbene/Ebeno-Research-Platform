// frontend/src/components/GlobalSearch.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

interface SearchResult {
  id: string;
  type: 'file' | 'transcription' | 'memo' | 'document';
  title: string;
  snippet: string;
  projectId: string | null;
  projectTitle: string;
  date: string;
  url: string;
  icon: string;
}

interface GlobalSearchProps {
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = 'Rechercher dans tous vos documents...',
}) => {
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  // ✅ Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Debounce de la recherche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(trimmed)}&limit=15`);
        if (res.data.success) {
          setResults(res.data.data.results || []);
          setOpen(true);
        }
      } catch (error) {
        console.error('❌ Erreur recherche:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ✅ Navigation clavier
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectedIndex >= 0 ? results[selectedIndex] : results[0];
      if (target) {
        handleNavigate(target);
      }
    }
  };

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setSelectedIndex(-1);
      setQuery('');
      navigate(result.url);
    },
    [navigate]
  );

  // ✅ Formatter la date
  const formatDate = (value: any): string => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // ✅ Grouper les résultats par type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    file: '📎 Fichiers',
    transcription: '🎙️ Transcriptions',
    memo: '📝 Memos',
    document: '🤝 Documents collaboratifs',
  };

  // ✅ Rendu du dropdown
  let globalIndex = -1;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      {/* Barre de saisie */}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            pointerEvents: 'none',
          }}
        >
          {loading ? '⏳' : '🔍'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 36px 10px 40px',
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: '24px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: colors.white,
            color: colors.dark,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: colors.gray[500],
              padding: '4px',
            }}
            title="Effacer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown des résultats */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '6px',
            backgroundColor: colors.white,
            border: `1px solid ${colors.gray[200]}`,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 500,
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          {results.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: colors.gray[500],
              fontSize: '13px',
            }}>
              {loading ? 'Recherche en cours...' : 'Aucun résultat'}
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: colors.gray[500],
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: colors.gray[50] || '#f9f9f9',
                  borderTop: `1px solid ${colors.gray[100]}`,
                }}>
                  {typeLabels[type] || type} ({items.length})
                </div>
                {items.map((result) => {
                  globalIndex++;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleNavigate(result)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                        borderLeft: isSelected ? `3px solid ${colors.primary}` : '3px solid transparent',
                        transition: 'background-color 0.1s',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>
                        {result.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '13px',
                          color: colors.dark,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {result.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: colors.gray[600],
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}>
                          {result.snippet}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '4px',
                          fontSize: '11px',
                          color: colors.gray[500],
                        }}>
                          <span>📁 {result.projectTitle}</span>
                          {result.date && <span>• {formatDate(result.date)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
