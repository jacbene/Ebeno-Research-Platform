import { api } from './api';

export const transcriptionApi = {
  uploadAudio: async (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }
    return api.post('/transcriptions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getProgress: async (id: string) => {
    return api.get(`/transcriptions/${id}/progress`);
  },
};
