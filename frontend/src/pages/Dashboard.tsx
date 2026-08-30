// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  created_at: number;
  updated_at: number;
  userId: string;
}

const Dashboard: React.FC = () => {
  const { colors } = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('http://localhost:5001/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Erreur fetch projets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setError('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('http://localhost:5001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewTitle('');
        setNewDescription('');
        setShowCreateForm(false);
        await fetchProjects();
      } else {
        setError(data.message || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '8px' : '0' }}>
      <Card title="📊 Tableau de bord" subtitle={`Bienvenue sur la plateforme Ebeno Research. Vous avez ${projects.length} projet(s).`}>
        <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', marginBottom: theme.spacing.md }}>
          <Button variant="success" onClick={() => setShowCreateForm(!showCreateForm)} style={{ width: isMobile ? '100%' : 'auto' }}>
            {showCreateForm ? '✕ Annuler' : '+ Nouveau projet'}
          </Button>
        </div>

        {showCreateForm && (
          <div style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.lg,
            border: `1px solid ${colors.gray[200]}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: colors.gray[100],
          }}>
            <h3 style={{ margin: `0 0 ${theme.spacing.md} 0` }}>Créer un nouveau projet</h3>
            {error && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: colors.danger,
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
              }}>
                ❌ {error}
              </div>
            )}
            <form onSubmit={handleCreateProject}>
              <Input
                label="Titre *"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Mon projet de recherche"
                required
              />
              <Input
                label="Description"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Décrivez votre projet..."
              />
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: theme.spacing.sm }}>
                <Button type="submit" variant="success" disabled={creating} style={{ width: isMobile ? '100%' : 'auto' }}>
                  {creating ? 'Création...' : 'Créer le projet'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowCreateForm(false); setError(''); }} style={{ width: isMobile ? '100%' : 'auto' }}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      <Card title="📁 Mes projets" style={{ marginTop: theme.spacing.lg }}>
        {loading ? (
          <p>Chargement...</p>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.gray[500] }}>
            <p style={{ fontSize: theme.typography.fontSize.lg }}>Aucun projet trouvé</p>
            <p>Cliquez sur "Nouveau projet" pour commencer</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: colors.white,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: `0 0 ${theme.spacing.xs} 0` }}>
                    {project.title}
                    <span style={{ fontSize: '12px', color: colors.gray[500], marginLeft: '8px' }}>
                      (ID: {project.id})
                    </span>
                  </h4>
                  <p style={{ margin: `0 0 ${theme.spacing.xs} 0`, color: colors.gray[600] }}>
                    {project.description || 'Aucune description'}
                  </p>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                    <Badge variant="info">{project.status}</Badge>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                      Créé le {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                  <Link to={`/project/${project.id}`} style={{ textDecoration: 'none', width: isMobile ? '100%' : 'auto' }}>
                    <Button variant="outline" size="sm" style={{ width: isMobile ? '100%' : 'auto' }}>Voir</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
