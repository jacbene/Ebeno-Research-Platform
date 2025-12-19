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
  const [isCompleted, setIsCompleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      // Reset state for new file
      setFile(null);
      setError(null);
      setUploading(false);
      setProgress(0);
      setTranscriptionId(null);
      setIsCompleted(false);

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

      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('Fichier trop volumineux (max 100MB)');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setIsCompleted(false);

    try {
      const response = await transcriptionApi.uploadAudio(file, projectId);
      
      if (response.data.success) {
        const { transcriptionId } = response.data.data;
        setTranscriptionId(transcriptionId);
        trackProgress(transcriptionId);
      } else {
        setError(response.data.message || 'Erreur lors de l\'upload');
        setUploading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
      setUploading(false);
    }
  };

  const trackProgress = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await transcriptionApi.getProgress(id);
        const { status, progress } = response.data.data;
        
        setProgress(progress);

        if (status === 'COMPLETED' || status === 'FAILED') {
          clearInterval(interval);
          setUploading(false);

          if (status === 'COMPLETED') {
            setIsCompleted(true);
            if (onUploadComplete) {
              onUploadComplete(id);
            }
            // Reset after a delay to show completion message
            setTimeout(() => {
              setFile(null);
              setIsCompleted(false);
              setProgress(0);
              if(fileInputRef.current) fileInputRef.current.value = '';
            }, 5000);
          } else {
            setError('La transcription a échoué. Veuillez réessayer.');
          }
        }
      } catch (error) {
        console.error('Error tracking progress:', error);
        setError('Erreur lors du suivi de la transcription.');
        clearInterval(interval);
        setUploading(false);
      }
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const resetState = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    setTranscriptionId(null);
    setIsCompleted(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <div className="transcription-uploader">
      <div className="upload-area" onClick={() => !uploading && !isCompleted && fileInputRef.current?.click()}>
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

      {file && !uploading && !isCompleted && (
        <button 
          className="upload-button"
          onClick={handleUpload}
        >
          Démarrer la transcription
        </button>
      )}

      {(uploading || isCompleted) && (
        <div className="progress-container">
            {isCompleted ? (
                <div className="completion-message">
                    ✅ Transcription terminée avec succès !
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
      )}

    </div>
  );
};

export default TranscriptionUploader;
