// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import './Dashboard.css';

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
  const toast = useToast();
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
        toast.addToast({ type: 'success', title: 'Projet créé ✅' });
      } else {
        setError(response.data.message || 'Erreur lors de la création');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Tableau de bord</h1>
          <p>Bienvenue sur la plateforme Ebeno Research. Vous avez {projects.length} projet(s).</p>
        </div>
        <div className="header-actions">
          <Button variant="success" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '✕ Annuler' : '+ Nouveau projet'}
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <h3 style={{ margin: `0 0 ${theme.spacing.md} 0`, color: colors.dark }}>Créer un nouveau projet</h3>
          {error && (
            <div style={{
              backgroundColor: colors.danger + '22',
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
        </Card>
      )}

      <Card title="📁 Mes projets" style={{ marginTop: theme.spacing.lg }}>
        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Aucun projet trouvé</h3>
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
                  backgroundColor: colors.gray[50] || colors.gray[100],
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: theme.spacing.sm,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: `0 0 ${theme.spacing.xs} 0`, color: colors.dark }}>
                    {project.title}
                  </h4>
                  <p style={{ margin: `0 0 ${theme.spacing.xs} 0`, color: colors.gray[600] }}>
                    {project.description || 'Aucune description'}
                  </p>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge variant="info">{project.status}</Badge>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                      Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">Ouvrir →</Button>
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
