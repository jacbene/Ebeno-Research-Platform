import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, className, style }) => {
  const { colors } = useTheme();

  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.md,
      padding: theme.spacing.lg,
      ...style,
    }} className={className}>
      {title && (
        <h3 style={{
          margin: `0 0 ${theme.spacing.sm} 0`,
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: colors.dark,
        }}>
          {title}
        </h3>
      )}
      {subtitle && (
        <p style={{
          margin: `0 0 ${theme.spacing.md} 0`,
          fontSize: theme.typography.fontSize.sm,
          color: colors.gray[600],
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
};
