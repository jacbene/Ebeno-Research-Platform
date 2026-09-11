// frontend/src/components/PresenceBar.tsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import type { PresenceUser } from '../hooks/useProjectSocket';

interface PresenceBarProps {
  users: PresenceUser[];
  connected: boolean;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ users, connected }) => {
  const { colors } = useTheme();

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        backgroundColor: colors.white,
        border: `1px solid ${colors.gray[200]}`,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      {/* Indicateur de connexion */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: connected ? '#28a745' : '#dc3545',
            boxShadow: connected ? '0 0 6px #28a74588' : '0 0 6px #dc354588',
          }}
        />
        <span style={{ fontSize: '13px', color: colors.gray[600], fontWeight: 500 }}>
          {connected ? 'Connecté en temps réel' : 'Hors ligne'}
        </span>
      </div>

      {/* Avatars des utilisateurs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: colors.gray[500] }}>
          {users.length > 0
            ? `${users.length} utilisateur${users.length > 1 ? 's' : ''} en ligne`
            : 'Aucun autre utilisateur'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {users.slice(0, 5).map((user, idx) => (
            <div
              key={`${user.userId}-${idx}`}
              title={`${user.userName}${user.userEmail ? ` (${user.userEmail})` : ''}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: user.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                marginLeft: idx > 0 ? '-8px' : 0,
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                cursor: 'default',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {getInitials(user.userName)}
            </div>
          ))}

          {users.length > 5 && (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: colors.gray[300],
                color: colors.gray[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                marginLeft: '-8px',
                border: '2px solid white',
              }}
            >
              +{users.length - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
