// frontend/src/components/FilePreviewModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';

export interface FilePreviewData {
  type: 'html' | 'text' | 'pdf' | 'image' | 'video' | 'audio' | 'unsupported';
  content?: string;
  signedUrl?: string;
  editable: boolean;
  editFormat?: 'html' | 'text';
  meta: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    version: number;
  };
}

interface FilePreviewModalProps {
  file: {
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  };
  projectId: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface Version {
  id: string;
  version: number;
  editedBy?: string | null;
  createdAt: string;
  fileSize: number;
}

const formatSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (dateStr: string, locale: string): string => {
  try {
    return new Date(dateStr).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  projectId,
  onClose,
  onSaved,
}) => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  const [preview, setPreview] = useState<FilePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // Charger le preview
  // ============================================================
  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}/files/${file.id}/preview`);
        if (res.data.success) {
          setPreview(res.data.preview);
          setEditedContent(res.data.preview.content || '');
        } else {
          setError('Preview indisponible');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [file.id, projectId]);

  // ============================================================
  // Charger l'historique des versions
  // ============================================================
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/files/${file.id}/versions`);
        if (res.data.success) {
          setVersions(res.data.versions || []);
        }
      } catch {
        // Silencieux
      }
    };
    fetchVersions();
  }, [file.id, projectId]);

  // ============================================================
  // ESC pour fermer
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditing) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditing]);

  // ============================================================
  // Éditeur : charger le contenu HTML
  // ============================================================
  useEffect(() => {
    if (isEditing && editorRef.current && preview?.editFormat === 'html') {
      editorRef.current.innerHTML = editedContent;
    }
  }, [isEditing, preview?.editFormat, editedContent]);

  // ============================================================
  // Sauvegarder
  // ============================================================
  const handleSave = async () => {
    if (!preview) return;

    let content: string;
    if (preview.editFormat === 'html' && editorRef.current) {
      content = editorRef.current.innerHTML;
    } else {
      content = editedContent;
    }

    if (!content.trim()) {
      toast.addToast({ type: 'error', title: t('files.edit.emptyError') });
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/projects/${projectId}/files/${file.id}/edit`, {
        content,
        format: preview.editFormat,
      });

      if (res.data.success) {
        toast.addToast({
          type: 'success',
          title: t('files.edit.saved'),
          message: t('files.edit.version', { version: res.data.version }),
        });
        setIsEditing(false);

        // Recharger le preview
        const previewRes = await api.get(
          `/projects/${projectId}/files/${file.id}/preview`
        );
        if (previewRes.data.success) {
          setPreview(previewRes.data.preview);
          setEditedContent(previewRes.data.preview.content || '');
        }

        // Recharger les versions
        const versionsRes = await api.get(
          `/projects/${projectId}/files/${file.id}/versions`
        );
        if (versionsRes.data.success) {
          setVersions(versionsRes.data.versions || []);
        }

        onSaved?.();
      }
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('files.edit.error'),
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Annuler l'édition
  // ============================================================
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(preview?.content || '');
  };

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '20px',
      }}
      onClick={() => !isEditing && onClose()}
    >
      <div
        style={{
          backgroundColor: colors.white,
          borderRadius: isMobile ? 0 : theme.borderRadius.lg,
          maxWidth: isMobile ? '100vw' : '95vw',
          maxHeight: isMobile ? '100vh' : '95vh',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.gray[200]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            backgroundColor: colors.gray[50] || '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '20px' }}>📄</span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: colors.dark,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.fileName}
              </div>
              {preview && (
                <div style={{ fontSize: '11px', color: colors.gray[500] }}>
                  v{preview.meta.version} · {formatSize(preview.meta.fileSize)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bouton historique */}
            {versions.length > 1 && !isEditing && (
              <button
                onClick={() => setShowVersions(!showVersions)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: showVersions ? colors.primary : 'transparent',
                  color: showVersions ? 'white' : colors.dark,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🕐 {versions.length}
              </button>
            )}

            {/* Bouton éditer */}
            {preview?.editable && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                ✏️ {t('files.edit.button')}
              </button>
            )}

            {/* Boutons de sauvegarde */}
            {isEditing && (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.gray[200],
                    color: colors.dark,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: saving ? colors.gray[400] : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  {saving ? t('files.edit.saving') : `💾 ${t('files.edit.save')}`}
                </button>
              </>
            )}

            {/* Fermer */}
            <button
              onClick={onClose}
              disabled={isEditing}
              title={isEditing ? t('files.edit.closeHint') : ''}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '22px',
                cursor: isEditing ? 'not-allowed' : 'pointer',
                color: isEditing ? colors.gray[300] : colors.gray[600],
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* PANNEAU DES VERSIONS */}
        {showVersions && !isEditing && versions.length > 0 && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#f0f4ff',
              borderBottom: `1px solid ${colors.gray[200]}`,
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: colors.dark, marginBottom: '8px' }}>
              🕐 {t('files.versions.title')}
            </div>
            {versions.map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  marginBottom: '4px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: colors.dark,
                }}
              >
                <span style={{ fontWeight: 'bold' }}>v{v.version}</span>
                <span style={{ color: colors.gray[500], fontSize: '11px' }}>
                  {formatDate(v.createdAt, i18n.language)} · {formatSize(v.fileSize)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CONTENU */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', backgroundColor: '#fff' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <span>{t('common.loading')}</span>
            </div>
          ) : error ? (
            <div style={{ color: colors.danger, textAlign: 'center', padding: '40px 20px' }}>
              ❌ {error}
            </div>
          ) : !preview ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.gray[500] }}>
              {t('files.preview.unavailable')}
            </div>
          ) : isEditing ? (
            // ✅ MODE ÉDITION
            preview.editFormat === 'html' ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  padding: '24px',
                  outline: 'none',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  minHeight: '100%',
                  fontFamily: 'Calibri, Arial, sans-serif',
                  color: colors.dark,
                }}
              />
            ) : (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '20px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  lineHeight: 1.6,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: colors.dark,
                  boxSizing: 'border-box',
                }}
              />
            )
          ) : (
            // ✅ MODE LECTURE
            <>
              {preview.type === 'html' && (
                <div
                  style={{
                    padding: '24px',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: colors.dark,
                    fontFamily: 'Calibri, Arial, sans-serif',
                  }}
                  dangerouslySetInnerHTML={{ __html: preview.content || '' }}
                />
              )}

              {preview.type === 'text' && (
                <pre
                  style={{
                    padding: '20px',
                    margin: 0,
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: colors.dark,
                  }}
                >
                  {preview.content}
                </pre>
              )}

              {preview.type === 'pdf' && preview.signedUrl && (
                <iframe
                  src={`${preview.signedUrl}#toolbar=1&view=FitH`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={file.fileName}
                />
              )}

              {preview.type === 'image' && preview.signedUrl && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', minHeight: '100%' }}>
                  <img
                    src={preview.signedUrl}
                    alt={file.fileName}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

              {preview.type === 'video' && preview.signedUrl && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', minHeight: '100%' }}>
                  <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    <source src={preview.signedUrl} type={file.mimeType} />
                  </video>
                </div>
              )}

              {preview.type === 'audio' && preview.signedUrl && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎵</div>
                  <audio controls style={{ width: '100%', maxWidth: '500px' }}>
                    <source src={preview.signedUrl} type={file.mimeType} />
                  </audio>
                </div>
              )}

              {preview.type === 'unsupported' && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.gray[500] }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📎</div>
                  <p style={{ marginBottom: '20px' }}>{t('files.preview.unsupported')}</p>
                  <a
                    href={file.filePath}
                    download={file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: colors.primary,
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                    }}
                  >
                    ⬇️ {t('common.download')}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* PIED */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: `1px solid ${colors.gray[200]}`,
            fontSize: '11px',
            color: colors.gray[500],
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            backgroundColor: colors.gray[50] || '#fafafa',
          }}
        >
          <span>{file.mimeType}</span>
          {isEditing && (
            <span style={{ color: colors.warning || '#f59e0b', fontWeight: 'bold' }}>
              ⚠️ {t('files.edit.modeHint')}
            </span>
          )}
          <span>{formatSize(file.fileSize)}</span>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
