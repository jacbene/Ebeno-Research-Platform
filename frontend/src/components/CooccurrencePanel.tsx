// frontend/src/components/CooccurrencePanel.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface CooccurrencePanelProps {
  projectId: string;
  refreshTrigger?: number;
}

export const CooccurrencePanel: React.FC<CooccurrencePanelProps> = ({ projectId, refreshTrigger }) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/codes/cooccurrence/${projectId}`);
        if (res.data.success) {
          setCodes(res.data.codes);
          setMatrix(res.data.matrix);
        }
      } catch (err) {
        console.error('Erreur chargement co-occurrence', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, [projectId, refreshTrigger]);

  if (loading) return <p style={{ fontSize: '13px', color: '#666' }}>Chargement de la matrice...</p>;
  if (codes.length < 2) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
        Il faut au moins 2 codes pour voir une matrice de co-occurrence.
      </div>
    );
  }

  // Trouver la valeur maximale pour normaliser les couleurs
  let maxVal = 1;
  codes.forEach(a => codes.forEach(b => {
    if (matrix[a]?.[b] > maxVal) maxVal = matrix[a][b];
  }));

  const getCellColor = (value: number) => {
    if (value === 0) return '#f3f4f6';
    const intensity = value / maxVal;
    // Dégradé de jaune clair à orange foncé
    return `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`;
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>
          🔗 Matrice de co-occurrence
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
          Nombre de documents où les deux codes apparaissent ensemble.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '11px', textAlign: 'left' }}>
                Code
              </th>
              {codes.map(code => (
                <th key={code} style={{
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  fontSize: '11px',
                  textAlign: 'center',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  height: '100px',
                }}>
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map(rowCode => (
              <tr key={rowCode}>
                <td style={{
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  backgroundColor: '#f9fafb',
                  whiteSpace: 'nowrap',
                }}>
                  {rowCode}
                </td>
                {codes.map(colCode => {
                  const value = matrix[rowCode]?.[colCode] || 0;
                  return (
                    <td key={colCode} style={{
                      padding: '8px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
                      fontSize: '12px',
                      backgroundColor: getCellColor(value),
                      color: value > maxVal * 0.6 ? 'white' : '#374151',
                      fontWeight: value > 0 ? 'bold' : 'normal',
                      minWidth: '40px',
                    }}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
        💡 Plus la case est foncée, plus les deux codes sont fortement liés dans le projet.
      </p>
    </div>
  );
};
