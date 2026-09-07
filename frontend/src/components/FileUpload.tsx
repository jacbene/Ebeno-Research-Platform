// frontend/src/components/FileUpload.tsx
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

  // Sanitisation du nom de fichier
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      console.warn('⚠️ Aucun fichier sélectionné');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const originalFile = file;
      const safeName = sanitizeFileName(originalFile.name);

      console.log('📌 [FileUpload] Nom original :', originalFile.name);
      console.log('📌 [FileUpload] Nom sanitisé :', safeName);

      // Lire le contenu du fichier
      const arrayBuffer = await originalFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: originalFile.type });

      // Créer un nouveau fichier avec le nom sanitisé
      const cleanFile = new File([blob], safeName, { type: originalFile.type });

      console.log('📌 [FileUpload] Nouveau fichier créé :', cleanFile.name, cleanFile.size);

      const formData = new FormData();
      formData.append('file', cleanFile);
      formData.append('projectId', projectId);

      // Vérification
      console.log('📦 [FileUpload] FormData entries :', [...formData.entries()]);

      const token = localStorage.getItem('authToken');

      // Utilisation de fetch directement (comme dans le test réussi)
      const response = await fetch('https://ebeno-backend.onrender.com/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      console.log('✅ [FileUpload] Succès :', data);

      // Réinitialiser
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
    } catch (err: any) {
      console.error('❌ [FileUpload] Erreur :', err);
      setError(err.message || 'Erreur de connexion au serveur');
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
