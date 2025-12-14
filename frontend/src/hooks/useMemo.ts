import { useState, useCallback } from 'react';
import { Memo, CreateMemoInput, UpdateMemoInput } from '../types/memo';
import { MemoApi } from '../services/api/memoApi';

export const useMemo = (projectId?: string) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentMemo, setCurrentMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === CRUD ===
  
  const fetchMemos = useCallback(async (filter?: unknown) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.getMemos(filter);
      if (result.data) {
        setMemos(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectMemos = useCallback(async (search?: string) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.getProjectMemos(projectId, search);
      if (result.data) {
        setMemos(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchMemo = useCallback(async (memoId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.getMemo(memoId);
      if (result.data) {
        setCurrentMemo(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMemo = useCallback(async (data: CreateMemoInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.createMemo(data);
      if (result.data) {
        setMemos(prev => [result.data!, ...prev]);
        return { success: true, data: result.data };
      } else if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
    
    return { success: false, error: 'Erreur inconnue' };
  }, []);

  const updateMemo = useCallback(async (memoId: string, data: UpdateMemoInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.updateMemo(memoId, data);
      if (result.data) {
        setMemos(prev => prev.map(memo => 
          memo.id === memoId ? { ...memo, ...result.data } : memo
        ));
        if (currentMemo?.id === memoId) {
          setCurrentMemo(result.data);
        }
        return { success: true, data: result.data };
      } else if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
    
    return { success: false, error: 'Erreur inconnue' };
  }, [currentMemo]);

  const deleteMemo = useCallback(async (memoId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.deleteMemo(memoId);
      if (!result.error) {
        setMemos(prev => prev.filter(memo => memo.id !== memoId));
        if (currentMemo?.id === memoId) {
          setCurrentMemo(null);
        }
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [currentMemo]);

  // === STATISTIQUES ===
  
  const fetchStatistics = useCallback(async () => {
    if (!projectId) return { error: 'Project ID requis' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.getMemoStatistics(projectId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // === RECHERCHE ===
  
  const searchMemos = useCallback(async (query: string) => {
    if (!projectId) return { error: 'Project ID requis' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.searchMemos(projectId, query);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // === IA ===
  
  const generateWithAI = useCallback(async (context: unknown) => {
    if (!projectId) return { error: 'Project ID requis' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await MemoApi.generateMemoWithAI(projectId, context);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // === HELPERS ===
  
  const getMemoById = useCallback((memoId: string) => 
    memos.find(memo => memo.id === memoId), [memos]);

  const getMemosByCode = useCallback((codeId: string) => 
    memos.filter(memo => memo.codeId === codeId), [memos]);

  const getMemosByDocument = useCallback((documentId: string) => 
    memos.filter(memo => memo.documentId === documentId), [memos]);

  const getMemosByUser = useCallback((userId: string) => 
    memos.filter(memo => memo.userId === userId), [memos]);

  const clearCurrentMemo = useCallback(() => {
    setCurrentMemo(null);
  }, []);

  return {
    memos,
    currentMemo,
    loading,
    error,
    
    // CRUD methods
    fetchMemos,
    fetchProjectMemos,
    fetchMemo,
    createMemo,
    updateMemo,
    deleteMemo,
    
    // Statistics & Search
    fetchStatistics,
    searchMemos,
    
    // AI
    generateWithAI,
    
    // Helpers
    getMemoById,
    getMemosByCode,
    getMemosByDocument,
    getMemosByUser,
    clearCurrentMemo,
    
    // State setters
    setMemos,
    setCurrentMemo,
  };
};
