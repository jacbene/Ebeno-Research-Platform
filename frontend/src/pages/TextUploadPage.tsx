// frontend/src/pages/TextUploadPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const TextUploadPage: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const projectId = searchParams.get('projectId') || '';

  useEffect(() => {
    if (!projectId) {
      setError(t('textUpload.errors.noProject'));
    }
  }, [projectId, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!projectId) {
      setError(t('textUpload.errors.noProjectShort'));
      return;
    }

    setUploading(true);
    setMessage(t('textUpload.uploading'));
    setError('');

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);

    try {
      const response = await api.post('/texts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setMessage(t('textUpload.success'));
        setFile(null);

        setTimeout(() => {
          navigate(`/project/${encodeURIComponent(projectId)}`);
        }, 1500);
      } else {
        setError(t('textUpload.errors.serverError', { message: response.data.message }));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('textUpload.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{t('textUpload.title')}</h1>

      {projectId && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <p style={{ margin: 0, fontSize: '13px', color: colors.gray[600] }}>
            {t('textUpload.targetProject')}{' '}
            <code style={{
              backgroundColor: colors.gray[100],
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {projectId}
            </code>
          </p>
        </Card>
      )}

      <p>
        {t('textUpload.supportedFormats')} : <strong>.txt</strong>, <strong>.pdf</strong>, <strong>.docx</strong>
      </p>

      <input
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
        disabled={uploading || !projectId}
        style={{ marginBottom: '12px', display: 'block' }}
      />

      <Button
        variant="primary"
        onClick={handleUpload}
        disabled={!file || uploading || !projectId}
        style={{ padding: '10px 24px' }}
      >
        {uploading ? t('textUpload.uploading') : t('textUpload.submit')}
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        style={{ marginLeft: '12px', padding: '10px 24px' }}
      >
        {t('textUpload.back')}
      </Button>

      {message && (
        <p style={{ marginTop: '16px', color: '#28a745' }}>{message}</p>
      )}
      {error && (
        <p style={{ marginTop: '16px', color: '#dc3545' }}>{error}</p>
      )}
    </div>
  );
};

export default TextUploadPage;
