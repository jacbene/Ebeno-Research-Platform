import { 
    Code, 
    Annotation, 
    CreateCodeInput, 
    CreateAnnotationInput,
    CodingStatistics 
  } from '../../types/coding';
import { api } from '../api';
  
  export class CodingApi {
  
    // === CODES ===
    
    static async createCode(projectId: string, data: CreateCodeInput): Promise<{ data?: Code; error?: string }> {
      try {
        const response = await api.post(`/coding/projects/${projectId}/codes`, data);
  
        return { data: response.data };
      } catch (error) {
        console.error('Create code error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getProjectCodes(projectId: string): Promise<{ data?: Code[]; error?: string }> {
      try {
        const response = await api.get(`/coding/projects/${projectId}/codes`);
  
        return { data: response.data };
      } catch (error) {
        console.error('Get codes error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getCodeTree(projectId: string): Promise<{ data?: Code[]; error?: string }> {
      try {
        const response = await api.get(`/coding/projects/${projectId}/codes/tree`);
  
        return { data: response.data };
      } catch (error) {
        console.error('Get code tree error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async updateCode(codeId: string, data: Partial<CreateCodeInput>): Promise<{ data?: Code; error?: string }> {
      try {
        const response = await api.put(`/coding/codes/${codeId}`, data);
  
        return { data: response.data };
      } catch (error) {
        console.error('Update code error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async deleteCode(codeId: string): Promise<{ error?: string }> {
      try {
        await api.delete(`/coding/codes/${codeId}`);
  
        return {};
      } catch (error) {
        console.error('Delete code error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === ANNOTATIONS ===
    
    static async createAnnotation(data: CreateAnnotationInput): Promise<{ data?: Annotation; error?: string }> {
      try {
        const response = await api.post(`/coding/annotations`, data);

        return { data: response.data };
      } catch (error) {
        console.error('Create annotation error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getDocumentAnnotations(documentId: string): Promise<{ data?: Annotation[]; error?: string }> {
      try {
        const response = await api.get(`/coding/documents/${documentId}/annotations`);

        return { data: response.data };
      } catch (error) {
        console.error('Get document annotations error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getTranscriptAnnotations(transcriptId: string): Promise<{ data?: Annotation[]; error?: string }> {
      try {
        const response = await api.get(`/coding/transcripts/${transcriptId}/annotations`);

        return { data: response.data };
      } catch (error) {
        console.error('Get transcript annotations error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getCodeAnnotations(codeId: string): Promise<{ data?: Annotation[]; error?: string }> {
      try {
        const response = await api.get(`/coding/codes/${codeId}/annotations`);

        return { data: response.data };
      } catch (error) {
        console.error('Get code annotations error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async deleteAnnotation(annotationId: string): Promise<{ error?: string }> {
      try {
        await api.delete(`/coding/annotations/${annotationId}`);

        return {};
      } catch (error) {
        console.error('Delete annotation error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === STATISTIQUES ===
    
    static async getCodingStatistics(projectId: string): Promise<{ data?: CodingStatistics; error?: string }> {
      try {
        const response = await api.get(`/coding/projects/${projectId}/coding-statistics`);

        return { data: response.data };
      } catch (error) {
        console.error('Get coding statistics error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === ANALYSE IA ===
    
    static async suggestCodes(projectId: string, text: string): Promise<{ data?: any; error?: string }> {
      try {
        const response = await api.post(`/coding/projects/${projectId}/suggest-codes`, { text });

        return { data: response.data };
      } catch (error) {
        console.error('Suggest codes error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  }
