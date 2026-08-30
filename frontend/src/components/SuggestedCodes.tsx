import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface SuggestedCode {
  id: string;
  code: string;
  frequency: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SuggestedCodesProps {
  projectId: string;
}

export const SuggestedCodes: React.FC<SuggestedCodesProps> = ({ projectId }) => {
  const { colors } = useTheme();
  const [codes, setCodes] = useState<SuggestedCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/codes/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCodes(data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/codes/suggest/${projectId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        await fetchCodes();
      }
    } catch (error) {
      console.error('Erreur génération suggestions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (codeId: string, status: 'accepted' | 'rejected') => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`http://localhost:5001/api/codes/${codeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      await fetchCodes();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [projectId]);

  const pendingCodes = codes.filter(c => c.status === 'pending');
  const acceptedCodes = codes.filter(c => c.status === 'accepted');
  const rejectedCodes = codes.filter(c => c.status === 'rejected');

  return (
    <div style={{ marginTop: theme.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, color: colors.dark }}>
          🏷️ Codes suggérés
        </h3>
        <Button variant="primary" size="sm" onClick={generateSuggestions} disabled={generating}>
          {generating ? '⏳ Génération...' : '🔄 Générer des suggestions'}
        </Button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          {pendingCodes.length === 0 && acceptedCodes.length === 0 && rejectedCodes.length === 0 ? (
            <p style={{ color: colors.gray[500] }}>
              Aucun code suggéré. Cliquez sur "Générer des suggestions" pour analyser les documents du projet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {/* Codes en attente */}
              {pendingCodes.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSize.sm, color: colors.gray[600], marginBottom: theme.spacing.xs }}>
                    📌 En attente ({pendingCodes.length})
                  </div>
                  {pendingCodes.map(c => (
                    <div key={c.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: theme.spacing.sm,
                      border: `1px solid ${colors.gray[200]}`,
                      borderRadius: theme.borderRadius.md,
                      marginBottom: theme.spacing.xs,
                      backgroundColor: colors.white,
                    }}>
                      <span>
                        <strong>{c.code}</strong>
                        <span style={{ marginLeft: theme.spacing.sm, fontSize: '12px', color: colors.gray[500] }}>
                          ({c.frequency} occurrences)
                        </span>
                      </span>
                      <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                        <Button size="sm" variant="success" onClick={() => updateStatus(c.id, 'accepted')}>
                          ✅ Accepter
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateStatus(c.id, 'rejected')}>
                          ❌ Rejeter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Codes acceptés */}
              {acceptedCodes.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSize.sm, color: colors.success, marginBottom: theme.spacing.xs }}>
                    ✅ Acceptés ({acceptedCodes.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {acceptedCodes.map(c => (
                      <Badge key={c.id} variant="success">{c.code}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Codes rejetés (optionnel) */}
              {rejectedCodes.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSize.sm, color: colors.danger, marginBottom: theme.spacing.xs }}>
                    ❌ Rejetés ({rejectedCodes.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {rejectedCodes.map(c => (
                      <Badge key={c.id} variant="danger">{c.code}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
