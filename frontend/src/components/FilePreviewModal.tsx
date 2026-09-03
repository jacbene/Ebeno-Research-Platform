import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ebeno-backend.onrender.com';

interface FilePreviewModalProps {
  file: {
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  };
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { colors } = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `${API_BASE_URL}/${file.filePath}`;
  const fileExtension = file.fileName.split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'];
    if (textExtensions.includes(fileExtension)) {
      const fetchText = async () => {
        try {
          const response = await fetch(fileUrl);
          if (response.ok) {
            const text = await response.text();
            setContent(text);
          } else {
            setError('Impossible de lire le fichier');
          }
        } catch (err) {
          setError('Erreur de chargement');
        } finally {
          setLoading(false);
        }
      };
      fetchText();
    } else {
      setLoading(false);
    }
  }, [fileUrl, fileExtension]);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';
  const isText = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(fileExtension);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExtension);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.white,
          borderRadius: theme.borderRadius.lg,
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
          padding: theme.spacing.md,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, color: colors.dark }}>
            📄 {file.fileName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: colors.gray[600],
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <span>⏳ Chargement...</span>
            </div>
          ) : error ? (
            <div style={{ color: colors.danger, textAlign: 'center', padding: '20px' }}>
              ❌ {error}
            </div>
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={file.fileName}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
          ) : isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={file.fileName}
            />
          ) : isText ? (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                padding: theme.spacing.md,
                backgroundColor: colors.gray[100],
                borderRadius: theme.borderRadius.md,
                maxHeight: '100%',
                overflow: 'auto',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: colors.dark,
              }}
            >
              {content}
            </pre>
          ) : isVideo ? (
            <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
              <source src={fileUrl} type={file.mimeType} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : isAudio ? (
            <audio controls style={{ width: '100%' }}>
              <source src={fileUrl} type={file.mimeType} />
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.gray[500] }}>
              <p style={{ fontSize: '48px' }}>📎</p>
              <p>Aucun aperçu disponible pour ce type de fichier.</p>
              <a
                href={fileUrl}
                download={file.fileName}
                style={{
                  display: 'inline-block',
                  marginTop: theme.spacing.md,
                  padding: '8px 16px',
                  backgroundColor: colors.primary,
                  color: colors.white,
                  textDecoration: 'none',
                  borderRadius: theme.borderRadius.md,
                }}
              >
                ⬇️ Télécharger
              </a>
            </div>
          )}
        </div>

        <div style={{ marginTop: theme.spacing.sm, fontSize: '12px', color: colors.gray[500], textAlign: 'right' }}>
          Taille : {(file.fileSize / 1024).toFixed(1)} KB • Type : {file.mimeType}
        </div>
      </div>
    </div>
  );
};
