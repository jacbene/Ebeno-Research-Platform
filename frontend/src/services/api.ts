import axios, { InternalAxiosRequestConfig } from 'axios';
import { Document, ProjectData } from '../types/project';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock data, replace with actual API calls
const mockDocuments: Document[] = [
  { id: '1', name: 'Interview 1', content: 'This is the content of interview 1.' },
  { id: '2', name: 'Interview 2', content: 'This is the content of interview 2.' },
  { id: '3', name: 'Observation Notes', content: 'These are the observation notes.' },
];

const mockProjectData: ProjectData = {
  id: '1',
  name: 'My Qualitative Study',
  // other properties
};

export const getProjectDocuments = async (projectId: string): Promise<Document[]> => {
  console.log(`Fetching documents for project ${projectId}`);
  // In a real app, you would make an API call:
  // const response = await api.get(`/projects/${projectId}/documents`);
  // return response.data;
  return new Promise(resolve => setTimeout(() => resolve(mockDocuments), 500));
};

export const getProjectData = async (projectId: string): Promise<ProjectData> => {
  console.log(`Fetching data for project ${projectId}`);
  // In a real app, you would make an API call:
  // const response = await api.get(`/projects/${projectId}`);
  // return response.data;
  return new Promise(resolve => setTimeout(() => resolve(mockProjectData), 500));
};
