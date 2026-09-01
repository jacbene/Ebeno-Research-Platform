import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

const Dashboard: React.FC = () => {
  const { colors } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/projects');
      if (response.data.success) {
        setProjects(response.data.data || []);
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

    try {
      const response = await api.post('/projects', {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined
      });
      if (response.data.success) {
        setNewTitle('');
        setNewDescription('');
        setShowCreateForm(false);
        await fetchProjects();
      } else {
        setError(response.data.message || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="📊 Tableau de bord" subtitle={`Bienvenue sur la plateforme Ebeno Research. Vous avez ${projects.length} projet(s).`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: theme.spacing.md }}>
          <Button variant="success" onClick={() => setShowCreateForm(!showCreateForm)}>
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
              <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                <Button type="submit" variant="success" disabled={creating}>
                  {creating ? 'Création...' : 'Créer le projet'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowCreateForm(false); setError(''); }}>
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
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
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
                      Créé le {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Voir</Button>
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
