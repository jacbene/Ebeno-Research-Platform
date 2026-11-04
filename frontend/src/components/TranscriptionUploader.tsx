// frontend/src/components/TranscriptionUploader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useQuotaWarning } from '../hooks/useQuotaWarning';
import './TranscriptionUploader.css';
import { useTranslation } from 'react-i18next';

// ✅ Interface manquante
interface TranscriptionUploaderProps {
  projectId?: string;
  onUploadComplete?: (transcriptionId: string) => void;
}

const TranscriptionUploader: React.FC<TranscriptionUploaderProps> = ({
  projectId,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation();

  // ✅ URL locale pour la pré-écoute
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const toast = useToast();
  const checkQuotaWarning = useQuotaWarning();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Générer et nettoyer l'URL de prévisualisation
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Cleanup intervalle
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ✅ FONCTION MANQUANTE : formatFileSize
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(null);
      setError(null);
      setUploading(false);
      setProgress(0);
      setTranscriptionId(null);
      setIsCompleted(false);

      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/flac'];
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['mp3', 'wav', 'mp4', 'webm', 'ogg', 'm4a', 'flac'];

      if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(extension || '')) {
        setError('Type de fichier non supporté. Veuillez sélectionner un fichier audio.');
        return;
      }

      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('Fichier trop volumineux (max 100MB)');
        return;
      }

      setFile(selectedFile);
    }
  };

  // ✅ FONCTION MANQUANTE : handleUpload
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setIsCompleted(false);
    setProgress(0);

    const formData = new FormData();
    if (projectId) {
      formData.append('projectId', projectId);
    }
    formData.append('file', file);

    try {
      const response = await api.post('/transcriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });

      if (response.data.success) {
        const newTranscriptionId = response.data.data?.transcriptionId;
        setTranscriptionId(newTranscriptionId);

        if (response.data.quota) {
          checkQuotaWarning(response.data.quota);
        }

        if (onUploadComplete && newTranscriptionId) {
          onUploadComplete(newTranscriptionId);
        }

        trackProgress(newTranscriptionId);
      } else {
        setError(response.data.message || 'Erreur lors de l\'upload');
        setUploading(false);
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.code === 'QUOTA_EXCEEDED') {
        toast.addToast({
          type: 'error',
          title: 'Quota IA épuisé 🚫',
          message: `${err.response.data.message || 'Quota atteint.'} Rendez-vous sur /pricing pour recharger.`,
          duration: 6000,
        });
        setError('');
        setUploading(false);
        return;
      }
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
      setUploading(false);
    }
  };

  // ✅ FONCTION MANQUANTE : trackProgress
  const trackProgress = (id: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/transcriptions/${id}/progress`);
        if (response.data.success) {
          const { status, progress: serverProgress } = response.data.data;
          setProgress(serverProgress || 0);

          if (status === 'COMPLETED') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setUploading(false);
            setIsCompleted(true);

            if (onUploadComplete) onUploadComplete(id);

            setTimeout(() => {
              setFile(null);
              setIsCompleted(false);
              setProgress(0);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }, 5000);
          } else if (status === 'FAILED') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setUploading(false);
            setError('La transcription a échoué. Le fichier reste visible dans la liste.');
            if (onUploadComplete) onUploadComplete(id);
          }
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setUploading(false);
          setError('Erreur lors du suivi de la transcription.');
          if (onUploadComplete) onUploadComplete(id);
        }
      } catch (error) {
        console.error('Error tracking progress:', error);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setUploading(false);
        setError('Erreur lors du suivi de la transcription.');
        if (onUploadComplete) onUploadComplete(id);
      }
    }, 2000);
  };

  // ✅ FONCTION MANQUANTE : resetState
  const resetState = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    setTranscriptionId(null);
    setIsCompleted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="transcription-uploader">
      <div
        className="upload-area"
        onClick={() => !uploading && !isCompleted && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading || isCompleted}
        />

        {file ? (
          <div className="file-info">
            <div className="file-icon">🎵</div>
            <div className="file-details">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatFileSize(file.size)}</div>
            </div>
            <button
              className="clear-button"
              onClick={(e) => {
                e.stopPropagation();
                resetState();
              }}
              disabled={uploading || isCompleted}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              <strong>Cliquez pour sélectionner un fichier audio</strong>
            </p>
            <p className="upload-subtext">
              Formats supportés: MP3, WAV, MP4, WebM, OGG<br />
              Taille max: 100MB
            </p>
          </div>
        )}
      </div>

      {/* ✅ Lecteur audio avant upload */}
      {file && previewUrl && !uploading && !isCompleted && (
        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', textAlign: 'center' }}>
            {t('transcriptionList.listenBefore', '🎧 Écoutez votre fichier avant de lancer la transcription')}
          </p>
          <audio controls src={previewUrl} style={{ width: '100%', height: '40px' }} />
        </div>
      )}

      {error && <div className="error-message">⚠️ {error}</div>}

      {file && !uploading && !isCompleted && (
        <button className="upload-button" onClick={handleUpload}>
          Démarrer la transcription
        </button>
      )}

      {/* ✅ Bloc de progression complet */}
      {(uploading || isCompleted) && (
        <div className="progress-container">
          {isCompleted ? (
            <div className="completion-message">✅ Transcription terminée avec succès !</div>
          ) : (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-text">
                Transcription en cours... {progress}%
                {transcriptionId && (
                  <span className="transcription-id">ID: {transcriptionId.substring(0, 8)}...</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptionUploader;
