// frontend/src/components/WebhooksSettings.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';

interface Webhook {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Delivery {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
}

// ✅ Events prédéfinis avec labels (mapping i18n)
const EVENT_LABELS: Record<string, string> = {
  'project.created': 'webhooks.events.projectCreated',
  'project.updated': 'webhooks.events.projectUpdated',
  'project.deleted': 'webhooks.events.projectDeleted',
  'file.uploaded': 'webhooks.events.fileUploaded',
  'file.trashed': 'webhooks.events.fileTrashed',
  'file.edited': 'webhooks.events.fileEdited',
  'transcription.uploaded': 'webhooks.events.transcriptionUploaded',
  'transcription.completed': 'webhooks.events.transcriptionCompleted',
  'memo.created': 'webhooks.events.memoCreated',
  'comment.created': 'webhooks.events.commentCreated',
  'member.added': 'webhooks.events.memberAdded',
};

export const WebhooksSettings: React.FC = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    projectId: '',
    events: [] as string[],
  });

  // ============================================================
  // Chargement
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hooksRes, eventsRes, projectsRes] = await Promise.all([
          api.get('/webhooks'),
          api.get('/webhooks/events'),
          api.get('/projects'),
        ]);

        if (hooksRes.data.success) setWebhooks(hooksRes.data.webhooks || []);
        if (eventsRes.data.success) setAvailableEvents(eventsRes.data.events || []);
        if (projectsRes.data.success) setProjects(projectsRes.data.data || []);
      } catch (err: any) {
        console.error('❌ [webhooks] load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ============================================================
  // Créer
  // ============================================================
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.addToast({ type: 'error', title: t('webhooks.errors.required') });
      return;
    }
    if (formData.events.length === 0) {
      toast.addToast({ type: 'error', title: t('webhooks.errors.noEvents') });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/webhooks', {
        name: formData.name.trim(),
        url: formData.url.trim(),
        projectId: formData.projectId || null,
        events: formData.events,
      });

      if (res.data.success) {
        setWebhooks([res.data.webhook, ...webhooks]);
        setFormData({ name: '', url: '', projectId: '', events: [] });
        setShowForm(false);
        toast.addToast({ type: 'success', title: t('webhooks.created') });
      }
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('webhooks.errors.createFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Toggle active
  // ============================================================
  const handleToggleActive = async (hook: Webhook) => {
    try {
      const res = await api.put(`/webhooks/${hook.id}`, {
        active: !hook.active,
      });
      if (res.data.success) {
        setWebhooks(webhooks.map((w) => (w.id === hook.id ? res.data.webhook : w)));
      }
    } catch (err) {
      toast.addToast({ type: 'error', title: t('common.error') });
    }
  };

  // ============================================================
  // Tester
  // ============================================================
  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.post(`/webhooks/${id}/test`);
      const result = res.data.result;

      if (result.success) {
        toast.addToast({
          type: 'success',
          title: t('webhooks.test.success', { code: result.statusCode }),
          message: `${result.durationMs}ms`,
        });
      } else {
        toast.addToast({
          type: 'error',
          title: t('webhooks.test.failed'),
          message: result.error || `HTTP ${result.statusCode}`,
        });
      }

      // Recharger la liste
      const hooksRes = await api.get('/webhooks');
      if (hooksRes.data.success) setWebhooks(hooksRes.data.webhooks || []);
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('webhooks.test.error'),
      });
    } finally {
      setTestingId(null);
    }
  };

  // ============================================================
  // Supprimer
  // ============================================================
  const handleDelete = async (id: string) => {
    if (!confirm(t('webhooks.deleteConfirm'))) return;
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks(webhooks.filter((w) => w.id !== id));
      toast.addToast({ type: 'success', title: t('webhooks.deleted') });
    } catch (err) {
      toast.addToast({ type: 'error', title: t('common.error') });
    }
  };

  // ============================================================
  // Voir les livraisons
  // ============================================================
  const toggleDeliveries = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (deliveries[id]) return;

    try {
      const res = await api.get(`/webhooks/${id}/deliveries`);
      if (res.data.success) {
        setDeliveries({ ...deliveries, [id]: res.data.deliveries || [] });
      }
    } catch (err) {
      console.error('❌ [webhooks] deliveries fetch failed:', err);
    }
  };

  // ============================================================
  // Copier le secret
  // ============================================================
  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.addToast({ type: 'success', title: t('webhooks.secretCopied') });
    } catch {
      toast.addToast({ type: 'error', title: t('common.error') });
    }
  };

  const toggleEvent = (eventName: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventName)
        ? prev.events.filter((e) => e !== eventName)
        : [...prev.events, eventName],
    }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card title={`🔗 ${t('webhooks.title')}`}>
      {/* Intro */}
      <p style={{ fontSize: '14px', color: colors.gray[600], marginBottom: '20px', lineHeight: 1.6 }}>
        {t('webhooks.intro')}
      </p>

      {/* Bouton Créer */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          style={{ marginBottom: theme.spacing.lg }}
        >
          ➕ {t('webhooks.newButton')}
        </Button>
      )}

      {/* Formulaire */}
      {showForm && (
        <div
          style={{
            padding: '16px',
            backgroundColor: colors.gray[50] || '#fafafa',
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${colors.gray[200]}`,
          }}
        >
          <h4 style={{ margin: '0 0 16px 0', color: colors.dark }}>
            {t('webhooks.newTitle')}
          </h4>

          <form onSubmit={handleCreate}>
            <Input
              label={t('webhooks.form.nameLabel')}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('webhooks.form.namePlaceholder')}
              required
            />

            <Input
              label={t('webhooks.form.urlLabel')}
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/webhook"
              required
            />

            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '14px',
                  color: colors.gray[700],
                }}
              >
                {t('webhooks.form.projectLabel')}
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: '14px',
                  backgroundColor: colors.white,
                  color: colors.dark,
                }}
              >
                <option value="">{t('webhooks.form.allProjects')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Events */}
            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: colors.gray[700],
                }}
              >
                {t('webhooks.form.eventsLabel')}
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '6px',
                }}
              >
                {availableEvents.map((evt) => {
                  const isSelected = formData.events.includes(evt);
                  return (
                    <label
                      key={evt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        border: `1px solid ${isSelected ? colors.primary : colors.gray[200]}`,
                        borderRadius: '6px',
                        backgroundColor: isSelected ? colors.primary + '10' : colors.white,
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: colors.dark,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvent(evt)}
                        style={{ cursor: 'pointer' }}
                      />
                      {t(EVENT_LABELS[evt] || evt)}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : t('webhooks.form.submit')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', url: '', projectId: '', events: [] });
                }}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des webhooks */}
      {loading ? (
        <p style={{ color: colors.gray[500], fontSize: '14px' }}>{t('common.loading')}</p>
      ) : webhooks.length === 0 ? (
        <div
          style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: colors.gray[500],
            border: `2px dashed ${colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔗</div>
          <p style={{ margin: 0, fontSize: '14px' }}>{t('webhooks.empty')}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{t('webhooks.emptyHint')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {webhooks.map((hook) => {
            const project = projects.find((p) => p.id === hook.projectId);
            const isExpanded = expandedId === hook.id;
            const hookDeliveries = deliveries[hook.id] || [];
            const isTesting = testingId === hook.id;

            return (
              <div
                key={hook.id}
                style={{
                  padding: '14px',
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: hook.active ? colors.white : colors.gray[100],
                  opacity: hook.active ? 1 : 0.7,
                }}
              >
                {/* En-tête */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '14px', color: colors.dark }}>{hook.name}</strong>
                      {hook.projectId ? (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            backgroundColor: colors.primary + '20',
                            color: colors.primary,
                            borderRadius: '8px',
                            fontWeight: 'bold',
                          }}
                        >
                          📁 {project?.title || 'Projet'}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            backgroundColor: colors.gray[200],
                            color: colors.gray[700],
                            borderRadius: '8px',
                            fontWeight: 'bold',
                          }}
                        >
                          🌐 {t('webhooks.allProjects')}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          backgroundColor: hook.active ? '#D1FAE5' : '#FEE2E2',
                          color: hook.active ? '#065F46' : '#991B1B',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        {hook.active ? '● ' + t('webhooks.active') : '○ ' + t('webhooks.inactive')}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: colors.gray[500],
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hook.url}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleTest(hook.id)}
                      disabled={isTesting}
                      title={t('webhooks.test.button')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: colors.primary + '15',
                        color: colors.primary,
                        border: `1px solid ${colors.primary}40`,
                        borderRadius: '6px',
                        cursor: isTesting ? 'wait' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {isTesting ? '⏳' : '🧪'} {t('webhooks.test.button')}
                    </button>

                    <button
                      onClick={() => handleToggleActive(hook)}
                      title={hook.active ? t('webhooks.disable') : t('webhooks.enable')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: colors.gray[100],
                        color: colors.dark,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {hook.active ? '⏸️' : '▶️'}
                    </button>

                    <button
                      onClick={() => toggleDeliveries(hook.id)}
                      title={t('webhooks.deliveries.title')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: colors.gray[100],
                        color: colors.dark,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      📋 {hook.successCount + hook.failureCount}
                    </button>

                    <button
                      onClick={() => handleDelete(hook.id)}
                      title={t('common.delete')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', fontSize: '11px', color: colors.gray[600] }}>
                  <span>
                    ✅ <strong>{hook.successCount}</strong> succès
                  </span>
                  <span>
                    ❌ <strong>{hook.failureCount}</strong> échecs
                  </span>
                  <span>
                    🕐 {t('webhooks.lastTriggered')}: {formatDate(hook.lastTriggeredAt)}
                  </span>
                </div>

                {/* Events */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {hook.events.map((evt) => (
                    <span
                      key={evt}
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        backgroundColor: colors.gray[100],
                        color: colors.gray[700],
                        borderRadius: '8px',
                      }}
                    >
                      {t(EVENT_LABELS[evt] || evt)}
                    </span>
                  ))}
                </div>

                {/* Secret */}
                <div style={{ marginTop: '8px', fontSize: '10px', color: colors.gray[500] }}>
                  🔐 Secret : <code style={{ fontFamily: 'monospace' }}>
                    {hook.secret.substring(0, 16)}…
                  </code>
                  <button
                    onClick={() => handleCopySecret(hook.secret)}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.gray[300]}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: colors.dark,
                    }}
                  >
                    {t('common.open') === 'Ouvrir' ? 'Copier' : 'Copy'}
                  </button>
                </div>

                {/* Livraisons */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: colors.gray[50] || '#fafafa',
                      borderRadius: '6px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.dark, marginBottom: '8px' }}>
                      {t('webhooks.deliveries.title')} ({hookDeliveries.length})
                    </div>
                    {hookDeliveries.length === 0 ? (
                      <p style={{ fontSize: '12px', color: colors.gray[500], margin: 0 }}>
                        {t('webhooks.deliveries.empty')}
                      </p>
                    ) : (
                      hookDeliveries.map((d) => (
                        <div
                          key={d.id}
                          style={{
                            padding: '6px 8px',
                            marginBottom: '4px',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ color: d.success ? '#059669' : '#DC2626', fontWeight: 'bold' }}>
                            {d.success ? '✅' : '❌'} {d.statusCode || 'ERR'}
                          </span>
                          <span style={{ color: colors.gray[600] }}>
                            {d.event} · {d.durationMs}ms
                          </span>
                          <span style={{ color: colors.gray[500], fontSize: '10px' }}>
                            {formatDate(d.createdAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Doc d'intégration */}
      <div
        style={{
          marginTop: theme.spacing.lg,
          padding: '14px',
          backgroundColor: colors.primary + '08',
          borderLeft: `3px solid ${colors.primary}`,
          borderRadius: theme.borderRadius.md,
          fontSize: '12px',
          color: colors.gray[700],
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: colors.dark }}>💡 {t('webhooks.doc.title')}</strong>
        <p style={{ margin: '6px 0 0 0' }}>{t('webhooks.doc.intro')}</p>
        <pre
          style={{
            margin: '8px 0 0 0',
            padding: '8px',
            backgroundColor: colors.gray[100],
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            overflowX: 'auto',
          }}
        >{`POST /votre-endpoint
Content-Type: application/json
X-Ebeno-Event: file.uploaded
X-Ebeno-Signature: sha256=<hmac>

{
  "event": "file.uploaded",
  "timestamp": "2026-09-28T06:20:56.472Z",
  "data": { ... }
}`}</pre>
      </div>
    </Card>
  );
};

export default WebhooksSettings;
