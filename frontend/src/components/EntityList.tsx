import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { api } from '../services/api';

interface EntityListProps {
  projectId: string;
}

const entityColors: Record<string, string> = {
  Person: '#4A6CF7',
  Place: '#28A745',
  Organization: '#FFC107',
  Date: '#17A2B8',
  Email: '#DC3545',
  Phone: '#6C757D',
  Url: '#E83E8C',
};

const entityLabels: Record<string, string> = {
  Person: '👤 Personnes',
  Place: '📍 Lieux',
  Organization: '🏢 Organisations',
  Date: '📅 Dates',
  Email: '✉️ Emails',
  Phone: '📞 Téléphones',
  Url: '🔗 Liens',
};

export const EntityList: React.FC<EntityListProps> = ({ projectId }) => {
  const { colors } = useTheme();
  const [entities, setEntities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/entities/project/${projectId}`);
      if (response.data.success) {
        setEntities(response.data.entities);
      }
    } catch (error) {
      console.error('Erreur chargement entités:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractAllEntities = async () => {
    setExtracting(true);
    try {
      await api.post(`/entities/extract-project/${projectId}`);
      await fetchEntities();
    } catch (error) {
      console.error('Erreur extraction:', error);
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [projectId]);

  const hasEntities = Object.values(entities).some(arr => arr.length > 0);

  return (
    <div style={{ marginTop: theme.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, color: colors.dark }}>
          🏷️ Entités extraites
        </h3>
        <Button variant="primary" size="sm" onClick={extractAllEntities} disabled={extracting}>
          {extracting ? '⏳ Extraction...' : '🔄 Extraire tout'}
        </Button>
      </div>

      {loading ? (
        <p>Chargement des entités...</p>
      ) : !hasEntities ? (
        <p style={{ color: colors.gray[500] }}>Aucune entité extraite. Cliquez sur "Extraire tout" pour analyser les documents.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {Object.entries(entities).map(([type, values]) => {
            if (values.length === 0) return null;
            return (
              <div key={type}>
                <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSize.sm, color: colors.gray[600], marginBottom: theme.spacing.xs }}>
                  {entityLabels[type] || type} ({values.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                  {values.map((value, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        backgroundColor: entityColors[type] || colors.primary,
                        color: colors.white,
                        borderRadius: theme.borderRadius.sm,
                        fontSize: theme.typography.fontSize.xs,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
