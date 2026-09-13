// frontend/src/components/CollaborativeEditor.tsx
import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Badge } from './ui/Badge';

interface CollaborativeEditorProps {
  documentId: string;
  title: string;
  content: string;
  users: any[];
  typingUsers: any[];
  onChange: (content: string) => void;
  onCursorMove?: (position: number) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  title,
  content,
  users,
  typingUsers,
  onChange,
  onCursorMove,
}) => {
  const { colors } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onChange(newContent);

    // Debounce pour éviter trop d'événements socket
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onCursorMove && textareaRef.current) {
        onCursorMove(textareaRef.current.selectionStart);
      }
    }, 150);
  };

  const handleSelect = () => {
    if (onCursorMove && textareaRef.current) {
      onCursorMove(textareaRef.current.selectionStart);
    }
  };

  return (
    <div>
      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge variant="info">{users.length} éditeur(s)</Badge>
        </div>
      </div>

      {/* Avatars des éditeurs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: theme.spacing.md }}>
        {users.map((u, idx) => (
          <span
            key={`${u.userId}-${idx}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: u.color || '#ccc',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'white',
              opacity: 0.8,
            }} />
            {u.userName}
          </span>
        ))}
      </div>

      {/* Indicateur de frappe */}
      {typingUsers.length > 0 && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: colors.primary + '15',
          borderLeft: `3px solid ${colors.primary}`,
          borderRadius: '4px',
          fontSize: '12px',
          color: colors.primary,
          marginBottom: '10px',
        }}>
          ✍️ {typingUsers.map((u) => u.userName).join(', ')}{' '}
          {typingUsers.length > 1 ? 'sont en train d\'écrire' : 'est en train d\'écrire'}...
        </div>
      )}

      {/* Zone d'édition */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        style={{
          width: '100%',
          minHeight: '500px',
          padding: theme.spacing.md,
          border: `1px solid ${colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          fontSize: '14px',
          fontFamily: 'Monaco, Menlo, monospace',
          lineHeight: '1.6',
          resize: 'vertical',
          outline: 'none',
          backgroundColor: colors.white,
          color: colors.dark,
        }}
        placeholder="Commencez à écrire..."
      />
    </div>
  );
};
