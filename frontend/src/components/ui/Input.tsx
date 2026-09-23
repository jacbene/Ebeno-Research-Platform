import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, type, style, ...props }) => {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

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

      <div style={{ position: 'relative' }}>
        <input
          type={effectiveType}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            paddingRight: isPassword ? '42px' : theme.spacing.md,
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

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={{
              position: 'absolute',
              top: '50%',
              right: '10px',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
              color: colors.gray[500],
              opacity: 0.7,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>

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
