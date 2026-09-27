// frontend/src/pages/AnalyticsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';

// ✅ Enregistrement Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  period: { days: number; since: string; until: string };
  scope: { projectId: string | null; projectTitle: string | null };
  activity: {
    documents: Array<{ date: string; count: number }>;
    totalFiles: number;
    totalTranscriptions: number;
    totalMemos: number;
    totalComments: number;
  };
  documentsByType: {
    audio: number;
    text: number;
    pdf: number;
    docx: number;
    image: number;
    other: number;
  };
  topProjects: Array<{
    projectId: string;
    title: string;
    activityCount: number;
    files: number;
    members: number;
    sizeBytes: number;
  }>;
  transcriptionStats: {
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    withLanguage: Record<string, number>;
  };
  iaUsage: {
    summaries: number;
    translations: number;
    transcriptionCompleted: number;
  };
  storage: {
    totalBytes: number;
    byType: Record<string, number>;
  };
}

interface ProjectOption {
  projectId: string;
  title: string;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const AnalyticsPage: React.FC = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<number>(30);

  // ============================================================
  // Charger la liste des projets
  // ============================================================
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/analytics/projects');
        if (res.data.success) {
          setProjects(res.data.projects || []);
        }
      } catch (err) {
        console.error('❌ [analytics] projects fetch failed:', err);
      }
    };
    fetchProjects();
  }, []);

  // ============================================================
  // Charger les analytics
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('days', String(periodDays));
        if (selectedProjectId) params.append('projectId', selectedProjectId);

        const res = await api.get(`/analytics/dashboard?${params.toString()}`);
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError('Erreur de chargement');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProjectId, periodDays]);

  // ============================================================
  // Configuration Chart.js commune
  // ============================================================
  const chartColors = useMemo(
    () => ({
      primary: colors.primary,
      primaryAlpha: colors.primary + '30',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      purple: '#9B5DE5',
      teal: '#4ECDC4',
      palette: [
        colors.primary,
        '#28a745',
        '#ffc107',
        '#17a2b8',
        '#9B5DE5',
        '#4ECDC4',
        '#E76F51',
        '#F4A261',
      ],
    }),
    [colors.primary]
  );

  // ============================================================
  // Graphique 1 : Activité sur N jours
  // ============================================================
  const activityChartData = useMemo(() => {
    if (!data) return null;

    const labels = data.activity.documents.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: 'short',
      });
    });

    const values = data.activity.documents.map((d) => d.count);

    return {
      labels,
      datasets: [
        {
          label: t('analytics.activity.label'),
          data: values,
          borderColor: chartColors.primary,
          backgroundColor: chartColors.primaryAlpha,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: chartColors.primary,
          borderWidth: 2,
        },
      ],
    };
  }, [data, i18n.language, t, chartColors]);

  // ============================================================
  // Graphique 2 : Répartition par type (donut)
  // ============================================================
  const typesChartData = useMemo(() => {
    if (!data) return null;

    const dt = data.documentsByType;
    const labels = [
      t('analytics.types.audio'),
      t('analytics.types.text'),
      t('analytics.types.pdf'),
      t('analytics.types.docx'),
      t('analytics.types.image'),
      t('analytics.types.other'),
    ];
    const values = [dt.audio, dt.text, dt.pdf, dt.docx, dt.image, dt.other];

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#0080a0',
            '#4ECDC4',
            '#dc3545',
            '#0052cc',
            '#9B5DE5',
            '#adb5bd',
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [data, t]);

  // ============================================================
  // Graphique 3 : Top projets (barres horizontales)
  // ============================================================
  const topProjectsChartData = useMemo(() => {
    if (!data) return null;

    const top = data.topProjects.slice(0, 5);
    const labels = top.map((p) =>
      p.title.length > 25 ? p.title.substring(0, 25) + '…' : p.title
    );
    const values = top.map((p) => p.activityCount);

    return {
      labels,
      datasets: [
        {
          label: t('analytics.topProjects.activity'),
          data: values,
          backgroundColor: chartColors.primary + '90',
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [data, t, chartColors]);

  // ============================================================
  // Graphique 4 : Statut transcriptions (donut)
  // ============================================================
  const transcriptionChartData = useMemo(() => {
    if (!data) return null;

    const ts = data.transcriptionStats;
    const labels = [
      t('analytics.transcription.completed'),
      t('analytics.transcription.failed'),
      t('analytics.transcription.pending'),
      t('analytics.transcription.processing'),
    ];
    const values = [ts.completed, ts.failed, ts.pending, ts.processing];

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#28a745',
            '#dc3545',
            '#ffc107',
            '#17a2b8',
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [data, t]);

  // ============================================================
  // Graphique 5 : IA usage (barres verticales)
  // ============================================================
  const iaChartData = useMemo(() => {
    if (!data) return null;

    const labels = [
      t('analytics.ia.summaries'),
      t('analytics.ia.translations'),
      t('analytics.ia.transcriptions'),
    ];
    const values = [
      data.iaUsage.summaries,
      data.iaUsage.translations,
      data.iaUsage.transcriptionCompleted,
    ];

    return {
      labels,
      datasets: [
        {
          label: t('analytics.ia.label'),
          data: values,
          backgroundColor: ['#9B5DE5', '#4ECDC4', '#0080a0'],
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    };
  }, [data, t]);

  // ============================================================
  // Options Chart.js
  // ============================================================
  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: colors.dark,
            font: { size: isMobile ? 10 : 12 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: colors.dark,
          titleColor: colors.white,
          bodyColor: colors.white,
          padding: 10,
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          ticks: { color: colors.gray[600], font: { size: isMobile ? 9 : 11 } },
          grid: { color: colors.gray[200] + '60' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: colors.gray[600], font: { size: isMobile ? 9 : 11 } },
          grid: { color: colors.gray[200] + '60' },
        },
      },
    }),
    [colors, isMobile]
  );

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: colors.dark,
            font: { size: isMobile ? 10 : 12 },
            boxWidth: 12,
            padding: 10,
          },
        },
        tooltip: {
          backgroundColor: colors.dark,
          titleColor: colors.white,
          bodyColor: colors.white,
          padding: 10,
          cornerRadius: 6,
        },
      },
    }),
    [colors, isMobile]
  );

  // ============================================================
  // Rendu
  // ============================================================
  const renderStatCard = (label: string, value: number | string, icon: string) => (
    <div
      style={{
        padding: '14px 16px',
        backgroundColor: colors.white,
        border: `1px solid ${colors.gray[200]}`,
        borderRadius: theme.borderRadius.md,
        flex: 1,
        minWidth: isMobile ? '45%' : '150px',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', color: colors.dark }}>
        {value}
      </div>
      <div style={{ fontSize: isMobile ? '11px' : '12px', color: colors.gray[500], marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: theme.spacing.lg }}>
        <h1 style={{ margin: 0, color: colors.dark, fontSize: isMobile ? '20px' : '24px' }}>
          📊 {t('analytics.title')}
        </h1>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sélecteur de projet */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.gray[300]}`,
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: colors.white,
              color: colors.dark,
              minWidth: '180px',
            }}
          >
            <option value="">{t('analytics.allProjects')}</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Sélecteur de période */}
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.gray[300]}`,
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: colors.white,
              color: colors.dark,
            }}
          >
            <option value={7}>{t('analytics.period.7d')}</option>
            <option value={30}>{t('analytics.period.30d')}</option>
            <option value={90}>{t('analytics.period.90d')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <p style={{ textAlign: 'center', color: colors.gray[500] }}>{t('common.loading')}</p>
        </Card>
      ) : error ? (
        <Card>
          <p style={{ textAlign: 'center', color: colors.danger }}>❌ {error}</p>
        </Card>
      ) : !data ? (
        <Card>
          <p style={{ textAlign: 'center', color: colors.gray[500] }}>
            {t('analytics.noData')}
          </p>
        </Card>
      ) : (
        <>
          {/* Cartes de stats */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: theme.spacing.lg }}>
            {renderStatCard(t('analytics.stats.files'), data.activity.totalFiles, '📎')}
            {renderStatCard(t('analytics.stats.transcriptions'), data.activity.totalTranscriptions, '🎙️')}
            {renderStatCard(t('analytics.stats.memos'), data.activity.totalMemos, '📝')}
            {renderStatCard(t('analytics.stats.comments'), data.activity.totalComments, '💬')}
            {renderStatCard(t('analytics.stats.storage'), formatBytes(data.storage.totalBytes), '💾')}
          </div>

          {/* Graphique 1 — Activité */}
          <Card title={t('analytics.activity.title', { days: data.period.days })} style={{ marginBottom: theme.spacing.lg }}>
            <div style={{ height: isMobile ? '220px' : '300px' }}>
              {activityChartData && <Line data={activityChartData} options={commonOptions as any} />}
            </div>
          </Card>

          {/* Rangée 2 graphiques */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Card title={t('analytics.types.title')}>
              <div style={{ height: isMobile ? '240px' : '280px' }}>
                {typesChartData && <Doughnut data={typesChartData} options={donutOptions as any} />}
              </div>
            </Card>

            <Card title={t('analytics.transcription.title')}>
              <div style={{ height: isMobile ? '240px' : '280px' }}>
                {transcriptionChartData && <Doughnut data={transcriptionChartData} options={donutOptions as any} />}
              </div>
            </Card>
          </div>

          {/* Rangée 3 graphiques */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: theme.spacing.lg,
            }}
          >
            <Card title={t('analytics.topProjects.title')}>
              <div style={{ height: isMobile ? '220px' : '280px' }}>
                {topProjectsChartData && topProjectsChartData.labels.length > 0 ? (
                  <Bar
                    data={topProjectsChartData}
                    options={{
                      ...commonOptions,
                      indexAxis: 'y' as const,
                      plugins: {
                        ...commonOptions.plugins,
                        legend: { display: false },
                      },
                      scales: {
                        x: { beginAtZero: true, ticks: { color: colors.gray[600] } },
                        y: { ticks: { color: colors.dark, font: { size: 11 } } },
                      },
                    } as any}
                  />
                ) : (
                  <p style={{ textAlign: 'center', color: colors.gray[500], paddingTop: '40px' }}>
                    {t('analytics.topProjects.empty')}
                  </p>
                )}
              </div>
            </Card>

            <Card title={t('analytics.ia.title')}>
              <div style={{ height: isMobile ? '220px' : '280px' }}>
                {iaChartData && (
                  <Bar
                    data={iaChartData}
                    options={{
                      ...commonOptions,
                      plugins: {
                        ...commonOptions.plugins,
                        legend: { display: false },
                      },
                    } as any}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Top projets — détail tabulaire */}
          {data.topProjects.length > 0 && (
            <Card title={t('analytics.topProjects.detailed')} style={{ marginTop: theme.spacing.lg }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.gray[200]}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: colors.gray[600], fontWeight: 600 }}>
                        {t('analytics.topProjects.project')}
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: colors.gray[600], fontWeight: 600 }}>
                        {t('analytics.topProjects.activity')}
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: colors.gray[600], fontWeight: 600 }}>
                        {t('analytics.topProjects.files')}
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: colors.gray[600], fontWeight: 600 }}>
                        {t('analytics.topProjects.members')}
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: colors.gray[600], fontWeight: 600 }}>
                        {t('analytics.topProjects.storage')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProjects.slice(0, 10).map((p) => (
                      <tr key={p.projectId} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                        <td style={{ padding: '10px 12px', color: colors.dark }}>
                          📁 {p.title}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: colors.dark, fontWeight: 'bold' }}>
                          {p.activityCount}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: colors.gray[600] }}>
                          {p.files}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: colors.gray[600] }}>
                          {p.members}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: colors.gray[600] }}>
                          {formatBytes(p.sizeBytes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
