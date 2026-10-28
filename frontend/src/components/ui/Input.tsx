import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    // Génère un ID unique si non fourni (pour lier le label et l'input)
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div style={{ marginBottom: '16px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: '#ffffff',
            color: '#111827',
          }}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
