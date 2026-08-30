import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SettingsPage: React.FC = () => {
  const { mode, toggleMode, colors, setCustomPalette } = useTheme();
  const [primaryColor, setPrimaryColor] = useState(colors.primary);
  const [primaryDark, setPrimaryDark] = useState(colors.primaryDark);
  const [primaryLight, setPrimaryLight] = useState(colors.primaryLight);

  const applyCustomPalette = () => {
    const palette = {
      primary: primaryColor,
      primaryDark,
      primaryLight,
    };
    setCustomPalette(palette);
    localStorage.setItem('customPalette', JSON.stringify(palette));
  };

  const resetPalette = () => {
    setCustomPalette(null);
    localStorage.removeItem('customPalette');
    setPrimaryColor('#4A6CF7');
    setPrimaryDark('#3651B5');
    setPrimaryLight('#6B8AFF');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>⚙️ Paramètres</h1>

      <Card title="🎨 Apparence">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span>Mode {mode === 'light' ? '☀️ Clair' : '🌙 Sombre'}</span>
          <button
            onClick={toggleMode}
            style={{
              padding: '8px 16px',
              backgroundColor: mode === 'light' ? '#333' : '#f0f0f0',
              color: mode === 'light' ? 'white' : '#333',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {mode === 'light' ? 'Activer le sombre' : 'Activer le clair'}
          </button>
        </div>

        <h4 style={{ marginTop: '20px' }}>Couleurs personnalisées</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label>Primaire</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label>Primaire sombre</label>
            <input
              type="color"
              value={primaryDark}
              onChange={(e) => setPrimaryDark(e.target.value)}
              style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label>Primaire clair</label>
            <input
              type="color"
              value={primaryLight}
              onChange={(e) => setPrimaryLight(e.target.value)}
              style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="primary" onClick={applyCustomPalette}>Appliquer</Button>
          <Button variant="outline" onClick={resetPalette}>Réinitialiser</Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
