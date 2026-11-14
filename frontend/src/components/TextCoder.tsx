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
  filterCodeName?: string | null; // ✅ NOUVEAU
  onCodeAdded?: () => void;       // ✅ NOUVEAU
}

export const TextCoder: React.FC<TextCoderProps> = ({ text, documentId, documentType, filterCodeName = null, onCodeAdded }) => {
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

  // ✅ FONCTION ROBUSTE : Calcule l'offset réel en parcourant les nœuds texte
  const getCaretOffset = (node: Node, offset: number): number => {
    if (!containerRef.current) return 0;
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT);
    let totalOffset = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }
    return totalOffset;
  };

  // ✅ Écouter les changements de sélection
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) return;
      if (!containerRef.current.contains(sel.anchorNode)) return;

      const range = sel.getRangeAt(0);

      let start = getCaretOffset(range.startContainer, range.startOffset);
      let end = getCaretOffset(range.endContainer, range.endOffset);

      // Sécurité : s'assurer que start < end
      if (start > end) [start, end] = [end, start];

      // Récupérer le texte brut sélectionné
      const rawSelectedText = text.substring(start, end);
      const trimmed = rawSelectedText.trim();
      if (trimmed.length === 0) {
        setSelection(null);
        return;
      }

      // Ajuster les offsets pour ne pas inclure les espaces début/fin
      const leadingWhitespace = rawSelectedText.length - rawSelectedText.trimStart().length;
      start += leadingWhitespace;
      end = start + trimmed.length;

      // Limiter end à la taille du texte
      if (end > text.length) end = text.length;

      setSelection({ start, end, text: trimmed });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [text]);

  // Enregistrer le code
  const handleSaveCode = async () => {
    if (!codeName.trim() || !selection) return;

    try {
      const newSegment = {
        documentId,
        documentType,
        codeName: codeName.trim(),
        color: '#f59e0b',
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
  if (onCodeAdded) onCodeAdded(); // ✅ NOUVEAU : prévenir le parent
}
    } catch (err: any) {
      toast.addToast({ type: 'error', title: 'Erreur lors du codage' });
    }
  };

  // ✅ NOUVEAU : Supprimer un segment au clic
  const handleDeleteSegment = async (segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce code ?')) return;
    try {
      await api.delete(`/codes/segments/${segmentId}`);
      setSegments(segments.filter(s => s.id !== segmentId));
      toast.addToast({ type: 'success', title: 'Code supprimé' });
    } catch (err) {
      toast.addToast({ type: 'error', title: 'Erreur lors de la suppression' });
    }
  };

  // Afficher le texte avec les surlignages
  const renderHighlightedText = () => {
    if (segments.length === 0) return text;

    const sorted = [...segments].sort((a, b) => a.start_offset - b.start_offset);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((seg) => {
      // Éviter les chevauchements
      if (seg.start_offset < lastIndex) return;
      
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
            cursor: 'pointer',
            boxShadow: filterCodeName ? `0 0 0 1px ${seg.color}` : 'none',
          }}
          title={`Code : ${seg.code_name} (cliquer pour supprimer)`}
          onClick={(e) => handleDeleteSegment(seg.id, e)}
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

      {/* Bouton fixe */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
          <span style={{ fontSize: '12px', color: '#666' }}>
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
