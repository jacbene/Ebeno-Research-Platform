
// frontend/src/pages/ReferencesPage.tsx
// URL: /projects/:projectId/references
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Search,
  Add,
  ImportExport,
  FilterList,
  Sort,
  Article,
  Book,
  Download
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import ReferenceManager from '@/components/ReferenceManager';

export const ReferencesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Charger les références
  useEffect(() => {
    if (projectId) {
      loadReferences();
    }
  }, [projectId]);

  const loadReferences = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/references?projectId=${projectId}`);
      setReferences(response.data.data.references || []);
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des références',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Implémenter la recherche en temps réel
  };

  const handleExport = async () => {
    try {
      // Exporter les références
      const response = await api.post('/references/export', {
        referenceIds: references.map(r => r.id),
        format: 'bibtex'
      });
      
      // Télécharger le fichier
      const blob = new Blob([response.data.data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'references.bib';
      a.click();
      
    } catch (error) {
      console.error('Erreur:', error);
    }
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
              Bibliographie
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Gérer les références bibliographiques du projet
            </Typography>
          </Grid>
          
          <Grid>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                placeholder="Rechercher..."
                size="small"
                value={searchQuery}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  )
                }}
                sx={{ width: 300 }}
              />
              
              <Tooltip title="Filtrer">
                <IconButton>
                  <FilterList />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Trier">
                <IconButton>
                  <Sort />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddDialog(true)}
              >
                Ajouter
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ImportExport />}
                onClick={() => setShowImportDialog(true)}
              >
                Importer
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Exporter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Contenu principal */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      ) : (
        <ReferenceManager projectId={projectId} />
      )}

      {/* Dialogs */}
      <AddReferenceDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        projectId={projectId}
        onSuccess={() => {
          setShowAddDialog(false);
          loadReferences();
        }}
      />
      
      <ImportReferencesDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        projectId={projectId}
        onSuccess={() => {
          setShowImportDialog(false);
          loadReferences();
        }}
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

// Composant pour ajouter une référence
const AddReferenceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}> = ({ open, onClose, projectId, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    authors: [''],
    year: new Date().getFullYear(),
    type: 'ARTICLE' as string,
    journal: '',
    abstract: ''
  });
  
  const handleSubmit = async () => {
    try {
      await api.post('/references', {
        ...formData,
        projectId
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Ajouter une référence</DialogTitle>
      <DialogContent>
        {/* Formulaire d'ajout */}
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
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
              <Typography variant="subtitle2">Auteurs *</Typography>
              {formData.authors.map((author, index) => (
                <Box key={index} display="flex" gap={1} mb={1}>
                  <TextField
                    label={`Auteur ${index + 1}`}
                    fullWidth
                    value={author}
                    onChange={(e) => {
                      const newAuthors = [...formData.authors];
                      newAuthors[index] = e.target.value;
                      setFormData(prev => ({ ...prev, authors: newAuthors }));
                    }}
                  />
                  {formData.authors.length > 1 && (
                    <Button
                      onClick={() => {
                        const newAuthors = formData.authors.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, authors: newAuthors }));
                      }}
                    >
                      Supprimer
                    </Button>
                  )}
                </Box>
              ))}
              <Button
                onClick={() => setFormData(prev => ({ ...prev, authors: [...prev.authors, ''] }))}
                size="small"
              >
                + Ajouter un auteur
              </Button>
            </Grid>
            
            <Grid xs={6}>
              <TextField
                label="Année *"
                type="number"
                fullWidth
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              />
            </Grid>
            
            <Grid xs={6}>
              <TextField
                select
                label="Type *"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                SelectProps={{
                  native: true
                }}
              >
                <option value="ARTICLE">Article</option>
                <option value="BOOK">Livre</option>
                <option value="CHAPTER">Chapitre</option>
                <option value="THESIS">Thèse</option>
                <option value="CONFERENCE">Communication</option>
                <option value="REPORT">Rapport</option>
                <option value="WEBPAGE">Page web</option>
                <option value="OTHER">Autre</option>
              </TextField>
            </Grid>
            
            <Grid xs={12}>
              <TextField
                label="Journal/Éditeur"
                fullWidth
                value={formData.journal}
                onChange={(e) => setFormData(prev => ({ ...prev, journal: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={12}>
              <TextField
                label="Résumé"
                fullWidth
                multiline
                rows={4}
                value={formData.abstract}
                onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Ajouter
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Composant pour importer des références
const ImportReferencesDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}> = ({ open, onClose, projectId, onSuccess }) => {
  const [format, setFormat] = useState('bibtex');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const content = await file.text();
      await api.post(`/references/import/${projectId}`, {
        format,
        content
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importer des références</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Format
          </Typography>
          <Box display="flex" gap={2} mb={3}>
            <Button
              variant={format === 'bibtex' ? 'contained' : 'outlined'}
              onClick={() => setFormat('bibtex')}
              fullWidth
            >
              BibTeX (.bib)
            </Button>
            <Button
              variant={format === 'ris' ? 'contained' : 'outlined'}
              onClick={() => setFormat('ris')}
              fullWidth
            >
              RIS (.ris)
            </Button>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom>
            Fichier
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ py: 2 }}
          >
            {file ? file.name : 'Sélectionner un fichier'}
            <input
              type="file"
              hidden
              accept={format === 'bibtex' ? '.bib' : '.ris'}
              onChange={handleFileChange}
            />
          </Button>
          
          {file && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Prêt à importer {format === 'bibtex' ? 'BibTeX' : 'RIS'} : {file.name}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!file || uploading}
        >
          {uploading ? 'Importation...' : 'Importer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferencesPage;