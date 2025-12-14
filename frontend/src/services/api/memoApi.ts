import { 
    Memo, 
    CreateMemoInput, 
    UpdateMemoInput,
    MemoStatistics 
  } from '../../types/memo';
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  export class MemoApi {
    private static baseUrl = API_BASE_URL;
  
    // === CRUD ===
    
    static async createMemo(data: CreateMemoInput): Promise<{ data?: Memo; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/memos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(data),
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la création du mémo');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Create memo error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getMemos(filter?: any): Promise<{ data?: Memo[]; error?: string }> {
      try {
        const queryParams = new URLSearchParams(filter).toString();
        const url = `${this.baseUrl}/memos/memos${queryParams ? `?${queryParams}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des mémos');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get memos error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getMemo(memoId: string): Promise<{ data?: Memo; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/memos/${memoId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du mémo');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get memo error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async updateMemo(memoId: string, data: UpdateMemoInput): Promise<{ data?: Memo; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/memos/${memoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(data),
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la mise à jour du mémo');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Update memo error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async deleteMemo(memoId: string): Promise<{ error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/memos/${memoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la suppression du mémo');
        }
  
        return {};
      } catch (error) {
        console.error('Delete memo error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === ROUTES PAR PROJET ===
    
    static async getProjectMemos(projectId: string, search?: string): Promise<{ data?: Memo[]; error?: string }> {
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        
        const url = `${this.baseUrl}/memos/projects/${projectId}/memos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des mémos du projet');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get project memos error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async getMemoStatistics(projectId: string): Promise<{ data?: MemoStatistics; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/projects/${projectId}/memos/statistics`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des statistiques');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Get memo statistics error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    static async searchMemos(projectId: string, query: string): Promise<{ data?: Memo[]; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/projects/${projectId}/memos/search?q=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la recherche des mémos');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Search memos error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  
    // === IA ===
    
    static async generateMemoWithAI(projectId: string, context: any): Promise<{ data?: any; error?: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/memos/projects/${projectId}/memos/generate-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ context }),
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la génération du mémo avec IA');
        }
  
        return { data: await response.json() };
      } catch (error) {
        console.error('Generate memo with AI error:', error);
        return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    }
  }
