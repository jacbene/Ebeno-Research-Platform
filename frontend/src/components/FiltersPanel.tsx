import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';

interface Filters {
  type: 'all' | 'audio' | 'text' | 'memo' | 'file';
  status: 'all' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fromDate: string;
  toDate: string;
}

interface FiltersPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onReset: () => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ filters, onFilterChange, onReset }) => {
  const { colors } = useTheme();

  const handleChange = (key: keyof Filters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div style={{
      padding: theme.spacing.md,
      backgroundColor: colors.gray[100],
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
      border: `1px solid ${colors.gray[200]}`,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: 'bold' }}>Type :</label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: theme.borderRadius.sm, border: `1px solid ${colors.gray[300]}` }}
          >
            <option value="all">Tous</option>
            <option value="audio">Audio</option>
            <option value="text">Texte</option>
            <option value="memo">Memo</option>
            <option value="file">Fichier</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: 'bold' }}>Statut :</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: theme.borderRadius.sm, border: `1px solid ${colors.gray[300]}` }}
          >
            <option value="all">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="PROCESSING">En cours</option>
            <option value="COMPLETED">Terminé</option>
            <option value="FAILED">Échec</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: 'bold' }}>Du :</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => handleChange('fromDate', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: theme.borderRadius.sm, border: `1px solid ${colors.gray[300]}` }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <label style={{ fontSize: theme.typography.fontSize.sm, fontWeight: 'bold' }}>Au :</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => handleChange('toDate', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: theme.borderRadius.sm, border: `1px solid ${colors.gray[300]}` }}
          />
        </div>

        <button
          onClick={onReset}
          style={{
            padding: '4px 12px',
            backgroundColor: colors.danger,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.sm,
            cursor: 'pointer',
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
};
