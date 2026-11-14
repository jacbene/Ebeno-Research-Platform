// frontend/src/components/TextCoder.tsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface Segment {
  id: string;
  code_name: string;
  color: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
}

interface TextCoderProps {
  text: string;
  documentId: string;
  documentType: 'transcription' | 'memo' | 'file';
}

export const TextCoder: React.FC<TextCoderProps> = ({ text, documentId, documentType }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeName, setCodeName] = useState('');
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger les segments existants
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const res = await api.get(`/codes/segments/${documentType}/${documentId}`);
        if (res.data.success) {
          setSegments(res.data.segments);
        }
      } catch (err) {
        console.error('Erreur chargement segments', err);
      }
    };
    fetchSegments();
  }, [documentId, documentType]);

  // ✅ NOUVEAU : Écouter les changements de sélection (fonctionne sur mobile)
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) return;

      // Vérifier que la sélection est bien à l'intérieur du conteneur
      if (!containerRef.current.contains(sel.anchorNode)) return;

      const range = sel.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      
      const start = preSelectionRange.toString().length;
      const end = start + range.toString().length;
      const selectedText = range.toString();

      if (selectedText.trim().length > 0) {
        setSelection({ start, end, text: selectedText });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Enregistrer le code
  const handleSaveCode = async () => {
    if (!codeName.trim() || !selection) return;

    try {
      const newSegment = {
        documentId,
        documentType,
        codeName: codeName.trim(),
        color: '#f59e0b', // Couleur par défaut (jaune ambre)
        startOffset: selection.start,
        endOffset: selection.end,
        selectedText: selection.text,
      };

      const res = await api.post('/codes/segments', newSegment);
      if (res.data.success) {
        setSegments([...segments, { ...newSegment, id: res.data.id }]);
        toast.addToast({ type: 'success', title: 'Segment codé !' });
        setSelection(null);
        setShowCodeInput(false);
        setCodeName('');
        window.getSelection()?.removeAllRanges();
      }
    } catch (err: any) {
      toast.addToast({ type: 'error', title: 'Erreur lors du codage' });
    }
  };

  // Afficher le texte avec les surlignages
  const renderHighlightedText = () => {
    if (segments.length === 0) return text;

    const sorted = [...segments].sort((a, b) => a.start_offset - b.start_offset);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((seg) => {
      if (seg.start_offset > lastIndex) {
        parts.push(text.substring(lastIndex, seg.start_offset));
      }
      parts.push(
        <span
          key={seg.id}
          style={{
            backgroundColor: `${seg.color}40`,
            borderBottom: `2px solid ${seg.color}`,
            padding: '2px 0',
            cursor: 'help',
          }}
          title={`Code : ${seg.code_name}`}
        >
          {text.substring(seg.start_offset, seg.end_offset)}
        </span>
      );
      lastIndex = seg.end_offset;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Zone de texte */}
      <div
        ref={containerRef}
        style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          fontSize: '14px',
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        {renderHighlightedText()}
      </div>

      {/* ✅ NOUVEAU : Bouton fixe toujours visible en bas */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setShowCodeInput(true)}
          disabled={!selection}
          style={{
            padding: '10px 20px',
            backgroundColor: selection ? '#4A6CF7' : '#e5e7eb',
            color: selection ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            cursor: selection ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: selection ? '0 4px 12px rgba(74, 108, 247, 0.3)' : 'none',
          }}
        >
          🏷️ Coder la sélection
        </button>
        {selection && (
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666', alignSelf: 'center' }}>
            {selection.text.length} caractères sélectionnés
          </span>
        )}
      </div>

      {/* Formulaire d'ajout de code */}
      {showCodeInput && selection && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          border: '1px solid #e5e7eb',
          zIndex: 9999,
          width: '90%',
          maxWidth: '400px',
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>Nom du code :</p>
          <input
            type="text"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            placeholder="ex: Motivation, Frustration..."
            autoFocus
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCode()}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowCodeInput(false); setCodeName(''); }} style={{ padding: '8px 16px', border: 'none', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
            <button onClick={handleSaveCode} style={{ padding: '8px 16px', border: 'none', background: '#4A6CF7', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Coder</button>
          </div>
        </div>
      )}
    </div>
  );
};
