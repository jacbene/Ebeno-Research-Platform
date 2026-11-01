// frontend/src/pages/TranscriptionPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext'; // ✅ AJOUT
import { useQuotaWarning } from '../hooks/useQuotaWarning'; // ✅ AJOUT

const TranscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast(); // ✅ AJOUT
  const checkQuotaWarning = useQuotaWarning(); // ✅ AJOUT

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage('⏳ Upload en cours...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/transcriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success && response.data.data?.transcriptionId) {
        // ✅ GESTION DES PALIERS DE QUOTA (50/75/95)
        if (response.data.quota) {
          checkQuotaWarning(response.data.quota);
        }

        // ✅ Redirection automatique vers la liste des transcriptions
        const id = response.data.data.transcriptionId;
        navigate(`/transcriptions?highlight=${id}`);
      } else {
        setMessage('✅ Fichier envoyé, transcription en cours...');
      }
    } catch (error: any) {
      // ✅ GESTION DU DÉPASSEMENT DE QUOTA (100%)
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === 'QUOTA_EXCEEDED'
      ) {
        toast.addToast({
          type: 'error',
          title: 'Quota IA épuisé 🚫',
          message: `${
            error.response.data.message || error.response.data.error || 'Quota atteint.'
          } Rendez-vous sur /pricing pour recharger.`,
          duration: 6000,
        });
        setMessage(''); // On n'affiche pas d'erreur inline en rouge
        setUploading(false);
        return;
      }

      // Erreur classique
      const msg = error.response?.data?.message || 'Erreur serveur';
      setMessage(`❌ ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>
      <h1>🎙️ Transcription</h1>
      <p>Sélectionnez un fichier audio et lancez la transcription.</p>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.webm"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {file && <span style={{ marginLeft: '8px', fontSize: '13px' }}>{file.name}</span>}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          backgroundColor: '#4A6CF7',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: uploading ? 'wait' : 'pointer',
          fontSize: '15px',
          fontWeight: 'bold',
          opacity: !file || uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Upload...' : 'Transcrire'}
      </button>

      {message && (
        <p style={{ marginTop: '16px', color: message.startsWith('❌') ? 'red' : 'green' }}>
          {message}
        </p>
      )}

      {/* Petit lien pour accéder à la liste manuellement */}
      <p style={{ marginTop: '24px', fontSize: '13px' }}>
        <a href="/transcriptions" style={{ color: '#4A6CF7' }}>
          → Voir toutes mes transcriptions
        </a>
      </p>
    </div>
  );
};

export default TranscriptionPage;
