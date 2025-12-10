import React, { useState, useRef } from 'react';
import { transcriptionApi } from '../services/transcriptionApi';
import './TranscriptionUploader.css';

interface TranscriptionUploaderProps {
  projectId?: string;
  onUploadComplete?: (transcriptionId: string) => void;
}

const TranscriptionUploader: React.FC<TranscriptionUploaderProps> = ({ 
  projectId, 
  onUploadComplete 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      // Vérifier le type de fichier
      const allowedTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/webm',
        'audio/ogg',
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Type de fichier non supporté. Veuillez sélectionner un fichier audio.');
        return;
      }

      // Vérifier la taille (100MB max)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('Fichier trop volumineux (max 100MB)');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await transcriptionApi.uploadAudio(file, projectId);
      
      if (response.data.success) {
        const { transcriptionId } = response.data.data;
        setTranscriptionId(transcriptionId);
        
        // Démarrer le suivi de progression
        trackProgress(transcriptionId);
        
        if (onUploadComplete) {
          onUploadComplete(transcriptionId);
        }
      } else {
        setError(response.data.message || 'Erreur lors de l\'upload');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
    } finally {
      setUploading(false);
    }
  };

  const trackProgress = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await transcriptionApi.getProgress(id);
        const { status, progress } = response.data.data;
        
        setProgress(progress);

        if (status === 'COMPLETED' || status === 'FAILED') {
          clearInterval(interval);
          
          if (status === 'COMPLETED') {
            // Recharger la page ou mettre à jour l'interface
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('Error tracking progress:', error);
        clearInterval(interval);
      }
    }, 2000); // Vérifier toutes les 2 secondes
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="transcription-uploader">
      <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
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
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
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
              Formats supportés: MP3, WAV, MP4, WebM, OGG
              <br />
              Taille max: 100MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {file && !uploading && (
        <button 
          className="upload-button"
          onClick={handleUpload}
          disabled={!file}
        >
          Démarrer la transcription
        </button>
      )}

      {uploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            Transcription en cours... {progress}%
            {transcriptionId && (
              <span className="transcription-id">
                ID: {transcriptionId.substring(0, 8)}...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionUploader;
