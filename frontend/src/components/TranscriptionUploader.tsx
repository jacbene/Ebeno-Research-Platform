// frontend/src/components/TranscriptionUploader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useQuotaWarning } from '../hooks/useQuotaWarning';
import './TranscriptionUploader.css';
import { useTranslation } from 'react-i18next';

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

  // ✅ NOUVEAU : URL locale pour la pré-écoute
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const toast = useToast();
  const checkQuotaWarning = useQuotaWarning();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ NOUVEAU : Générer et nettoyer l'URL de prévisualisation
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url); // Nettoyage mémoire
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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

  // ... (handleUpload, trackProgress, formatFileSize, resetState restent inchangés)

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

      {/* ✅ NOUVEAU : Lecteur audio avant upload */}
      {file && previewUrl && !uploading && !isCompleted && (
        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', textAlign: 'center' }}>
  {t('transcriptionList.listenBefore')}
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

      {(uploading || isCompleted) && (
        <div className="progress-container">
          {/* ... (ton code de progression existant) ... */}
        </div>
      )}
    </div>
  );
};

export default TranscriptionUploader;
