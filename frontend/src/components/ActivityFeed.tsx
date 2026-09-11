// frontend/src/components/ActivityFeed.tsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import type { ActivityItem } from '../hooks/useProjectSocket';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const getActionIcon = (action: string): string => {
  switch (action) {
    case 'file-uploaded': return '📤';
    case 'file-trashed': return '🗑️';
    case 'file-restored': return '♻️';
    case 'file-deleted-permanently': return '💥';
    case 'transcription-uploaded': return '🎙️';
    case 'transcription-trashed': return '🗑️';
    case 'transcription-restored': return '♻️';
    case 'transcription-deleted-permanently': return '💥';
    case 'trash-emptied': return '🧹';
    case 'summary-generated': return '📝';
    case 'entities-extracted': return '🏷️';
    case 'memo-created': return '📋';
    default: return '📌';
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'file-uploaded': return 'a uploadé un fichier';
    case 'file-trashed': return 'a mis à la corbeille';
    case 'file-restored': return 'a restauré';
    case 'file-deleted-permanently': return 'a supprimé définitivement';
    case 'transcription-uploaded': return 'a ajouté une transcription';
    case 'transcription-trashed': return 'a mis à la corbeille';
    case 'transcription-restored': return 'a restauré';
    case 'transcription-deleted-permanently': return 'a supprimé définitivement';
    case 'trash-emptied': return 'a vidé la corbeille';
    case 'summary-generated': return 'a généré un résumé';
    case 'entities-extracted': return 'a extrait des entités';
    case 'memo-created': return 'a créé un memo';
    default: return action;
  }
};

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'à l\'instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const { colors } = useTheme();

  if (activities.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: colors.gray[500],
        fontSize: '13px',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
        Aucune activité récente.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '4px 0' }}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '10px 12px',
            borderBottom: `1px solid ${colors.gray[100]}`,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>
            {getActionIcon(activity.action)}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: colors.dark }}>
              <strong>{activity.userName}</strong>{' '}
              <span style={{ color: colors.gray[600] }}>{getActionLabel(activity.action)}</span>
              {activity.targetName && (
                <span style={{ color: colors.gray[600] }}>{' '}
                  <em style={{
                    fontStyle: 'normal',
                    fontWeight: 500,
                    color: colors.primary,
                  }}>
                    {activity.targetName}
                  </em>
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: colors.gray[400], marginTop: '2px' }}>
              {formatRelativeTime(activity.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
