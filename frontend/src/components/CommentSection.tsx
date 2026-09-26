// frontend/src/components/CommentSection.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';
import { api } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { breakpoints } from '../styles/breakpoints';

export type CommentDocumentType = 'transcription' | 'memo' | 'collaboration' | 'file';

interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  documentId: string;
  documentType: CommentDocumentType;
  /** Affichage compact (sans titre) */
  compact?: boolean;
}

// ✅ Récupère le user connecté depuis le localStorage
const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  documentId,
  documentType,
  compact = false,
}) => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t, i18n } = useTranslation();
	const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const currentUser = getCurrentUser();

  // ============================================================
  // Chargement
  // ============================================================
  const fetchComments = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/comments/${documentType}/${documentId}`);
      if (res.data.success) {
        setComments(res.data.comments || []);
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement commentaires:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, documentType]);

  // ============================================================
  // Ajouter un commentaire (racine ou réponse)
  // ============================================================
  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const text = parentId ? replyText.trim() : newComment.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/comments/${documentType}/${documentId}`, {
        content: text,
        parentId,
      });

      if (res.status === 201) {
        if (parentId) {
          setReplyText('');
          setReplyTo(null);
        } else {
          setNewComment('');
        }
        await fetchComments();
        toast.addToast({ type: 'success', title: t('comments.added') });
      }
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('comments.addError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Éditer
  // ============================================================
  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      await api.put(`/comments/${commentId}`, { content: editingText.trim() });
      setEditingId(null);
      setEditingText('');
      await fetchComments();
      toast.addToast({ type: 'success', title: t('comments.updated') });
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('comments.updateError'),
      });
    }
  };

  // ============================================================
  // Supprimer
  // ============================================================
  const handleDelete = async (commentId: string) => {
    if (!confirm(t('comments.deleteConfirm'))) return;
    try {
      await api.delete(`/comments/${commentId}`);
      await fetchComments();
      toast.addToast({ type: 'success', title: t('comments.deleted') });
    } catch (err: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: err.response?.data?.error || t('comments.deleteError'),
      });
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(i18n.language, {
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

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ============================================================
  // Rendu d'un commentaire (récursif pour les réponses)
  // ============================================================
const renderComment = (c: Comment, depth: number = 0) => {
  const isAuthor = c.userId === currentUser.id;
  const isEditing = editingId === c.id;
  const maxDepth = 3;
  // ✅ Réduire l'indentation sur mobile (12px au lieu de 24px)
  const indentStep = isMobile ? 12 : 24;
  const indent = Math.min(depth, maxDepth) * indentStep;

  return (
    <div key={c.id} style={{ marginLeft: `${indent}px`, marginBottom: isMobile ? '8px' : '10px' }}>
      <div
        style={{
          padding: isMobile ? '8px 10px' : '10px 12px',
          backgroundColor: depth === 0 ? colors.gray[50] || '#fafafa' : colors.white,
          border: `1px solid ${colors.gray[200]}`,
          borderLeft: depth > 0 ? `3px solid ${colors.primary}60` : `1px solid ${colors.gray[200]}`,
          borderRadius: theme.borderRadius.md,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
      >
        {/* Header : avatar + nom + date */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          {c.userAvatar ? (
            <img
              src={c.userAvatar}
              alt={c.userName}
              style={{
                width: isMobile ? '24px' : '28px',
                height: isMobile ? '24px' : '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: isMobile ? '24px' : '28px',
                height: isMobile ? '24px' : '28px',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {getInitials(c.userName || c.userEmail)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: '600',
                color: colors.dark,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {c.userName || c.userEmail}
            </div>
            <div
              style={{
                fontSize: isMobile ? '10px' : '11px',
                color: colors.gray[500],
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDate(c.createdAt)}
              {c.updatedAt !== c.createdAt && ` · ${t('comments.edited')}`}
            </div>
          </div>
        </div>

        {/* Contenu ou édition */}
        {isEditing ? (
          <div style={{ marginTop: '6px' }}>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${colors.primary}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSaveEdit(c.id)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => { setEditingId(null); setEditingText(''); }}
                style={{
                  padding: '4px 12px',
                  backgroundColor: colors.gray[200],
                  color: colors.dark,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: isMobile ? '12px' : '13px',
              lineHeight: 1.6,
              color: colors.dark,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {c.content}
          </p>
        )}

        {/* Actions */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            {depth < maxDepth && (
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.primary,
                  fontSize: isMobile ? '10px' : '11px',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: '600',
                }}
              >
                {replyTo === c.id ? t('comments.cancelReply') : t('comments.reply')}
              </button>
            )}
            {isAuthor && (
              <>
                <button
                  onClick={() => { setEditingId(c.id); setEditingText(c.content); }}
                  style={{
                    background: 'none', border: 'none',
                    color: colors.gray[500], fontSize: isMobile ? '10px' : '11px',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  {t('comments.edit')}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: colors.danger, fontSize: isMobile ? '10px' : '11px',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  {t('comments.delete')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Zone de réponse */}
        {replyTo === c.id && (
          <form onSubmit={(e) => handleSubmit(e, c.id)} style={{ marginTop: '8px' }}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('comments.replyPlaceholder')}
              rows={2}
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={submitting || !replyText.trim()}
                style={{
                  padding: '5px 14px',
                  backgroundColor: submitting || !replyText.trim() ? colors.gray[300] : colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {submitting ? '…' : t('comments.send')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Réponses imbriquées */}
      {c.replies && c.replies.length > 0 && (
        <div style={{ marginTop: isMobile ? '6px' : '10px' }}>
          {c.replies.map((reply) => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );
};
    
  // ============================================================
  // Rendu principal
  // ============================================================
  return (
    <div
      style={{
        marginTop: compact ? '12px' : '20px',
        paddingTop: compact ? '12px' : '16px',
        borderTop: `1px solid ${colors.gray[200]}`,
      }}
    >
      {!compact && (
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: colors.dark, display: 'flex', alignItems: 'center', gap: '6px' }}>
          💬 {t('comments.title')} ({comments.length})
        </h4>
      )}

      {compact && (
        <div style={{ fontSize: '12px', color: colors.gray[600], marginBottom: '8px', fontWeight: 600 }}>
          💬 {t('comments.title')} ({comments.length})
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: colors.gray[500] }}>{t('common.loading')}</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: '13px', color: colors.gray[500], fontStyle: 'italic' }}>
          {t('comments.empty')}
        </p>
      ) : (
        <div>{comments.map((c) => renderComment(c, 0))}</div>
      )}

      {/* Formulaire nouveau commentaire */}
{/* Formulaire nouveau commentaire */}
<form onSubmit={(e) => handleSubmit(e, null)} style={{ marginTop: isMobile ? '10px' : '12px' }}>
  <textarea
    value={newComment}
    onChange={(e) => setNewComment(e.target.value)}
    placeholder={t('comments.placeholder')}
    rows={isMobile ? 3 : 2}
    style={{
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${colors.gray[300]}`,
      borderRadius: theme.borderRadius.md,
      fontSize: '13px',
      fontFamily: 'inherit',
      resize: 'vertical',
      outline: 'none',
      boxSizing: 'border-box',
    }}
  />
  <button
    type="submit"
    disabled={submitting || !newComment.trim()}
    style={{
      marginTop: '6px',
      padding: isMobile ? '10px 16px' : '6px 16px',
      width: isMobile ? '100%' : 'auto',
      backgroundColor: submitting || !newComment.trim() ? colors.gray[300] : colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
    }}
  >
    {submitting ? t('comments.sending') : t('comments.send')}
  </button>
</form>
    </div>
  );
};

export default CommentSection;
