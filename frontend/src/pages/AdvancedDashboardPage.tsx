// frontend/src/pages/AdvancedDashboardPage.tsx
// Tableau de bord analytique avancé
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Refresh,
  Download,
  Share,
  MoreVert,
  TrendingUp,
  TrendingDown,
  Timeline,
  People,
  Assignment,
  LibraryBooks,
  Chat,
  Assessment,
  Science,
  GroupWork
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export const AdvancedDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user: authUser } = useAuth(); // Renamed 'user' to 'authUser' to avoid TS6133 if not explicitly used, but still declared.
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const [viewMode, setViewMode] = useState('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (projectId) {
      loadAnalytics();
    }
  }, [projectId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/analytics/project/${projectId}?range=${timeRange}`);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await api.post('/analytics/report', {
        projectId,
        format,
        startDate: getStartDate(),
        endDate: new Date()
      });

      if (format === 'pdf') {
        window.open(response.data.data.downloadUrl, '_blank');
      } else {
        const blob = new Blob([response.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-${projectId}.${format}`;
        a.click();
      }
    } catch (error) {
      console.error('Erreur d\'export:', error);
    }
  };

  const getStartDate = () => {
    const date = new Date();
    switch (timeRange) {
      case '7days': date.setDate(date.getDate() - 7); break;
      case '30days': date.setDate(date.getDate() - 30); break;
      case '90days': date.setDate(date.getDate() - 90); break;
      default: date.setDate(date.getDate() - 30);
    }
    return date;
  };

  if (loading || !analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* En-tête */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Tableau de Bord Analytique
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Analyse approfondie de votre projet de recherche
            </Typography>
          </Box>

          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Période</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Période"
              >
                <MenuItem value="7days">7 jours</MenuItem>
                <MenuItem value="30days">30 jours</MenuItem>
                <MenuItem value="90days">90 jours</MenuItem>
                <MenuItem value="year">Année</MenuItem>
                <MenuItem value="all">Tout</MenuItem>
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="overview">
                <Timeline />
              </ToggleButton>
              <ToggleButton value="collaboration">
                <People />
              </ToggleButton>
              <ToggleButton value="content">
                <LibraryBooks />
              </ToggleButton>
              <ToggleButton value="ai">
                <Science />
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton onClick={loadAnalytics}>
              <Refresh />
            </IconButton>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => handleExport('csv')}>
                <Download sx={{ mr: 1 }} />
                Exporter CSV
              </MenuItem>
              <MenuItem onClick={() => handleExport('pdf')}>
                <Download sx={{ mr: 1 }} />
                Exporter PDF
              </MenuItem>
              <MenuItem>
                <Share sx={{ mr: 1 }} />
                Partager
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Statistiques rapides */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Activité totale
                    </Typography>
                    <Typography variant="h4">
                      {analytics.overview.totalItems}
                    </Typography>
                  </Box>
                  <Assignment color="primary" />
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  {analytics.trends.trend === 'increasing' ? (
                    <TrendingUp color="success" sx={{ mr: 1 }} />
                  ) : analytics.trends.trend === 'decreasing' ? (
                    <TrendingDown color="error" sx={{ mr: 1 }} />
                  ) : null}
                  <Typography variant="caption" color="textSecondary">
                    {analytics.trends.trend === 'increasing' ? 'En hausse' :
                     analytics.trends.trend === 'decreasing' ? 'En baisse' : 'Stable'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Progression
                    </Typography>
                    <Typography variant="h4">
                      {analytics.progress.percentage}%
                    </Typography>
                  </Box>
                  <Assessment color="secondary" />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {analytics.progress.completedMilestones}/{analytics.progress.totalMilestones} jalons
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Collaborateurs
                    </Typography>
                    <Typography variant="h4">
                      {analytics.engagement.length}
                    </Typography>
                  </Box>
                  <GroupWork color="info" />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {analytics.engagement.filter((e: any) => e.engagementScore > 50).length} actifs
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Interactions IA
                    </Typography>
                    <Typography variant="h4">
                      {analytics.aiUsage?.totalRequests || 0}
                    </Typography>
                  </Box>
                  <Chat color="warning" />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {analytics.aiUsage?.successRate?.toFixed(1) || 0}% succès
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Contenu principal selon le mode */}
      {viewMode === 'overview' ? (
        <Grid container spacing={3}>
          {/* Graphique d'activité */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Activité quotidienne" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trends.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="Activités" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Répartition par type */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Répartition par type" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Documents', value: analytics.overview.documents },
                        { name: 'Transcriptions', value: analytics.overview.transcriptions },
                        { name: 'Mémos', value: analytics.overview.memos },
                        { name: 'Codes', value: analytics.overview.codes },
                        { name: 'Références', value: analytics.overview.references }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'].map((color, idx) => (
                        <Cell key={`cell-${idx}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Engagement des collaborateurs */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Engagement des collaborateurs" />
              <CardContent>
                <Grid container spacing={2}>
                  {analytics.engagement.slice(0, 6).map((collab: any, index: number) => (
                    <Grid item xs={12} md={4} key={collab.user.id}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: getColorByScore(collab.engagementScore) }}>
                          {collab.user.name.charAt(0)}
                        </Avatar>
                        <Box flexGrow={1}>
                          <Typography variant="subtitle2">
                            {collab.user.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {collab.activities} activités • {collab.contributions.total} contributions
                          </Typography>
                          <Box display="flex" alignItems="center" mt={0.5}>
                            <Box
                              sx={{
                                width: '100%',
                                height: 4,
                                bgcolor: 'grey.200',
                                borderRadius: 2,
                                overflow: 'hidden'
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${collab.engagementScore}%`,
                                  height: '100%',
                                  bgcolor: getColorByScore(collab.engagementScore)
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ ml: 1 }}>
                              {Math.round(collab.engagementScore)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : viewMode === 'collaboration' ? (
        <Grid container spacing={3}>
          {/* Carte réseau des collaborations */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Réseau de collaborations" />
              <CardContent>
                <Box height={400} border={1} borderColor="grey.200" borderRadius={1}>
                  {/* Ici intégrer une visualisation de réseau avec D3.js ou vis.js */}
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 20 }}>
                    Visualisation réseau des collaborateurs
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Statistiques de collaboration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Sessions de collaboration" />
              <CardContent>
                <List>
                  {analytics.collaborations?.map((session: any) => (
                    <ListItem key={session.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <People />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={session.title}
                        secondary={
                          <>
                            <Typography variant="caption" component="span">
                              {session.participants.length} participants •
                              {new Date(session.lastActivity).toLocaleDateString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : viewMode === 'ai' ? (
        <Grid container spacing={3}>
          {/* Utilisation de l'IA */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Analyse de l'utilisation IA" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(analytics.aiUsage?.usageByType || {}).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box p={3}>
                      <Typography variant="h6" gutterBottom>
                        Statistiques IA
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Requêtes totales"
                            secondary={analytics.aiUsage?.totalRequests || 0}
                          />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText
                            primary="Taux de réussite"
                            secondary={`${analytics.aiUsage?.successRate?.toFixed(1) || 0}%`}
                          />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText
                            primary="Temps de réponse moyen"
                            secondary={`${analytics.aiUsage?.averageResponseTime?.toFixed(2) || 0}ms`}
                          />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemText
                            primary="Coût estimé"
                            secondary={`$${analytics.aiUsage?.costEstimate?.toFixed(4) || 0}`}
                          />
                        </ListItem>
                      </List>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}
    </Container>
  );
};

// Fonction utilitaire pour les couleurs
const getColorByScore = (score: number): string => {
  if (score >= 80) return '#4caf50'; // Vert
  if (score >= 60) return '#ff9800'; // Orange
  if (score >= 40) return '#f44336'; // Rouge
  return '#9e9e9e'; // Gris
};

export default AdvancedDashboardPage;