import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { colors } = useTheme();

  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: theme.spacing.xs,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: colors.gray[700],
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${error ? colors.danger : colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.md,
          outline: 'none',
          transition: 'border-color 0.2s ease',
          backgroundColor: colors.white,
          color: colors.dark,
          ...style,
        }}
        {...props}
      />
      {error && (
        <p style={{
          marginTop: theme.spacing.xs,
          fontSize: theme.typography.fontSize.xs,
          color: colors.danger,
        }}>
          {error}
        </p>
      )}
    </div>
  );
};
