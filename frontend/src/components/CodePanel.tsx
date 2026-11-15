// frontend/src/components/CodePanel.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CodeMemosModal } from './CodeMemosModal';

interface ProjectCode {
  name: string;
  color: string;
  count: number;
  segments: any[];
}

interface CodePanelProps {
  projectId: string;
  onFilterChange: (codeName: string | null) => void;
  activeFilter: string | null;
  refreshTrigger?: number;
}

export const CodePanel: React.FC<CodePanelProps> = ({ projectId, onFilterChange, activeFilter, refreshTrigger }) => {
  const [codes, setCodes] = useState<ProjectCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoModal, setMemoModal] = useState<{ open: boolean; codeName: string; color: string }>({
    open: false, codeName: '', color: '#4A6CF7'
  });

  useEffect(() => {
    const fetchCodes = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/codes/project/${projectId}`);
        if (res.data.success) {
          setCodes(res.data.codes);
        }
      } catch (err) {
        console.error('Erreur chargement codes projet', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, [projectId, refreshTrigger]);

  if (loading) return <p style={{ fontSize: '13px', color: '#666' }}>Chargement des codes...</p>;
  if (codes.length === 0) return <p style={{ fontSize: '13px', color: '#666' }}>Aucun code pour ce projet. Sélectionnez du texte pour en créer.</p>;

  const total = codes.reduce((acc, c) => acc + c.count, 0);

  return (
    <> {/* ✅ FRAGMENT pour englober la div et la modale */}
      <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
            🏷️ Codes du projet ({codes.length})
          </h4>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {total} segment{total > 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() => onFilterChange(null)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: activeFilter === null ? 'bold' : 'normal',
              backgroundColor: activeFilter === null ? '#4A6CF7' : '#e5e7eb',
              color: activeFilter === null ? 'white' : '#374151',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
          >
            Tous
          </button>
          
          {codes.map((code) => (
            /* ✅ ON ENVELOPPE LES DEUX BOUTONS DANS UNE DIV FLEX */
            <div key={code.name} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => onFilterChange(code.name)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: activeFilter === code.name ? 'bold' : 'normal',
                  backgroundColor: activeFilter === code.name ? code.color : `${code.color}20`,
                  color: activeFilter === code.name ? 'white' : '#374151',
                  border: `1px solid ${code.color}`,
                  borderRight: 'none', // ✅ Collé au bouton 📝
                  borderRadius: '20px 0 0 20px', // ✅ Demi-cercle à gauche
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {code.name}
                <span style={{
                  backgroundColor: activeFilter === code.name ? 'white' : code.color,
                  color: activeFilter === code.name ? code.color : 'white',
                  padding: '0 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}>
                  {code.count}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMemoModal({ open: true, codeName: code.name, color: code.color });
                }}
                title="Voir les notes analytiques"
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#f3f4f6',
                  border: `1px solid ${code.color}`,
                  borderRadius: '0 20px 20px 0', // ✅ Demi-cercle à droite
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📝
              </button>
            </div>
          ))}
        </div>
      </div>

      <CodeMemosModal
        isOpen={memoModal.open}
        onClose={() => setMemoModal({ ...memoModal, open: false })}
        projectId={projectId}
        codeName={memoModal.codeName}
        codeColor={memoModal.color}
      />
    </>
  );
};
