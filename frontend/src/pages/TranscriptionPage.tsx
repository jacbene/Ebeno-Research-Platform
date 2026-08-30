import React, { useState, useEffect } from 'react';

const TranscriptionPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [transcriptions, setTranscriptions] = useState([]);


// Fonction pour charger les transcriptions
const fetchTranscriptions = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('http://localhost:5001/api/transcriptions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.success) {
    setTranscriptions(data.data.transcriptions || []);
  }
};

// Appeler fetchTranscriptions au chargement de la page
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5001/api/transcriptions/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      
      // Afficher la réponse complète pour déboguer
      console.log('Réponse du backend:', data);

      if (response.ok) {
        const transcriptionId = data.data?.transcriptionId || data.transcriptionId || 'ID inconnu';
        setMessage(`✅ Transcription réussie ! ID: ${transcriptionId}`);
      } else {
        setMessage(`❌ Erreur: ${data.message || data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur fetch:', error);
      setMessage('❌ Erreur de connexion au serveur');
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
