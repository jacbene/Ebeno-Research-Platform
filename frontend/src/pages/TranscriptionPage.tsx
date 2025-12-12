import React, { useState, useEffect } from 'react';
import TranscriptionUploader from '../components/TranscriptionUploader';
import { transcriptionApi } from '../services/transcriptionApi';
import './TranscriptionPage.css';

interface Transcription {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  fileSize: number;
}

const TranscriptionPage: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTranscriptions = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await transcriptionApi.getUserTranscriptions(pageNum, 10);
      
      if (response.data.success) {
        setTranscriptions(response.data.data.transcriptions);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions(page);
  }, [page]);

  const handleUploadComplete = () => {
    // Recharger la liste après un upload réussi
    setTimeout(() => {
      loadTranscriptions(page);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette transcription ?')) {
      try {
        await transcriptionApi.deleteTranscription(id);
        loadTranscriptions(page);
      } catch (error) {
        console.error('Error deleting transcription:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', label: 'En cours' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Terminé' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Échoué' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`status-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="transcription-page">
      <header className="page-header">
        <h1>Transcription Audio</h1>
        <p>Convertissez vos fichiers audio en texte avec précision</p>
      </header>

      <div className="upload-section">
        <h2>Nouvelle transcription</h2>
        <TranscriptionUploader onUploadComplete={handleUploadComplete} />
      </div>

      <div className="transcriptions-list">
        <h2>Historique des transcriptions</h2>
        
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : transcriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <p>Aucune transcription pour le moment</p>
            <p className="empty-subtext">
              Commencez par uploader un fichier audio ci-dessus
            </p>
          </div>
        ) : (
          <>
            <div className="transcriptions-table">
              <table>
                <thead>
                  <tr>
                    <th>Nom du fichier</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Durée</th>
                    <th>Taille</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transcriptions.map((transcription) => (
                    <tr key={transcription.id}>
                      <td className="file-name">
                        <div className="file-icon-small">🎵</div>
                        <span>{transcription.name}</span>
                      </td>
                      <td>{getStatusBadge(transcription.status)}</td>
                      <td>{formatDate(transcription.createdAt)}</td>
                      <td>{formatDuration(transcription.duration)}</td>
                      <td>
                        {(transcription.fileSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="actions">
                        <button 
                          className="action-button view"
                          onClick={() => window.open(`/transcription/${transcription.id}`, '_blank')}
                        >
                          Voir
                        </button>
                        <button 
                          className="action-button delete"
                          onClick={() => handleDelete(transcription.id)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Précédent
                </button>
                
                <span className="page-info">
                  Page {page} sur {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TranscriptionPage;
