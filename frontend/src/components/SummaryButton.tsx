import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';
import { api } from '../services/api';

interface SummaryButtonProps {
  documentId: string;
  type: 'transcription' | 'memo' | 'file';
  onSummaryGenerated: (summary: string) => void;
  existingSummary?: string | null;
}

export const SummaryButton: React.FC<SummaryButtonProps> = ({
  documentId,
  type,
  onSummaryGenerated,
  existingSummary,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(existingSummary || null);
  const [expanded, setExpanded] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/summaries/${type}/${documentId}`);
      if (response.data.success) {
        setSummary(response.data.summary);
        onSummaryGenerated(response.data.summary);
        setExpanded(true);
      } else {
        alert(response.data.error || 'Erreur lors de la génération du résumé');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    return (
      <Button variant="outline" size="sm" onClick={generateSummary} disabled={loading}>
        {loading ? '⏳ Génération...' : '📝 Résumer'}
      </Button>
    );
  }

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? '🙈 Masquer' : '👁️ Voir le résumé'}
        </Button>
        <Button variant="outline" size="sm" onClick={generateSummary} disabled={loading}>
          {loading ? '⏳...' : '🔄 Régénérer'}
        </Button>
      </div>
      {expanded && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: colors.gray[100],
          borderRadius: '8px',
          border: `1px solid ${colors.gray[200]}`,
          fontSize: '14px',
          lineHeight: '1.6',
          color: colors.dark,
        }}>
          <strong>📋 Résumé :</strong>
          <p style={{ margin: '4px 0 0 0' }}>{summary}</p>
        </div>
      )}
    </div>
  );
};
