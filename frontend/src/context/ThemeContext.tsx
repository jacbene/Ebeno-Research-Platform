// frontend/src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Palette light
const lightColors = {
  primary: '#4A6CF7',
  primaryDark: '#3651B5',
  primaryLight: '#6B8AFF',
  secondary: '#6C757D',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  dark: '#1A1A2E',
  light: '#F8F9FA',
  white: '#FFFFFF',
  body: '#F0F2F5',
  surface: '#FFFFFF',
  border: '#DEE2E6',
  gray: {
    50: '#FAFBFC',
    100: '#F7F8FA',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
};

// Palette dark
const darkColors = {
  primary: '#6B8AFF',
  primaryDark: '#4A6CF7',
  primaryLight: '#8AA9FF',
  secondary: '#ADB5BD',
  success: '#34D058',
  danger: '#F85149',
  warning: '#FFC107',
  info: '#17A2B8',
  dark: '#F8F9FA',
  light: '#1A1A2E',
  white: '#2D2D44',
  body: '#0F0F1E',
  surface: '#1E1E32',
  border: '#3D3D5C',
  gray: {
    50: '#1A1A2E',
    100: '#2D2D44',
    200: '#3D3D5C',
    300: '#4D4D74',
    400: '#6D6D8C',
    500: '#8D8DA4',
    600: '#ADADBC',
    700: '#CDCDD4',
    800: '#E5E5E8',
    900: '#F5F5F4',
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;              // mode choisi
  effectiveMode: 'light' | 'dark'; // mode appliqué
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  colors: any;
  customPalette: any;
  setCustomPalette: (palette: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storedMode = (localStorage.getItem('themeMode') as ThemeMode) || 'system';
  const storedPalette = localStorage.getItem('customPalette');

  const [mode, setModeState] = useState<ThemeMode>(storedMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [customPalette, setCustomPalette] = useState(
    storedPalette ? JSON.parse(storedPalette) : null
  );

  // ✅ Écouter les changements de préférence système
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ✅ Déterminer le mode effectif
  const effectiveMode: 'light' | 'dark' =
    mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  // ✅ Appliquer au <html> pour les CSS globaux
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveMode);
    document.documentElement.style.colorScheme = effectiveMode;
  }, [effectiveMode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const toggleMode = () => {
    const next: ThemeMode = effectiveMode === 'light' ? 'dark' : 'light';
    setMode(next);
  };

  const baseColors = effectiveMode === 'light' ? lightColors : darkColors;
  const colors = customPalette ? { ...baseColors, ...customPalette } : baseColors;

  return (
    <ThemeContext.Provider
      value={{ mode, effectiveMode, toggleMode, setMode, colors, customPalette, setCustomPalette }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
