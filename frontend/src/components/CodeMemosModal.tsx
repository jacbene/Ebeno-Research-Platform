// frontend/src/components/CodeMemosModal.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface Memo {
  id: string;
  content: string;
  created_at: string;
}

interface CodeMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  codeName: string;
  codeColor: string;
}

export const CodeMemosModal: React.FC<CodeMemosModalProps> = ({ isOpen, onClose, projectId, codeName, codeColor }) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const fetchMemos = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/codes/memos`, { 
         params: {
          projectId, 
          codeName,
          _t: Date.now() // ✅ Cache buster
           }
          });
        if (res.data.success && Array.isArray(res.data.memos)) {
          setMemos(res.data.memos);
        } else {
          setMemos([]);
        }
      } catch (err) {
        console.error(err);
        setMemos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMemos();
  }, [isOpen, projectId, codeName]);

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/codes/memos', { projectId, codeName, content: newMemo.trim() });
      if (res.data.success) {
        setMemos([{ id: res.data.id, content: newMemo.trim(), created_at: new Date().toISOString() }, ...memos]);
        setNewMemo('');
        toast.addToast({ type: 'success', title: 'Note ajoutée' });
      }
    } catch (err) {
      toast.addToast({ type: 'error', title: 'Erreur lors de l\'ajout' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemo = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await api.delete(`/codes/memos/${id}`);
      setMemos(memos.filter(m => m.id !== id));
    } catch (err) {
      toast.addToast({ type: 'error', title: 'Erreur suppression' });
    }
  };

  if (!isOpen) return null;

  // ✅ SÉCURITÉ : Fallback si memos devient undefined
  const safeMemos = Array.isArray(memos) ? memos : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '16px',
    }} onClick={onClose}>
      
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
          maxWidth: '600px', width: '100%', maxHeight: '90vh', 
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '16px', height: '16px', borderRadius: '50%', 
              backgroundColor: codeColor 
            }} />
            <h2 style={{ margin: 0, fontSize: '18px', color: '#111' }}>
              Notes : {codeName}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        {/* Formulaire d'ajout */}
        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="Écrivez une note analytique sur ce code..."
            rows={3}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button 
            onClick={handleAddMemo} 
            disabled={saving || !newMemo.trim()}
            style={{ 
              marginTop: '8px', padding: '10px 20px', 
              backgroundColor: saving || !newMemo.trim() ? '#ccc' : '#4A6CF7', 
              color: 'white', border: 'none', borderRadius: '8px', 
              cursor: saving || !newMemo.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold', fontSize: '14px'
            }}
          >
            {saving ? 'Enregistrement...' : 'Ajouter la note'}
          </button>
        </div>

        {/* Liste des mémos */}
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          {loading ? (
            <p style={{ color: '#666', textAlign: 'center' }}>Chargement...</p>
          ) : safeMemos.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', fontStyle: 'italic', fontSize: '13px' }}>
              Aucune note pour ce code. Soyez le premier à théoriser !
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeMemos.map(memo => (
                <div key={memo.id} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap' }}>{memo.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(memo.created_at).toLocaleString()}
                    </span>
                    <button onClick={() => handleDeleteMemo(memo.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '12px' }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
