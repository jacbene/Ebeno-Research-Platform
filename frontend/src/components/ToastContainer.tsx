// frontend/src/components/ToastContainer.tsx
import React from 'react';
import { useToast, Toast } from '../context/ToastContext';

const typeStyles: Record<string, { bg: string; border: string; icon: string; color: string }> = {
  info: { bg: '#e6f0ff', border: '#0052cc', icon: 'ℹ️', color: '#0052cc' },
  success: { bg: '#e6f7eb', border: '#28a745', icon: '✅', color: '#155724' },
  warning: { bg: '#fff3cd', border: '#ffc107', icon: '⚠️', color: '#856404' },
  error: { bg: '#fdecea', border: '#dc3545', icon: '❌', color: '#721c24' },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const style = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: style.bg,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: '6px',
              padding: '12px 14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: style.color }}>
                {toast.title}
              </div>
              {toast.message && (
                <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#999',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
