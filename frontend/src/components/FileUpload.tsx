import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { api } from '../services/api';

interface FileUploadProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ projectId, onUploadSuccess }) => {
  const { colors } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    // Logs pour déboguer
    console.log('📌 [FileUpload] projectId reçu :', projectId);
    console.log('📌 [FileUpload] Type de projectId :', typeof projectId);
    console.log('📌 [FileUpload] Nom du fichier :', file.name);
    console.log('📌 [FileUpload] Taille du fichier :', file.size);

    try {
      const url = `/projects/${projectId}/files`;
      console.log('📤 [FileUpload] URL appelée :', url);
      
      const response = await api.post(url, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });
      
      console.log('✅ [FileUpload] Réponse reçue :', response.status, response.data);
      
      if (response.status === 201) {
        setFile(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploadSuccess();
      } else {
        setError(response.data.error || 'Erreur lors de l\'upload');
      }
    } catch (err: any) {
      console.error('❌ [FileUpload] Erreur détaillée :', err);
      if (err.response) {
        console.error('📦 [FileUpload] Réponse serveur :', err.response.data);
        console.error('📄 [FileUpload] Statut :', err.response.status);
        setError(err.response.data?.error || 'Erreur serveur');
      } else if (err.request) {
        console.error('📡 [FileUpload] Pas de réponse du serveur');
        setError('Erreur de connexion au serveur');
      } else {
        console.error('⚙️ [FileUpload] Erreur de configuration :', err.message);
        setError('Erreur de configuration');
      }
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          border: `2px dashed ${colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: colors.gray[100],
          transition: 'border-color 0.2s',
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.primary; }}
        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.gray[300]; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = colors.gray[300];
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError('');
            setProgress(0);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        {file ? (
          <div>
            <div style={{ fontSize: '24px' }}>📄</div>
            <p><strong>{file.name}</strong></p>
            <p style={{ fontSize: '14px', color: colors.gray[500] }}>{formatFileSize(file.size)}</p>
            {uploading && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ width: '100%', height: '8px', backgroundColor: colors.gray[200], borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: colors.primary, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '12px', color: colors.gray[500] }}>{progress}%</span>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
              disabled={uploading}
              style={{
                marginTop: '8px',
                padding: '6px 16px',
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Upload en cours...' : 'Uploader'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              style={{
                marginTop: '8px',
                marginLeft: '8px',
                padding: '6px 16px',
                backgroundColor: colors.danger,
                color: colors.white,
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px' }}>📂</div>
            <p style={{ fontWeight: 'bold' }}>Déposez un fichier ici</p>
            <p style={{ fontSize: '14px', color: colors.gray[500] }}>
              ou cliquez pour sélectionner
            </p>
            <p style={{ fontSize: '12px', color: colors.gray[400] }}>
              Tous les types de fichiers sont acceptés
            </p>
          </div>
        )}
      </div>
      {error && (
        <div style={{ color: colors.danger, fontSize: '14px', marginTop: '4px' }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};
