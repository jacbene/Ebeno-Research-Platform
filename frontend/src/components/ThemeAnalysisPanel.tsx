// frontend/src/components/ThemeAnalysisPanel.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ProjectCode {
  name: string;
  color: string;
  count: number;
  segments: any[];
}

interface ThemeAnalysisPanelProps {
  projectId: string;
  refreshTrigger?: number;
}

export const ThemeAnalysisPanel: React.FC<ThemeAnalysisPanelProps> = ({ projectId, refreshTrigger }) => {
  const [codes, setCodes] = useState<ProjectCode[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchCodes = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/codes/project/${projectId}`);
        if (res.data.success) {
          setCodes(res.data.codes);
        }
      } catch (err) {
        console.error('Erreur chargement codes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, [projectId, refreshTrigger]);

  if (loading) return <p style={{ padding: '20px', color: '#666' }}>Chargement des données...</p>;
  if (codes.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <p>Aucun code pour ce projet.</p>
        <p style={{ fontSize: '13px' }}>Commencez par coder du texte dans l'onglet "Transcriptions IA".</p>
      </div>
    );
  }

  const total = codes.reduce((acc, c) => acc + c.count, 0);
  const maxCount = Math.max(...codes.map(c => c.count));

  // ✅ Export CSV
  const handleExportCSV = () => {
    let csv = "Code,Fréquence,Pourcentage\n";
    codes.forEach(c => {
      const percent = ((c.count / total) * 100).toFixed(1);
      csv += `"${c.name}",${c.count},${percent}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analyse_codes_${projectId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.addToast({ type: 'success', title: 'Export CSV téléchargé' });
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>
            📊 Fréquence des codes
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            {codes.length} codes • {total} segments au total
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '8px 14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {codes.map((code) => {
          const percent = (code.count / maxCount) * 100;
          return (
            <div key={code.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  {code.name}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {code.count} segment{code.count > 1 ? 's' : ''} ({((code.count / total) * 100).toFixed(1)}%)
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: code.color,
                  borderRadius: '8px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
