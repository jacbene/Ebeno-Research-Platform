import React, { useState, useEffect } from 'react';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${projectId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    }
  };

  useEffect(() => {
    if (projectId) fetchMembers();
  }, [projectId]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: email.trim(), role })
      });
      if (response.ok) {
        setEmail('');
        setRole('MEMBER');
        fetchMembers();
      } else {
        const err = await response.json();
        setError(err.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Retirer ce membre du projet ?')) return;
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`http://localhost:5001/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMembers();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  return (
    <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 12px 0' }}>👥 Membres du projet</h4>

      {error && (
        <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '8px' }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={addMember} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email du membre"
          required
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        >
          <option value="VIEWER">👁️ Viewer</option>
          <option value="MEMBER">👤 Member</option>
          <option value="EDITOR">✏️ Editor</option>
          <option value="OWNER">👑 Owner</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? '...' : '➕ Ajouter'}
        </button>
      </form>

      {members.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>Aucun membre pour l'instant.</p>
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
                  padding: '6px 0',
                  borderBottom: '1px solid #eee',
                  fontSize: '14px'
                }}
              >
                <span>
                  <strong>{m.name || m.email}</strong>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    ({m.role})
                  </span>
                  {isOwner && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: '#ffc107',
                      color: '#333',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      👑 Propriétaire
                    </span>
                  )}
                </span>
                {!isOwner ? (
                  <button
                    onClick={() => removeMember(m.id)}
                    style={{
                      color: '#dc3545',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <span style={{ color: '#999', fontSize: '12px' }}>
                    ⛔ Non supprimable
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
