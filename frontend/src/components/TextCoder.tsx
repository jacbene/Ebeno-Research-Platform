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

  // Gérer la sélection de texte
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

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

    // Trier les segments par position
    const sorted = [...segments].sort((a, b) => a.start_offset - b.start_offset);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((seg) => {
      // Texte avant le segment
      if (seg.start_offset > lastIndex) {
        parts.push(text.substring(lastIndex, seg.start_offset));
      }
      // Le segment surligné
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

    // Texte après le dernier segment
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Zone de texte */}
      {/* Zone de texte */}
<div
  ref={containerRef}
  onMouseUp={handleMouseUp}
  onTouchEnd={handleMouseUp} // ✅ AJOUT POUR MOBILE
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

      {/* Popup de sélection */}
      {selection && !showCodeInput && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#1f2937',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
        }} onClick={() => setShowCodeInput(true)}>
          🏷️ Coder ce passage
        </div>
      )}

      {/* Formulaire d'ajout de code */}
      {showCodeInput && selection && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 20,
          width: '300px',
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>Nom du code :</p>
          <input
            type="text"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            placeholder="ex: Motivation, Frustration..."
            autoFocus
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '12px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCode()}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowCodeInput(false); setSelection(null); }} style={{ padding: '6px 12px', border: 'none', background: '#f3f4f6', borderRadius: '4px', cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSaveCode} style={{ padding: '6px 12px', border: 'none', background: '#4A6CF7', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Coder</button>
          </div>
        </div>
      )}
    </div>
  );
};
