// frontend/src/components/TypingIndicator.tsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface TypingUser {
  userId: string;
  userName: string;
  context: string;
  isTyping: boolean;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  context?: string; // Filtrer par contexte (ex: 'memo')
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, context }) => {
  const { colors } = useTheme();

  // Filtrer par contexte si spécifié
  const filtered = context
    ? typingUsers.filter((u) => u.context === context)
    : typingUsers;

  if (filtered.length === 0) return null;

  const names = filtered.map((u) => u.userName);
  const label =
    names.length === 1
      ? `${names[0]} est en train d'écrire`
      : names.length === 2
      ? `${names[0]} et ${names[1]} sont en train d'écrire`
      : `${names.length} personnes sont en train d'écrire`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: colors.primary + '15',
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: '4px',
        fontSize: '12px',
        color: colors.primary,
        marginTop: '6px',
      }}
    >
      <span style={{ display: 'flex', gap: '2px' }}>
        <span style={{ animation: 'typingDot 1.4s infinite 0s' }}>•</span>
        <span style={{ animation: 'typingDot 1.4s infinite 0.2s' }}>•</span>
        <span style={{ animation: 'typingDot 1.4s infinite 0.4s' }}>•</span>
      </span>
      <span>{label}...</span>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
