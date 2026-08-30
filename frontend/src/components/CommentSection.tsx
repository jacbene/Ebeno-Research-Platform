import React, { useState, useEffect } from 'react';

interface Comment {
  id: string;
  content: string;
  userName: string;
  userEmail: string;
  created_at: number;
}

interface CommentSectionProps {
  transcriptionId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ transcriptionId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/comments/${transcriptionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transcriptionId) fetchComments();
  }, [transcriptionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/comments/${transcriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #e9ecef', paddingTop: '12px' }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>
        💬 Commentaires ({comments.length})
      </h4>

      {loading ? (
        <p style={{ fontSize: '14px', color: '#666' }}>Chargement...</p>
      ) : (
        <>
          {comments.map((c) => (
            <div key={c.id} style={{
              padding: '8px 0',
              borderBottom: '1px solid #f1f3f5',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{c.userName || c.userEmail}</strong>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0' }}>{c.content}</p>
              <button
                onClick={() => handleDelete(c.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc3545',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 0'
                }}
              >
                Supprimer
              </button>
            </div>
          ))}
        </>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          disabled={submitting}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (submitting || !newComment.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? '...' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
};
