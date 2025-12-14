// pages/SettingsPage.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/users/me/export', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob' // Important pour le téléchargement de fichiers
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ebeno_research_data_export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setError(t('settings.exportError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm(t('settings.deleteConfirmation'))) {
      setIsLoading(true);
      setError(null);
      try {
        await axios.delete('/api/users/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        // Rediriger vers la page de connexion après la suppression
        window.location.href = '/login';
      } catch (error) {
        console.error(error);
        setError(t('settings.deleteError'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>
      {error && <p className="error-message">{error}</p>}

      <div className="settings-section">
        <h2>{t('settings.exportTitle')}</h2>
        <p>{t('settings.exportDescription')}</p>
        <button onClick={handleExportData} disabled={isLoading}>
          {isLoading ? t('loading') : t('settings.exportButton')}
        </button>
      </div>

      <div className="settings-section danger-zone">
        <h2>{t('settings.deleteTitle')}</h2>
        <p>{t('settings.deleteDescription')}</p>
        <button onClick={handleDeleteAccount} className="danger-btn" disabled={isLoading}>
            {isLoading ? t('loading') : t('settings.deleteButton')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
