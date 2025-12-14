import { useState, useCallback } from 'react';
import { Code, Annotation, CreateCodeInput, CreateAnnotationInput } from '../types/coding';
import { CodingApi } from '../services/api/codingApi';

export const useCoding = (projectId: string) => {
  const [codes, setCodes] = useState<Code[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = async <T>(apiCall: () => Promise<{ data?: T; error?: string }>, onSuccess?: (data: T) => void) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      if (result.data) {
        if (onSuccess) onSuccess(result.data);
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
  };

  // === CODES ===
  const fetchCodes = useCallback(() => handleApiCall(
    () => CodingApi.getProjectCodes(projectId),
    (data) => setCodes(data)
  ), [projectId]);

  const fetchCodeTree = useCallback(() => handleApiCall(
    () => CodingApi.getCodeTree(projectId),
    (data) => setCodes(data) // Assuming tree is also a list of codes
  ), [projectId]);

  const createCode = useCallback((data: CreateCodeInput) => handleApiCall(
    () => CodingApi.createCode(projectId, data),
    (newCode) => setCodes(prev => [...prev, newCode])
  ), [projectId]);

  const updateCode = useCallback((codeId: string, data: Partial<CreateCodeInput>) => handleApiCall(
    () => CodingApi.updateCode(codeId, data),
    (updatedCode) => setCodes(prev => prev.map(code => code.id === codeId ? updatedCode : code))
  ), []);

  const deleteCode = useCallback((codeId: string) => handleApiCall(
    () => CodingApi.deleteCode(codeId),
    () => setCodes(prev => prev.filter(code => code.id !== codeId))
  ), []);

  // === ANNOTATIONS ===
  const fetchDocumentAnnotations = useCallback((documentId: string) => handleApiCall(
    () => CodingApi.getDocumentAnnotations(documentId),
    (data) => setAnnotations(data)
  ), []);

  const createAnnotation = useCallback((data: CreateAnnotationInput) => handleApiCall(
    () => CodingApi.createAnnotation(data),
    (newAnnotation) => setAnnotations(prev => [...prev, newAnnotation])
  ), []);

  const deleteAnnotation = useCallback((annotationId: string) => handleApiCall(
    () => CodingApi.deleteAnnotation(annotationId),
    () => setAnnotations(prev => prev.filter(ann => ann.id !== annotationId))
  ), []);

  // === STATISTIQUES ===
  const fetchStatistics = useCallback(() => 
    handleApiCall(() => CodingApi.getCodingStatistics(projectId)), 
  [projectId]);

  return {
    codes,
    annotations,
    loading,
    error,
    fetchCodes,
    fetchCodeTree,
    createCode,
    updateCode,
    deleteCode,
    fetchDocumentAnnotations,
    createAnnotation,
    deleteAnnotation,
    fetchStatistics,
    getCodeById: useCallback((codeId: string) => 
      codes.find(code => code.id === codeId), [codes]),
    getCodeAnnotations: useCallback((codeId: string) => 
      annotations.filter(ann => ann.codeId === codeId), [annotations]),
    getDocumentAnnotations: useCallback((documentId: string) => 
      annotations.filter(ann => ann.documentId === documentId), [annotations]),
  };
};
