import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const TranscriptionPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [transcriptions, setTranscriptions] = useState([]);

  const fetchTranscriptions = async () => {
    try {
      const response = await api.get('/transcriptions');
      if (response.data.success) {
        setTranscriptions(response.data.data.transcriptions || []);
      }
    } catch (error) {
      console.error('Erreur fetch transcriptions:', error);
    }
  };

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage('Upload en cours...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/transcriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.success) {
        const transcriptionId = response.data.data?.transcriptionId || 'ID inconnu';
        setMessage(`✅ Transcription réussie ! ID: ${transcriptionId}`);
        fetchTranscriptions();
      } else {
        setMessage(`❌ Erreur: ${response.data.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Erreur fetch:', error);
      setMessage(error.response?.data?.message || '❌ Erreur de connexion au serveur');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🎙️ Transcription</h1>
      <p>Sélectionnez un fichier audio et lancez la transcription.</p>
      <input type="file" accept="audio/*" onChange={handleFileChange} disabled={uploading} />
      <br /><br />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? 'Upload en cours...' : 'Transcrire'}
      </button>
      {message && <p style={{ marginTop: '15px' }}>{message}</p>}
    </div>
  );
};

export default TranscriptionPage;
