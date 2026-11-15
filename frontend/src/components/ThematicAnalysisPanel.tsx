// frontend/src/components/ThematicAnalysisPanel.tsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface Theme {
  name: string;
  description: string;
  related_codes: string[];
  insight: string;
}

interface ThematicAnalysisPanelProps {
  projectId: string;
}

export const ThematicAnalysisPanel: React.FC<ThematicAnalysisPanelProps> = ({ projectId }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const toast = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setHasGenerated(false);
    try {
      const res = await api.post(`/codes/thematic/${projectId}`);
      if (res.data.success && Array.isArray(res.data.themes)) {
        setThemes(res.data.themes);
        setHasGenerated(true);
        toast.addToast({ 
          type: 'success', 
          title: 'Analyse thématique générée !',
          message: `${res.data.themes.length} thème(s) identifié(s)`
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erreur lors de l\'analyse';
      toast.addToast({ type: 'error', title: 'Erreur', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>
            🤖 Analyse thématique par IA
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            L'IA analyse vos codes et notes pour proposer des regroupements thématiques.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.3)',
          }}
        >
          {loading ? '⏳ Analyse en cours...' : hasGenerated ? '🔄 Regénérer' : '✨ Générer les thèmes'}
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ 
            width: '40px', height: '40px', margin: '0 auto 12px',
            border: '3px solid #e5e7eb', borderTop: '3px solid #7c3aed',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '13px' }}>L'IA lit vos codes et notes analytiques...</p>
        </div>
      )}

      {!loading && themes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {themes.map((theme, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderLeft: '4px solid #7c3aed',
                borderRadius: '8px',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#581c87' }}>
                💡 Thème {idx + 1} : {theme.name}
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                {theme.description}
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {theme.related_codes.map((code) => (
                  <span
                    key={code}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#ede9fe',
                      color: '#6d28d9',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    🏷️ {code}
                  </span>
                ))}
              </div>

              <div style={{
                padding: '10px 12px',
                backgroundColor: 'white',
                border: '1px dashed #c4b5fd',
                borderRadius: '6px',
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#4c1d95',
                lineHeight: 1.6,
              }}>
                💬 « {theme.insight} »
              </div>
            </div>
          ))}

          <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>
            ⚠️ Cette analyse est générée par IA et doit être validée par le chercheur.
          </p>
        </div>
      )}

      {!loading && !hasGenerated && themes.length === 0 && (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          color: '#666',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px',
          fontSize: '13px',
        }}>
          <p style={{ margin: 0 }}>Cliquez sur "Générer les thèmes" pour que l'IA analyse vos codes.</p>
        </div>
      )}
    </div>
  );
};
