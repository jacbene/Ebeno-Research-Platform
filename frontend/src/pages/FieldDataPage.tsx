// frontend/src/pages/FieldDataPage.tsx
// URL: /projects/:projectId/field-data
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocationOn,
  PhotoCamera,
  Mic,
  Description,
  Map,
  List,
  DateRange,
  FilterList
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';

// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

export const FieldDataPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fieldNotes, setFieldNotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    tags: []
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Charger les données
  useEffect(() => {
    if (projectId) {
      loadFieldNotes();
    }
  }, [projectId]);

  const loadFieldNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await api.get(`/field-data/project/${projectId}?${params}`);
      setFieldNotes(response.data.data.fieldNotes || []);
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFieldNote = async (data: any) => {
    try {
      await api.post('/field-data', {
        ...data,
        projectId
      });
      
      setSnackbar({
        open: true,
        message: 'Note créée avec succès',
        severity: 'success'
      });
      
      setShowCreateDialog(false);
      loadFieldNotes();
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la création',
        severity: 'error'
      });
    }
  };

  const handleDeleteFieldNote = async (id: string) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    
    try {
      await api.delete(`/field-data/${id}`);
      setSnackbar({
        open: true,
        message: 'Note supprimée',
        severity: 'success'
      });
      loadFieldNotes();
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la suppression',
        severity: 'error'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OBSERVATION': return <Description />;
      case 'INTERVIEW': return <Mic />;
      case 'PHOTO': return <PhotoCamera />;
      default: return <Description />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      OBSERVATION: '#3f51b5',
      INTERVIEW: '#f50057',
      REFLECTION: '#4caf50',
      PHOTO: '#ff9800',
      AUDIO: '#9c27b0',
      VIDEO: '#00bcd4',
      DOCUMENT: '#795548'
    };
    return colors[type] || '#757575';
  };

  if (!projectId) {
    return (
      <Container>
        <Alert severity="error">
          Projet non spécifié
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* En-tête */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h4" component="h1" gutterBottom>
              Données de Terrain
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Gérez vos observations, entretiens et notes de terrain
            </Typography>
          </Grid>
          
          <Grid>
            <Box display="flex" gap={2}>
              <Button
                variant={showMap ? 'outlined' : 'contained'}
                startIcon={<List />}
                onClick={() => setShowMap(false)}
              >
                Liste
              </Button>
              
              <Button
                variant={showMap ? 'contained' : 'outlined'}
                startIcon={<Map />}
                onClick={() => setShowMap(true)}
              >
                Carte
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowCreateDialog(true)}
              >
                Nouvelle note
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        {/* Filtres */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="">Tous les types</MenuItem>
                  <MenuItem value="OBSERVATION">Observation</MenuItem>
                  <MenuItem value="INTERVIEW">Entretien</MenuItem>
                  <MenuItem value="REFLECTION">Réflexion</MenuItem>
                  <MenuItem value="PHOTO">Photo</MenuItem>
                  <MenuItem value="AUDIO">Audio</MenuItem>
                  <MenuItem value="VIDEO">Vidéo</MenuItem>
                  <MenuItem value="DOCUMENT">Document</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid xs={12} md={3}>
              <TextField
                label="Date de début"
                type="date"
                size="small"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid xs={12} md={3}>
              <TextField
                label="Date de fin"
                type="date"
                size="small"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                fullWidth
                onClick={loadFieldNotes}
              >
                Filtrer
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Contenu */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      ) : showMap ? (
        // Vue carte
        <FieldDataMap fieldNotes={fieldNotes} />
      ) : (
        // Vue liste
        <Grid container spacing={3}>
          {fieldNotes.length === 0 ? (
            <Grid xs={12}>
              <Paper sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Aucune note de terrain
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Créez votre première note pour documenter vos observations
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  Créer une note
                </Button>
              </Paper>
            </Grid>
          ) : (
            fieldNotes.map((note) => (
              <Grid xs={12} md={6} lg={4} key={note.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          bgcolor: getTypeColor(note.type),
                          color: 'white',
                          borderRadius: '50%',
                          p: 1,
                          mr: 2
                        }}
                      >
                        {getTypeIcon(note.type)}
                      </Box>
                      
                      <Box flexGrow={1}>
                        <Typography variant="h6">
                          {note.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                      {note.content.length > 150 
                        ? `${note.content.substring(0, 150)}...` 
                        : note.content}
                    </Typography>
                    
                    <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                      <Chip
                        label={note.type}
                        size="small"
                        sx={{ bgcolor: getTypeColor(note.type), color: 'white' }}
                      />
                      
                      {note.location && (
                        <Chip
                          icon={<LocationOn />}
                          label="Localisé"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      
                      {note.media && note.media.length > 0 && (
                        <Chip
                          label={`${note.media.length} média(s)`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    {note.tags && note.tags.length > 0 && (
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {note.tags.slice(0, 3).map((tag: any) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{ bgcolor: tag.color || '#e0e0e0' }}
                          />
                        ))}
                        {note.tags.length > 3 && (
                          <Chip
                            label={`+${note.tags.length - 3}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(`/field-notes/${note.id}`)}
                    >
                      Voir
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => navigate(`/field-notes/${note.id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteFieldNote(note.id)}
                      sx={{ ml: 'auto' }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Dialogs */}
      <CreateFieldNoteDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        projectId={projectId}
        onCreate={handleCreateFieldNote}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Composant carte
const FieldDataMap: React.FC<{ fieldNotes: any[] }> = ({ fieldNotes }) => {
  const notesWithLocation = fieldNotes.filter(
    note => note.location && note.location.lat && note.location.lng
  );
  
  if (notesWithLocation.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: 'center', height: 500 }}>
        <Typography variant="h6" gutterBottom>
          Aucune donnée géographique
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ajoutez des localisations à vos notes pour les voir sur la carte
        </Typography>
      </Paper>
    );
  }
  
  // Calculer le centre de la carte
  const center = notesWithLocation.reduce(
    (acc, note) => ({
      lat: acc.lat + note.location.lat,
      lng: acc.lng + note.location.lng
    }),
    { lat: 0, lng: 0 }
  );
  
  center.lat /= notesWithLocation.length;
  center.lng /= notesWithLocation.length;
  
  return (
    <Paper sx={{ height: 600, overflow: 'hidden' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {notesWithLocation.map((note) => (
          <Marker
            key={note.id}
            position={[note.location.lat, note.location.lng]}
          >
            <Popup>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {note.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {note.type} • {new Date(note.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  {note.content.length > 100 
                    ? `${note.content.substring(0, 100)}...` 
                    : note.content}
                </Typography>
                <Button
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() => window.location.href = `/field-notes/${note.id}`}
                >
                  Voir les détails
                </Button>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Paper>
  );
};

// Composant pour créer une note
const CreateFieldNoteDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreate: (data: any) => void;
}> = ({ open, onClose, projectId, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'OBSERVATION',
    location: null as { lat: number; lng: number } | null
  });
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Obtenir la position actuelle
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          if (!formData.location) {
            setFormData(prev => ({
              ...prev,
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
            }));
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
        }
      );
    }
  }, []);
  
  const handleSubmit = () => {
    onCreate({
      ...formData,
      projectId
    });
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nouvelle note de terrain</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid xs={12}>
              <TextField
                label="Titre *"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  label="Type *"
                >
                  <MenuItem value="OBSERVATION">Observation</MenuItem>
                  <MenuItem value="INTERVIEW">Entretien</MenuItem>
                  <MenuItem value="REFLECTION">Réflexion</MenuItem>
                  <MenuItem value="PHOTO">Photo</MenuItem>
                  <MenuItem value="AUDIO">Enregistrement audio</MenuItem>
                  <MenuItem value="VIDEO">Vidéo</MenuItem>
                  <MenuItem value="DOCUMENT">Document</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid xs={12}>
              <TextField
                label="Contenu *"
                fullWidth
                multiline
                rows={8}
                required
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Décrivez vos observations..."
              />
            </Grid>
            
            <Grid xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Localisation
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={6}>
                  <TextField
                    label="Latitude"
                    type="number"
                    fullWidth
                    value={formData.location?.lat || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      location: {
                        ...prev.location!,
                        lat: parseFloat(e.target.value)
                      }
                    }))}
                  />
                </Grid>
                <Grid xs={6}>
                  <TextField
                    label="Longitude"
                    type="number"
                    fullWidth
                    value={formData.location?.lng || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      location: {
                        ...prev.location!,
                        lng: parseFloat(e.target.value)
                      }
                    }))}
                  />
                </Grid>
              </Grid>
              
              {currentLocation && (
                <Button
                  startIcon={<LocationOn />}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      location: currentLocation
                    }));
                  }}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Utiliser ma position actuelle
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldDataPage;
