import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  isLoading,
  disabled,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          color: colors.white,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          color: colors.white,
          border: 'none',
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          color: colors.white,
          border: 'none',
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          color: colors.white,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: colors.primary,
          border: `2px solid ${colors.primary}`,
        };
      default:
        return {
          backgroundColor: colors.primary,
          color: colors.white,
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: `${theme.spacing.xs} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.xs };
      case 'lg':
        return { padding: `${theme.spacing.md} ${theme.spacing.xl}`, fontSize: theme.typography.fontSize.lg };
      default:
        return { padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: theme.typography.fontSize.sm };
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      style={{
        borderRadius: theme.borderRadius.md,
        fontWeight: theme.typography.fontWeight.medium,
        cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || isLoading) ? 0.6 : 1,
        transition: 'all 0.2s ease',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {isLoading ? '⏳ Chargement...' : children}
    </button>
  );
};
