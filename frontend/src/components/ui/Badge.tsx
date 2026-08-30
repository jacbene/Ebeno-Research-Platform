import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary' }) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary, color: colors.white };
      case 'success':
        return { backgroundColor: colors.success, color: colors.white };
      case 'danger':
        return { backgroundColor: colors.danger, color: colors.white };
      case 'warning':
        return { backgroundColor: colors.warning, color: colors.dark };
      case 'info':
        return { backgroundColor: colors.info, color: colors.white };
      case 'secondary':
        return { backgroundColor: colors.secondary, color: colors.white };
      default:
        return { backgroundColor: colors.primary, color: colors.white };
    }
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.sm,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      ...getVariantStyles(),
    }}>
      {children}
    </span>
  );
};
