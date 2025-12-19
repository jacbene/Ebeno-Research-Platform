export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  discipline: string;
}

export interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: number;
  type: 'article' | 'book' | 'chapter' | 'other';
  publication?: string;
  volume?: number;
  issue?: number;
  pages?: string;
  doi?: string;
  file?: string; // Path to the attached PDF
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  references: Reference[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  content: string;
}

export interface ProjectData {
  id: string;
  name: string;
}
