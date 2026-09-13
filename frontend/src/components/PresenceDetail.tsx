// frontend/src/components/PresenceDetail.tsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import type { PresenceUser } from '../hooks/useProjectSocket';

interface PresenceDetailProps {
  users: PresenceUser[];
  connected: boolean;
  myColor: string;
  currentUserId?: string;
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDuration = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
};

export const PresenceDetail: React.FC<PresenceDetailProps> = ({
  users,
  connected,
  myColor,
  currentUserId,
}) => {
  const { colors } = useTheme();

  return (
    <div>
      {/* Statut global */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: connected ? '#e6f7eb' : '#fdecea',
        border: `1px solid ${connected ? '#a3d9a5' : '#f5c6cb'}`,
        borderRadius: theme.borderRadius.md,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: connected ? '#28a745' : '#dc3545',
          boxShadow: connected ? '0 0 8px #28a74566' : '0 0 8px #dc354566',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: connected ? '#155724' : '#721c24' }}>
            {connected ? 'Connecté en temps réel' : 'Hors ligne'}
          </div>
          <div style={{ fontSize: '12px', color: colors.gray[600], marginTop: '2px' }}>
            {connected
              ? 'Vous recevez les mises à jour en direct des collaborateurs.'
              : 'Reconnexion automatique en cours...'}
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: colors.gray[700] }}>
        👥 {users.length} utilisateur{users.length > 1 ? 's' : ''} en ligne
      </h4>

      {users.length === 0 ? (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          color: colors.gray[500],
          fontSize: '13px',
          border: `1px dashed ${colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
          Vous êtes le seul utilisateur connecté à ce projet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.map((user) => {
            const isMe = user.userId === currentUserId;
            return (
              <div
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  border: `1px solid ${isMe ? user.color + '55' : colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: isMe ? user.color + '11' : colors.white,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: user.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {getInitials(user.userName)}
                  {/* Indicateur "en ligne" */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#28a745',
                      border: '2px solid white',
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: colors.dark }}>
                    {user.userName}
                    {isMe && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: user.color,
                        color: 'white',
                        fontWeight: 'normal',
                      }}>
                        Vous
                      </span>
                    )}
                  </div>
                  {user.userEmail && (
                    <div style={{ fontSize: '12px', color: colors.gray[500], marginTop: '2px' }}>
                      {user.userEmail}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: colors.gray[500] }}>
                    Connecté depuis
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: colors.gray[700] }}>
                    {formatDuration(user.joinedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info technique */}
      <div style={{
        marginTop: '16px',
        padding: '10px 14px',
        backgroundColor: colors.gray[50] || '#f9f9f9',
        borderRadius: theme.borderRadius.md,
        fontSize: '11px',
        color: colors.gray[500],
        borderLeft: `3px solid ${myColor}`,
      }}>
        💡 Votre couleur d'identification est <strong style={{ color: myColor }}>{myColor}</strong>.
        Elle apparaît à côté de vos actions dans le fil d'activité.
      </div>
    </div>
  );
};
