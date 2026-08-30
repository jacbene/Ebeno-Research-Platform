import React, { useState, useEffect } from 'react';

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploaded_at: number;
}

interface FileListProps {
  projectId: string;
  onRefresh: () => void;
}

const getFileIcon = (mimeType: string, fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf' || ext === 'pdf') return '📄';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') return '📝';
  if (mimeType === 'text/plain' || ext === 'txt') return '📃';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('video/')) return '🎬';
  return '📎';
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export const FileList: React.FC<FileListProps> = ({ projectId, onRefresh }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, FileItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${projectId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setGrouped(data.grouped || {});
      }
    } catch (error) {
      console.error('Erreur chargement fichiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`http://localhost:5001/api/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchFiles();
      onRefresh();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  if (loading) return <p>Chargement des fichiers...</p>;

  if (files.length === 0) {
    return <p style={{ color: '#999' }}>Aucun fichier dans ce projet.</p>;
  }

  const sortedExtensions = Object.keys(grouped).sort();

  return (
    <div>
      {sortedExtensions.map(ext => (
        <div key={ext} style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', color: '#555' }}>{ext}</h4>
          {grouped[ext].map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #eee'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{getFileIcon(file.mimeType, file.fileName)}</span>
                <span>{file.fileName}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>{formatFileSize(file.fileSize)}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <a href={`http://localhost:5001/${file.filePath}`} download style={{ marginRight: '8px', textDecoration: 'none', color: '#007bff' }}>⬇️</a>
                <button onClick={() => deleteFile(file.id)} style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
