import React, { useState } from 'react';
import { api } from '../services/api';

const TextUploadPage: React.FC = () => {
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
    setMessage('Upload en cours...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/texts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setMessage(`✅ Texte importé avec succès ! ID: ${response.data.data.transcriptionId}`);
        setFile(null);
      } else {
        setMessage(`❌ Erreur: ${response.data.message}`);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || '❌ Erreur de connexion au serveur');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>📄 Importer un texte</h1>
      <p>Formats supportés : <strong>.txt</strong>, <strong>.pdf</strong>, <strong>.docx</strong></p>
      <input
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
        disabled={uploading}
        style={{ marginBottom: '12px' }}
      />
      <br />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          padding: '10px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? 'Upload en cours...' : 'Importer le texte'}
      </button>
      {message && <p style={{ marginTop: '16px' }}>{message}</p>}
    </div>
  );
};

export default TextUploadPage;
