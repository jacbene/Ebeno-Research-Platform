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
import { LanguageBadge } from '../components/LanguageBadge';
import { useTranslation } from 'react-i18next';

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
  language?: string | null;    // ✅ AJOUT
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatar: string | null;
}

interface TopEntity {
  value: string;
  type: string;
  count: number;
  percentage: number;
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
  topEntities: TopEntity[];
  entitiesByType: Record<string, TopEntity[]>;
}

// ✅ Configuration d'affichage par type d'entité
const ENTITY_TYPES: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  Person: { icon: '👤', label: 'Personnes', color: '#0052cc', bg: '#e6f0ff' },
  Place: { icon: '📍', label: 'Lieux', color: '#1a7a1a', bg: '#e6f5e6' },
  Organization: { icon: '🏢', label: 'Organisations', color: '#8000a0', bg: '#fce6ff' },
  Date: { icon: '📅', label: 'Dates', color: '#d35400', bg: '#fff0e6' },
  Email: { icon: '📧', label: 'Emails', color: '#0080a0', bg: '#e6f9ff' },
  Phone: { icon: '📞', label: 'Téléphones', color: '#c00060', bg: '#ffe6f0' },
  Url: { icon: '🔗', label: 'URLs', color: '#6c757d', bg: '#f0f0f0' },
};

const getEntityTypeConfig = (type: string) =>
  ENTITY_TYPES[type] || { icon: '🏷️', label: type, color: '#6c757d', bg: '#f0f0f0' };

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

const getActionLabelLocal = (action: string, t: (key: string) => string): string => {
  return t(`dashboard.actions.${action}`) || action;
};

const formatRelativeTime = (iso: string, t: (key: string, opts?: any) => string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t('dashboard.relativeTime.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('dashboard.relativeTime.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('dashboard.relativeTime.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('dashboard.relativeTime.daysAgo', { count: days });
  return new Date(iso).toLocaleDateString();
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
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

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
    setEntityFilter('all');
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
        toast.addToast({ type: 'success', title: t('dashboard.createProject.success') });
      } else {
        setError(response.data.message || t('dashboard.createProject.error'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('dashboard.createProject.errorServer'));

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
              label: t('dashboard.stats.projects'),           // ✅
              value: stats.counts.projects,
              color: '#4A6CF7',
              bg: '#e6f0ff',
              link: '/',
            },
          ]
        : []),
      {
        icon: '📎',
        label: isFiltered ? t('dashboard.stats.filesOfProject') : t('dashboard.stats.files'),  // ✅
        value: stats.counts.files,
        color: '#1a7a1a',
        bg: '#e6f5e6',
        link: '#',
      },
      {
        icon: '🎙️',
        label: t('dashboard.stats.audioTranscriptions'),    // ✅
        value: stats.counts.audioTranscriptions,
        color: '#0080a0',
        bg: '#e6f9ff',
        link: '/transcriptions?type=audio',
      },
      {
        icon: '📄',
        label: t('dashboard.stats.textDocuments'),          // ✅
        value: stats.counts.textDocuments,
        color: '#0052cc',
        bg: '#e6f0ff',
        link: '/transcriptions?type=text',
      },
      {
        icon: '📝',
        label: isFiltered ? t('dashboard.stats.memosOfProject') : t('dashboard.stats.memos'),  // ✅
        value: stats.counts.memos,
        color: '#d35400',
        bg: '#fff0e6',
        link: '#',
      },
      {
        icon: '🏷️',
        label: t('dashboard.stats.entities'),               // ✅
        value: stats.counts.entities,
        color: '#8000a0',
        bg: '#fce6ff',
        link: '#',
      },
      {
        icon: '🤝',
        label: t('dashboard.stats.collaborativeDocs'),      // ✅
        value: stats.counts.collaborativeDocs,
        color: '#c00060',
        bg: '#ffe6f0',
        link: '/collaboration',
      },
    ]
  : [];

// À l'intérieur du composant Dashboard, avant le return :
{getActionLabelLocal(activity.action)}

  return (
    <div className="dashboard-container">
      {/* En-tête */}
      <div className="dashboard-header">
  <div className="header-content">
    <h1>👋 {t('dashboard.greeting', { name: currentUser?.name?.split(' ')[0] || 'chercheur' })}</h1>
    <p>
      {isFiltered && selectedProject
        ? t('dashboard.viewProject', { title: selectedProject.title })
        : stats
        ? t('dashboard.summary', {
            projects: stats.counts.projects,
            documents: stats.counts.files + stats.counts.transcriptions,
            entities: stats.counts.entities,
          })
        : t('dashboard.welcome')}
    </p>
  </div>
  <div className="header-actions">
    <Button variant="success" onClick={() => setShowCreateForm(!showCreateForm)}>
      {showCreateForm ? `✕ ${t('dashboard.cancel')}` : `+ ${t('dashboard.newProject')}`}
    </Button>
  </div>
  </div>

      {/* Sélecteur de projet */}
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
                {t('dashboard.filterByProject')}
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
             <option value="all">🌐 {t('dashboard.allProjects')} ({projects.length})</option>

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
                 ✕ {t('dashboard.reset')}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <h3 style={{ margin: `0 0 ${theme.spacing.md} 0`, color: colors.dark }}>
            {t('dashboard.createProject.title')}
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
              label={t('dashboard.createProject.titleLabel')}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('dashboard.createProject.titlePlaceholder')}
              required
            />
            <Input
            label={t('dashboard.createProject.descriptionLabel')}
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t('dashboard.createProject.descriptionPlaceholder')}
            />
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <Button type="submit" variant="success" disabled={creating}>
                {creating ? t('common.creating') : t('dashboard.createProject.submit')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                }}
              >
                {t('dashboard.createProject.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Cartes de statistiques */}
      {statsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.gray[500] }}>
          {t('dashboard.loadingStats')}
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

          {/* ✅ Top Entités */}
          {stats.topEntities && stats.topEntities.length > 0 && (
            <Card title={t('dashboard.topEntities.title')} style={{ marginBottom: theme.spacing.lg }}>

              {/* Filtres par type */}
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                marginBottom: theme.spacing.md,
              }}>
                <button
                  onClick={() => setEntityFilter('all')}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: entityFilter === 'all' ? colors.primary : colors.gray[200],
                    color: entityFilter === 'all' ? 'white' : colors.dark,
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: entityFilter === 'all' ? 'bold' : 'normal',
                  }}
                >
                   {t('dashboard.topEntities.all')} ({stats.topEntities.length})
                </button>
                {Object.keys(stats.entitiesByType).map((type) => {
                  const cfg = getEntityTypeConfig(type);
                  const count = stats.entitiesByType[type].length;
                  return (
                    <button
                      key={type}
                      onClick={() => setEntityFilter(type)}
                      style={{
                        padding: '5px 12px',
                        backgroundColor: entityFilter === type ? cfg.color : colors.gray[200],
                        color: entityFilter === type ? 'white' : colors.dark,
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: entityFilter === type ? 'bold' : 'normal',
                      }}
                    >
                      {cfg.icon} {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Liste des entités */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '10px',
              }}>
                {(entityFilter === 'all'
                  ? stats.topEntities
                  : stats.entitiesByType[entityFilter] || []
                )
                  .slice(0, 20)
                  .map((entity, idx) => {
                    const cfg = getEntityTypeConfig(entity.type);
                    return (
                      <div
                        key={`${entity.type}-${entity.value}-${idx}`}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: cfg.bg,
                          border: `1px solid ${cfg.color}30`,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>
                          {cfg.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: colors.dark,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }} title={entity.value}>
                            {entity.value}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            fontSize: '11px',
                            color: cfg.color,
                            marginTop: '2px',
                          }}>
                            <span>{cfg.label}</span>
                            <span>•</span>
                            <span>
                              {entity.count} {t('dashboard.topEntities.occurrences', { count: entity.count })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Résumé */}
              <div style={{
                marginTop: theme.spacing.md,
                padding: '10px 14px',
                backgroundColor: colors.gray[50] || '#fafafa',
                borderRadius: '8px',
                fontSize: '12px',
                color: colors.gray[600],
                textAlign: 'center',
              }}>
                {t('dashboard.topEntities.summary', {
                   types: Object.keys(stats.entitiesByType).length,
                   unique: stats.topEntities.length,
                   total: stats.counts.entities,
                  })}
              </div>
            </Card>
          )}

          {/* Fichiers récents avec auteur */}
          {stats.recentFiles.length > 0 && (
            <Card
              title={isFiltered ? t('dashboard.recentFilesOfProject') : t('dashboard.recentFiles')}
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
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>
                      {getFileIcon(file.fileName)}
                    </span>

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
                        alignItems: 'center',
                       }}>
                        <span>💾 {formatFileSize(file.fileSize)}</span>
                        <span>📅 {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}</span>
                        <LanguageBadge language={file.language} />
                      </div>
                    </div>

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
                      title={`${t('dashboard.fileUploadedBy')} ${file.authorName || file.authorEmail}`}
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
            <Card title={t('dashboard.transcriptionStatus')} style={{ marginBottom: theme.spacing.lg }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}>
                 <div style={{ fontSize: '12px', color: colors.gray[600] }}>⏳ {t('dashboard.status.pending')}</div>
                 <div style={{ fontSize: '12px', color: colors.gray[600] }}>⚙️ {t('dashboard.status.processing')}</div>
                 <div style={{ fontSize: '12px', color: colors.gray[600] }}>✅ {t('dashboard.status.completed')}</div>
                 <div style={{ fontSize: '12px', color: colors.gray[600] }}>❌ {t('dashboard.status.failed')}</div>

              </div>
            </Card>
          )}

          {/* Activité récente */}
          {stats.recentActivity.length > 0 && (
            <Card title={t('dashboard.recentActivity')} style={{ marginBottom: theme.spacing.lg }}>
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
                      {formatRelativeTime(activity.createdAt, t)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Projets récents */}
          {!isFiltered && stats.recentProjects.length > 0 && (
            <Card title={t('dashboard.recentProjects')} style={{ marginBottom: theme.spacing.lg }}>
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
                              👑{t('dashboard.ownerBadge')}
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
                         {project.description || t('dashboard.noDescription')}
                        </p>
                        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge variant="info">{project.status}</Badge>
                          <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}>
                           {t('dashboard.modifiedOn', { date: new Date(project.updatedAt).toLocaleDateString() })}
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

      {/* Liste complète des projets */}
      {!isFiltered && (
        <Card title={t('dashboard.allMyProjects')} style={{ marginTop: theme.spacing.lg }}>
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
              <h3 style={{ color: colors.gray[600], marginBottom: '8px' }}>{t('dashboard.noProjects')}</h3>
              <p style={{ marginBottom: '16px' }}>{t('dashboard.noProjectsHint')}</p>
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
                            👑 {t('dashboard.ownerBadge')}
                          </span>
                        )}
                      </h4>
                      <p style={{
                        margin: `0 0 ${theme.spacing.xs} 0`,
                        color: colors.gray[600],
                        fontSize: '13px',
                      }}>
                        {project.description || t('dashboard.noDescription')}
                      </p>
                      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge variant="info">{project.status}</Badge>
                        <Badge variant="secondary">{project.visibility}</Badge>
                        <span style={{ fontSize: theme.typography.fontSize.xs, color: colors.gray[500] }}> 
                       {t('dashboard.createdOn', { date: new Date(project.createdAt).toLocaleDateString() })} </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                      >
                        {t('dashboard.open')}
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
