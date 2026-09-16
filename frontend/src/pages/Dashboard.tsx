// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

interface RecentFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
  projectId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatar: string | null;
}

interface DashboardStats {
  projectId: string | null;
  selectedProject: Project | null;
  counts: {
    projects: number;
    files: number;
    audioTranscriptions: number;
    textDocuments: number;
    transcriptions: number;
    memos: number;
    entities: number;
    collaborativeDocs: number;
  };
  transcriptionStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    userName: string;
    targetName?: string | null;
    createdAt: string;
  }>;
  recentProjects: Project[];
  recentFiles: RecentFile[];
}

// ✅ Icônes d'action
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
    case 'memo-created': return '📝';
    case 'text-uploaded': return '📄';
    case 'document-created': return '📄';
    case 'document-renamed': return '✏️';
    case 'document-deleted': return '🗑️';
    case 'member-added': return '👥';
    case 'member-removed': return '👋';
    default: return '📌';
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'file-uploaded': return 'a uploadé un fichier';
    case 'file-trashed': return 'a mis un fichier à la corbeille';
    case 'file-restored': return 'a restauré un fichier';
    case 'file-deleted-permanently': return 'a supprimé un fichier';
    case 'transcription-uploaded': return 'a ajouté une transcription';
    case 'transcription-trashed': return 'a mis une transcription à la corbeille';
    case 'transcription-restored': return 'a restauré une transcription';
    case 'transcription-deleted-permanently': return 'a supprimé une transcription';
    case 'trash-emptied': return 'a vidé la corbeille';
    case 'memo-created': return 'a créé un memo';
    case 'text-uploaded': return 'a importé un texte';
    case 'document-created': return 'a créé un document';
    case 'document-renamed': return 'a renommé un document';
    case 'document-deleted': return 'a supprimé un document';
    case 'member-added': return 'a ajouté un membre';
    case 'member-removed': return 'a retiré un membre';
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
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['txt', 'md'].includes(ext)) return '📄';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return '🎵';
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬';
  return '📎';
};

const getInitials = (name: string | null, email: string): string => {
  const display = name || email;
  if (!display) return '?';
  const parts = display.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Dashboard: React.FC = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

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

  const fetchStats = async (projectId?: string) => {
    setStatsLoading(true);
    try {
      const url = projectId && projectId !== 'all'
        ? `/stats/dashboard?projectId=${encodeURIComponent(projectId)}`
        : '/stats/dashboard';
      const response = await api.get(url);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Erreur fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchStats(selectedProjectId);
  }, [selectedProjectId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setError('');

    try {
      const response = await api.post('/projects', {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      if (response.data.success) {
        setNewTitle('');
        setNewDescription('');
        setShowCreateForm(false);
        await fetchProjects();
        await fetchStats(selectedProjectId);
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

  const isFiltered = selectedProjectId !== 'all';
  const selectedProject = stats?.selectedProject;

  // ✅ Cartes de statistiques
  const statCards = stats
    ? [
        ...(!isFiltered
          ? [
              {
                icon: '📁',
                label: 'Projets',
                value: stats.counts.projects,
                color: '#4A6CF7',
                bg: '#e6f0ff',
                link: '/',
              },
            ]
          : []),
        {
          icon: '📎',
          label: isFiltered ? 'Fichiers du projet' : 'Mes fichiers',
          value: stats.counts.files,
          color: '#1a7a1a',
          bg: '#e6f5e6',
          link: '#',
        },
        {
          icon: '🎙️',
          label: 'Transcriptions audio',
          value: stats.counts.audioTranscriptions,
          color: '#0080a0',
          bg: '#e6f9ff',
          link: '/transcriptions?type=audio',
        },
        {
          icon: '📄',
          label: 'Textes importés',
          value: stats.counts.textDocuments,
          color: '#0052cc',
          bg: '#e6f0ff',
          link: '/transcriptions?type=text',
        },
        {
          icon: '📝',
          label: isFiltered ? 'Memos du projet' : 'Mes memos',
          value: stats.counts.memos,
          color: '#d35400',
          bg: '#fff0e6',
          link: '#',
        },
        {
          icon: '🏷️',
          label: 'Entités',
          value: stats.counts.entities,
          color: '#8000a0',
          bg: '#fce6ff',
          link: '#',
        },
        {
          icon: '🤝',
          label: 'Docs collaboratifs',
          value: stats.counts.collaborativeDocs,
          color: '#c00060',
          bg: '#ffe6f0',
          link: '/collaboration',
        },
      ]
    : [];

  return (
    <div className="dashboard-container">
      {/* En-tête */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>👋 Bonjour {currentUser?.name?.split(' ')[0] || 'chercheur'} !</h1>
          <p>
            {isFiltered && selectedProject
              ? `Vue du projet : ${selectedProject.title}`
              : stats
              ? `Vous avez ${stats.counts.projects} projet(s), ${stats.counts.files + stats.counts.transcriptions} document(s) et ${stats.counts.entities} entité(s).`
              : 'Bienvenue sur la plateforme Ebeno Research.'}
          </p>
        </div>
        <div className="header-actions">
          <Button variant="success" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '✕ Annuler' : '+ Nouveau projet'}
          </Button>
        </div>
      </div>

      {/* ✅ Sélecteur de projet */}
      {projects.length > 0 && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📁</span>
              <label style={{
                fontSize: '14px',
                fontWeight: 600,
                color: colors.dark,
                whiteSpace: 'nowrap',
              }}>
                Filtrer par projet :
              </label>
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px 14px',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
                backgroundColor: colors.white,
                color: colors.dark,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">🌐 Tous mes projets ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.userId === currentUser?.id ? '👑 ' : ''}
                  {p.title}
                </option>
              ))}
            </select>

            {isFiltered && (
              <button
                onClick={() => setSelectedProjectId('all')}
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.gray[200],
                  color: colors.dark,
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <h3 style={{ margin: `0 0 ${theme.spacing.md} 0`, color: colors.dark }}>
            Créer un nouveau projet
          </h3>
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
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Cartes de statistiques */}
      {statsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.gray[500] }}>
          Chargement des statistiques...
        </div>
      ) : stats ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {statCards.map((card) => (
              <div
                key={card.label}
                onClick={() => {
                  if (card.link && card.link !== '#') navigate(card.link);
                }}
                style={{
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: '16px',
                  padding: '20px',
                  transition: 'all 0.25s ease',
                  cursor: card.link !== '#' ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = card.color + '60';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = colors.gray[200];
                }}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  backgroundColor: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: colors.dark,
                    lineHeight: 1,
                  }}>
                    {card.value}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: colors.gray[600],
                    marginTop: '4px',
                  }}>
                    {card.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ Fichiers récents avec auteur */}
          {stats.recentFiles.length > 0 && (
            <Card
              title={isFiltered ? '📎 Fichiers récents du projet' : '📎 Fichiers récents de mes projets'}
              style={{ marginBottom: theme.spacing.lg }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.recentFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: colors.gray[50] || '#fafafa',
                      borderRadius: '10px',
                      border: `1px solid ${colors.gray[200]}`,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.gray[50] || '#fafafa')}
                  >
                    {/* Icône fichier */}
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>
                      {getFileIcon(file.fileName)}
                    </span>

                    {/* Infos fichier */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: colors.dark,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.fileName}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12px',
                        color: colors.gray[500],
                        marginTop: '2px',
                        flexWrap: 'wrap',
                      }}>
                        <span>💾 {formatFileSize(file.fileSize)}</span>
                        <span>📅 {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* ✅ Auteur */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 10px 4px 4px',
                        backgroundColor: colors.white,
                        borderRadius: '20px',
                        border: `1px solid ${colors.gray[200]}`,
                        flexShrink: 0,
                      }}
                      title={`Uploadé par ${file.authorName || file.authorEmail}`}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: colors.primary,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {file.authorAvatar ? (
                          <img
                            src={file.authorAvatar}
                            alt={file.authorName || file.authorEmail}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          getInitials(file.authorName, file.authorEmail)
                        )}
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: colors.gray[600],
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.authorName || file.authorEmail.split('@')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Statut des transcriptions */}
          {(stats.transcriptionStatus.pending + stats.transcriptionStatus.processing + stats.transcriptionStatus.completed + stats.transcriptionStatus.failed) > 0 && (
            <Card title="🎙️ Statut des transcriptions audio" style={{ marginBottom: theme.spacing.lg }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}>
                <div style={{
                  padding: '14px',
                  backgroundColor: colors.warning + '15',
                  borderLeft: `4px solid ${colors.warning}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: colors.dark }}>
                    {stats.transcriptionStatus.pending}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.gray[600] }}>⏳ En attente</div>
                </div>
                <div style={{
                  padding: '14px',
                  backgroundColor: colors.info + '15',
                  borderLeft: `4px solid ${colors.info}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: colors.dark }}>
                    {stats.transcriptionStatus.processing}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.gray[600] }}>⚙️ En cours</div>
                </div>
                <div style={{
                  padding: '14px',
                  backgroundColor: colors.success + '15',
                  borderLeft: `4px solid ${colors.success}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: colors.dark }}>
                    {stats.transcriptionStatus.completed}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.gray[600] }}>✅ Terminées</div>
                </div>
                <div style={{
                  padding: '14px',
                  backgroundColor: colors.danger + '15',
                  borderLeft: `4px solid ${colors.danger}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: colors.dark }}>
                    {stats.transcriptionStatus.failed}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.gray[600] }}>❌ Échecs</div>
                </div>
              </div>
            </Card>
          )}

          {/* Activité récente */}
          {stats.recentActivity.length > 0 && (
            <Card title="📋 Activité récente" style={{ marginBottom: theme.spacing.lg }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: colors.gray[50] || '#fafafa',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>
                      {getActionIcon(activity.action)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: colors.dark }}>
                        <strong>{activity.userName}</strong>{' '}
                        <span style={{ color: colors.gray[600] }}>
                          {getActionLabel(activity.action)}
                        </span>
                        {activity.targetName && (
                          <span style={{ color: colors.primary, fontWeight: 500 }}>
                            {' '}{activity.targetName}
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: colors.gray[500], flexShrink: 0 }}>
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Projets récents (uniquement en mode "tous projets") */}
          {!isFiltered && stats.recentProjects.length > 0 && (
            <Card title="📁 Projets récents" style={{ marginBottom: theme.spacing.lg }}>
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                {stats.recentProjects.map((project) => {
                  const isOwner = project.userId === currentUser?.id;
                  return (
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
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          margin: `0 0 ${theme.spacing.xs} 0`,
                          color: colors.dark,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}>
                          {project.title}
                          {isOwner && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: '#ffc107',
                              color: '#856404',
                              fontWeight: 'bold',
                            }}>
                              👑
                            </span>
                          )}
                        </h4>
                        <p style={{
                          margin: `0 0 ${theme.spacing.xs} 0`,
                          color: colors.gray[600],
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {project.description || 'Aucune description'}
                        </p>
                        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge variant="info">{project.status}</Badge>
                          <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                            Modifié le {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                        >
                          Ouvrir →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      ) : null}

      {/* Liste complète des projets (uniquement en mode "tous projets") */}
      {!isFiltered && (
        <Card title="📚 Tous mes projets" style={{ marginTop: theme.spacing.lg }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: `3px solid ${colors.gray[200]}`,
                borderTop: `3px solid ${colors.primary}`,
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 1s linear infinite',
              }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : projects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: colors.gray[500],
              border: `2px dashed ${colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
              <h3 style={{ color: colors.gray[600], marginBottom: '8px' }}>Aucun projet trouvé</h3>
              <p style={{ marginBottom: '16px' }}>Cliquez sur "Nouveau projet" pour commencer</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {projects.map((project) => {
                const isOwner = project.userId === currentUser?.id;
                return (
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
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = colors.primary + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = colors.gray[200];
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: `0 0 ${theme.spacing.xs} 0`,
                        color: colors.dark,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}>
                        {project.title}
                        {isOwner && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#ffc107',
                            color: '#856404',
                            fontWeight: 'bold',
                          }}>
                            👑 Propriétaire
                          </span>
                        )}
                      </h4>
                      <p style={{
                        margin: `0 0 ${theme.spacing.xs} 0`,
                        color: colors.gray[600],
                        fontSize: '13px',
                      }}>
                        {project.description || 'Aucune description'}
                      </p>
                      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge variant="info">{project.status}</Badge>
                        <Badge variant="secondary">{project.visibility}</Badge>
                        <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                          Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                      >
                        Ouvrir →
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
