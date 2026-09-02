// frontend/src/components/ProjectMembers.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { theme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ProjectMembersProps {
  projectId: string;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({ projectId }) => {
  const { colors } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  const fetchMembers = async () => {
    setFetching(true);
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      setError('Impossible de charger les membres');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/projects/${projectId}/members`, { email: email.trim(), role });
      setEmail('');
      setRole('MEMBER');
      await fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Retirer ce membre du projet ?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      await fetchMembers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const isOwner = members.some(m => m.role === 'OWNER' && m.id === 'currentUserId'); // À adapter avec le vrai userId

  return (
    <div style={{ marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: colors.gray[100], borderRadius: theme.borderRadius.md }}>
      <h4 style={{ margin: '0 0 12px 0' }}>👥 Membres du projet</h4>

      {error && (
        <div style={{ color: colors.danger, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.sm }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={addMember} style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.md }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email du membre"
          required
          disabled={loading}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: theme.spacing.sm,
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: theme.borderRadius.sm,
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: colors.white,
            color: colors.dark,
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
          style={{
            padding: theme.spacing.sm,
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: theme.borderRadius.sm,
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: colors.white,
            color: colors.dark,
          }}
        >
          <option value="VIEWER">👁️ Viewer</option>
          <option value="MEMBER">👤 Member</option>
          <option value="EDITOR">✏️ Editor</option>
          <option value="OWNER">👑 Owner</option>
        </select>
        <Button type="submit" disabled={loading} size="sm" variant="primary">
          {loading ? '...' : '➕ Ajouter'}
        </Button>
      </form>

      {fetching ? (
        <p style={{ color: colors.gray[500], fontSize: theme.typography.fontSize.sm }}>Chargement...</p>
      ) : members.length === 0 ? (
        <p style={{ color: colors.gray[500], fontSize: theme.typography.fontSize.sm }}>Aucun membre pour l'instant.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {members.map((m) => {
            const isOwner = m.role === 'OWNER';
            return (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: `1px solid ${colors.gray[200]}`,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                <span>
                  <strong>{m.name || m.email}</strong>
                  <span style={{ color: colors.gray[600], marginLeft: theme.spacing.sm }}>({m.role})</span>
                  {isOwner && (
                    <span style={{ marginLeft: theme.spacing.sm, backgroundColor: colors.warning, color: colors.dark, padding: '0 8px', borderRadius: theme.borderRadius.sm, fontSize: '11px', fontWeight: 'bold' }}>
                      👑 Propriétaire
                    </span>
                  )}
                </span>
                {!isOwner ? (
                  <button
                    onClick={() => removeMember(m.id)}
                    style={{
                      color: colors.danger,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <span style={{ color: colors.gray[500], fontSize: '12px' }}>⛔ Non supprimable</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
