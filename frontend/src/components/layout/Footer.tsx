import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export const Footer: React.FC = () => {
  const { colors } = useTheme();

  return (
    <footer style={{
      backgroundColor: colors.dark,
      color: colors.light,
      padding: '24px 20px',
      marginTop: '40px',
      borderTop: `1px solid ${colors.gray?.[700] || '#374151'}`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center',
        fontSize: '13px',
      }}>
        {/* Liens légaux + contact */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '12px',
        }}>
          <Link to="/legal" style={{ color: colors.gray?.[400] || '#9CA3AF', textDecoration: 'none' }}>
            Mentions légales
          </Link>
          <Link to="/cookies" style={{ color: colors.gray?.[400] || '#9CA3AF', textDecoration: 'none' }}>
            Politique cookies
          </Link>
          <Link to="/privacy" style={{ color: colors.gray?.[400] || '#9CA3AF', textDecoration: 'none' }}>
            Confidentialité
          </Link>
          <Link to="/terms" style={{ color: colors.gray?.[400] || '#9CA3AF', textDecoration: 'none' }}>
            CGU
          </Link>
          <Link to="/refunds" style={{ color: colors.gray?.[400] || '#9CA3AF', textDecoration: 'none' }}>
            Remboursement
          </Link>
          {/* ⚠️ Lien Contact mis en évidence pour Paddle */}
          <Link
            to="/contact"
            style={{
              color: colors.light,
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            📧 Contact
          </Link>
        </div>

        {/* Copyright + nom commercial */}
        <p style={{ margin: 0, color: colors.gray?.[500] || '#6B7280' }}>
          © {new Date().getFullYear()} Ebeno Research Platform
        </p>
      </div>
    </footer>
  );
};
