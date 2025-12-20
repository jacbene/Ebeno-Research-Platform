// src/features/bibliography/components/ReferenceManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  Add,
  ImportExport,
  Folder,
  Tag,
  Download,
  MoreVert,
  Article,
  Book,
  School,
  Language
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { useAuth } from '@/hooks/useAuth';
import { referenceAPI } from '@/services/api/reference.api';
import { ReferenceType } from '@/types/reference.types';

export const ReferenceManager: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { user } = useAuth();
  const [references, setReferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: null as ReferenceType | null,
    yearFrom: null as number | null,
    yearTo: null as number | null,
    folderId: null as string | null
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Charger les références
  const loadReferences = async () => {
    setLoading(true);
    try {
      const params = {
        projectId,
        query: searchQuery,
        ...filters,
        page: pagination.page + 1,
        limit: pagination.pageSize,
        sortBy,
        sortOrder
      };
      
      const response = await referenceAPI.search(params);
      setReferences(response.data.references);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total
      }));
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des références',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, [projectId, searchQuery, filters, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  // Colonnes du tableau
  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Titre',
      flex: 2,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.authors?.slice(0, 2).join(', ')}
            {params.row.authors?.length > 2 && ' et al.'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'year',
      headerName: 'Année',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          {getTypeIcon(params.value)}
          <Typography variant="caption" ml={1}>
            {getTypeLabel(params.value)}
          </Typography>
        </Box>
      )
    },
    {
      field: 'journal',
      headerName: 'Source',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.value?.slice(0, 2).map((tag: any) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              style={{ backgroundColor: tag.color, marginRight: 4, marginBottom: 2 }}
            />
          ))}
          {params.value?.length > 2 && (
            <Chip
              label={`+${params.value.length - 2}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <ReferenceActions reference={params.row} onUpdate={loadReferences} />
      )
    }
  ];

  // Gestion de l'import
  const handleImport = async (file: File, format: 'bibtex' | 'ris') => {
    try {
      const content = await file.text();
      await referenceAPI.import({ projectId, format, content });
      
      setSnackbar({
        open: true,
        message: `${format === 'bibtex' ? 'BibTeX' : 'RIS'} importé avec succès`,
        severity: 'success'
      });
      setShowImportDialog(false);
      loadReferences();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erreur lors de l\'importation',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* En-tête */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid>
            <Typography variant="h5" component="h1">
              Bibliographie
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {pagination.total} références
            </Typography>
          </Grid>
          
          <Grid>
            <Box display="flex" gap={2}>
              <TextField
                placeholder="Rechercher..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
              
              <Tooltip title="Filtres">
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
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tableau des références */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={references}
          columns={columns}
          loading={loading}
          pagination
          paginationMode="server"
          rowCount={pagination.total}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationModel={{
            page: pagination.page,
            pageSize: pagination.pageSize
          }}
          onPaginationModelChange={(model) => {
            setPagination(prev => ({
              ...prev,
              page: model.page,
              pageSize: model.pageSize
            }));
          }}
          slots={{
            toolbar: GridToolbar
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 }
            }
          }}
        />
      </Paper>

      {/* Dialogs */}
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
      
      <AddReferenceDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        projectId={projectId}
        onSuccess={() => {
          setShowAddDialog(false);
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

// Composant pour les actions sur une référence
const ReferenceActions: React.FC<{ reference: any; onUpdate: () => void }> = ({ reference, onUpdate }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleEdit = () => {
    // Ouvrir le dialog d'édition
    handleClose();
  };
  
  const handleDelete = async () => {
    if (window.confirm('Supprimer cette référence ?')) {
      try {
        await referenceAPI.delete(reference.id);
        onUpdate();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
    handleClose();
  };
  
  const handleCite = () => {
    // Générer une citation
    handleClose();
  };
  
  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <MoreVert />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleEdit}>Modifier</MenuItem>
        <MenuItem onClick={handleCite}>Citer</MenuItem>
        <MenuItem onClick={() => {/* Voir les détails */}}>Détails</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Supprimer
        </MenuItem>
      </Menu>
    </>
  );
};

// Dialog d'import
const ImportDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onImport: (file: File, format: 'bibtex' | 'ris') => void;
}> = ({ open, onClose, onImport }) => {
  const [format, setFormat] = useState<'bibtex' | 'ris'>('bibtex');
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setFile(event.target.files[0]);
    }
  };
  
  const handleSubmit = () => {
    if (file) {
      onImport(file, format);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importer des références</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Format d'importation
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!file}
        >
          Importer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialog d'ajout
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
    type: 'ARTICLE' as ReferenceType,
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    url: '',
    abstract: ''
  });
  
  const handleSubmit = async () => {
    try {
      await referenceAPI.create({
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
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid xs={12}>
              <TextField
                label="Titre"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Auteurs
              </Typography>
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
              >
                + Ajouter un auteur
              </Button>
            </Grid>
            
            <Grid xs={6}>
              <TextField
                label="Année"
                type="number"
                fullWidth
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              />
            </Grid>
            
            <Grid xs={6}>
              <TextField
                select
                label="Type"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ReferenceType }))}
              >
                <MenuItem value="ARTICLE">Article</MenuItem>
                <MenuItem value="BOOK">Livre</MenuItem>
                <MenuItem value="CHAPTER">Chapitre</MenuItem>
                <MenuItem value="THESIS">Thèse</MenuItem>
                <MenuItem value="CONFERENCE">Conférence</MenuItem>
                <MenuItem value="REPORT">Rapport</MenuItem>
                <MenuItem value="WEBPAGE">Page web</MenuItem>
                <MenuItem value="OTHER">Autre</MenuItem>
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
            
            <Grid xs={4}>
              <TextField
                label="Volume"
                fullWidth
                value={formData.volume}
                onChange={(e) => setFormData(prev => ({ ...prev, volume: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={4}>
              <TextField
                label="Numéro"
                fullWidth
                value={formData.issue}
                onChange={(e) => setFormData(prev => ({ ...prev, issue: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={4}>
              <TextField
                label="Pages"
                fullWidth
                value={formData.pages}
                onChange={(e) => setFormData(prev => ({ ...prev, pages: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={12}>
              <TextField
                label="DOI"
                fullWidth
                value={formData.doi}
                onChange={(e) => setFormData(prev => ({ ...prev, doi: e.target.value }))}
              />
            </Grid>
            
            <Grid xs={12}>
              <TextField
                label="URL"
                fullWidth
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
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

// Helper functions
const getTypeIcon = (type: ReferenceType) => {
  switch (type) {
    case 'ARTICLE': return <Article fontSize="small" />;
    case 'BOOK': return <Book fontSize="small" />;
    case 'THESIS': return <School fontSize="small" />;
    case 'WEBPAGE': return <Language fontSize="small" />;
    default: return <Article fontSize="small" />;
  }
};

const getTypeLabel = (type: ReferenceType) => {
  const labels: Record<ReferenceType, string> = {
    ARTICLE: 'Article',
    BOOK: 'Livre',
    CHAPTER: 'Chapitre',
    THESIS: 'Thèse',
    CONFERENCE: 'Conférence',
    REPORT: 'Rapport',
    WEBPAGE: 'Web',
    OTHER: 'Autre'
  };
  return labels[type];
};
