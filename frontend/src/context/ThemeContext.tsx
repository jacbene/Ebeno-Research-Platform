import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Palette de couleurs par défaut (light)
const defaultColors = {
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
  gray: {
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

// Palette pour le mode sombre
const darkColors = {
  primary: '#6B8AFF',
  primaryDark: '#4A6CF7',
  primaryLight: '#8AA9FF',
  secondary: '#ADB5BD',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  dark: '#F8F9FA',
  light: '#1A1A2E',
  white: '#2D2D44',
  gray: {
    100: '#2D2D44',
    200: '#3D3D5C',
    300: '#4D4D74',
    400: '#6D6D8C',
    500: '#8D8DA4',
    600: '#ADADBC',
    700: '#CDCDD4',
    800: '#EDEDEC',
    900: '#F5F5F4',
  },
};

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  colors: any;
  customPalette: any;
  setCustomPalette: (palette: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Charger depuis localStorage
  const storedMode = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
  const storedPalette = localStorage.getItem('customPalette');

  const [mode, setMode] = useState<'light' | 'dark'>(storedMode || 'light');
  const [customPalette, setCustomPalette] = useState(
    storedPalette ? JSON.parse(storedPalette) : null
  );

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const colors = customPalette
    ? { ...(mode === 'light' ? defaultColors : darkColors), ...customPalette }
    : mode === 'light'
    ? defaultColors
    : darkColors;

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, colors, customPalette, setCustomPalette }}>
      {children}
    </ThemeContext.Provider>
  );
};
