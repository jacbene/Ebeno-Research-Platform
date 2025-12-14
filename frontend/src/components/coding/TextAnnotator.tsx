import React, { useState, useEffect, useRef } from 'react';
import { useCoding } from '../../hooks/useCoding.js';
import { Annotation } from '../../types/coding.js';
import { 
  Highlighter, 
  X, 
  MessageSquare,
  User,
  Calendar,
  Tag
} from 'lucide-react';

interface TextAnnotatorProps {
  documentId: string;
  content: string;
  projectId: string;
}

const TextAnnotator: React.FC<TextAnnotatorProps> = ({ 
  documentId, 
  content, 
  projectId 
}) => {
  const { 
    codes, 
    annotations, 
    loading, 
    fetchCodes, 
    fetchDocumentAnnotations, 
    createAnnotation,
    deleteAnnotation 
  } = useCoding(projectId);
  
  const [selection, setSelection] = useState<{
    text: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);
  
  const [selectedCodeId, setSelectedCodeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCodes();
    fetchDocumentAnnotations(documentId);
  }, [fetchCodes, fetchDocumentAnnotations, documentId]);

  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Trouver la position dans le contenu
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(contentRef.current!);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const startIndex = preSelectionRange.toString().length;
    const endIndex = startIndex + selectedText.length;

    setSelection({
      text: selectedText,
      startIndex,
      endIndex,
    });
    setShowAnnotationForm(true);
  };

  const handleCreateAnnotation = async () => {
    if (!selection || !selectedCodeId) return;

    const result = await createAnnotation({
      codeId: selectedCodeId,
      documentId,
      startIndex: selection.startIndex,
      endIndex: selection.endIndex,
      selectedText: selection.text,
      notes,
    });

    if (result.success) {
      setSelection(null);
      setSelectedCodeId('');
      setNotes('');
      setShowAnnotationForm(false);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (window.confirm('Supprimer cette annotation ?')) {
      await deleteAnnotation(annotationId);
    }
  };

  const renderAnnotatedText = () => {
    if (!content || !annotationsVisible) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Trier les annotations par position
    const sortedAnnotations = [...annotations].sort((a, b) => a.startIndex - b.startIndex);
    
    const parts: ({ text: string; isAnnotation: boolean; annotation?: Annotation })[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation) => {
      // Texte avant l'annotation
      if (annotation.startIndex > lastIndex) {
        parts.push({
          text: content.substring(lastIndex, annotation.startIndex),
          isAnnotation: false,
        });
      }

      // Texte de l'annotation
      parts.push({
        text: annotation.selectedText,
        isAnnotation: true,
        annotation,
      });

      lastIndex = annotation.endIndex;
    });

    // Texte restant après la dernière annotation
    if (lastIndex < content.length) {
      parts.push({
        text: content.substring(lastIndex),
        isAnnotation: false,
      });
    }

    return parts.map((part, index) => {
      if (!part.isAnnotation) {
        return (
          <span key={index} className="relative">
            {part.text}
          </span>
        );
      }

      const code = codes.find(c => c.id === part.annotation!.codeId);
      if (!code) return part.text;

      return (
        <span
          key={index}
          className="relative cursor-pointer"
          onMouseEnter={() => setActiveAnnotation(part.annotation!)}
          onMouseLeave={() => setActiveAnnotation(null)}
        >
          <span
            className="rounded px-1 py-0.5 border-b-2 transition-all duration-200 hover:shadow-sm"
            style={{
              backgroundColor: `${code.color}20`,
              borderBottomColor: code.color,
            }}
          >
            {part.text}
          </span>
          
          {/* Tooltip d'annotation */}
          {activeAnnotation?.id === part.annotation!.id && (
            <div className="absolute z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 -translate-x-1/2 left-1/2 mt-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: code.color }}
                  />
                  <span className="font-medium text-gray-900">
                    {code.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteAnnotation(part.annotation!.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {part.annotation!.notes && (
                <div className="mb-3">
                  <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>Notes</span>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {part.annotation!.notes}
                  </p>
                </div>
              )}
              
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>
                    {part.annotation!.user.profile.firstName}{' '}
                    {part.annotation!.user.profile.lastName}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(part.annotation!.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Annotateur de texte</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={annotationsVisible}
              onChange={(e) => setAnnotationsVisible(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-600">Afficher les annotations</span>
          </label>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Highlighter className="h-4 w-4" />
          <span>Sélectionnez du texte pour annoter</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau latéral pour les codes */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
            <h4 className="font-medium text-gray-900 mb-3">Codes disponibles</h4>
            
            {codes.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Tag className="h-8 w-8 mx-auto mb-2" />
                <p>Aucun code créé</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {codes.map(code => (
                  <div
                    key={code.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedCodeId === code.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCodeId(code.id)}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: code.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{code.name}</div>
                      {code.description && (
                        <div className="text-xs text-gray-600">{code.description}</div>
                      )}
                    </div>
                    {code._count && (
                      <div className="text-xs text-gray-500">
                        {code._count.annotations}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone de texte annotable */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6">
              <div
                ref={contentRef}
                className="prose max-w-none min-h-[400px] p-4 border border-gray-300 rounded-lg cursor-text selection:bg-blue-200"
                onMouseUp={handleTextSelect}
              >
                {renderAnnotatedText()}
              </div>
            </div>

            {/* Statistiques */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Tag className="h-4 w-4" />
                    <span>{annotations.length} annotations</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Highlighter className="h-4 w-4" />
                    <span>{codes.length} codes disponibles</span>
                  </div>
                </div>
                <div className="text-xs">
                  Sélectionnez du texte pour annoter
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire d'annotation (modal) */}
      {showAnnotationForm && selection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Créer une annotation
                </h3>
                <button
                  onClick={() => {
                    setShowAnnotationForm(false);
                    setSelection(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Texte sélectionné</div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  "{selection.text}"
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <select
                    value={selectedCodeId}
                    onChange={(e) => setSelectedCodeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Sélectionnez un code</option>
                    {codes.map(code => (
                      <option key={code.id} value={code.id}>
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: code.color }}
                          />
                          {code.name}
                        </div>
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Ajoutez des notes sur cette annotation..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateAnnotation}
                    disabled={!selectedCodeId}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter l'annotation
                  </button>
                  <button
                    onClick={() => {
                      setShowAnnotationForm(false);
                      setSelection(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextAnnotator;
