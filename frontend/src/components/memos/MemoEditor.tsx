import React, { useState, useEffect } from 'react';
import { useMemo } from '../../hooks/useMemo.js';
import { useCoding } from '../../hooks/useCoding.js';
import { 
  Save, 
  X, 
  Link, 
  Unlink,
  FileText,
  Tag,
  MessageSquare,
  User,
  Calendar,
  Edit3,
  Brain,
  Sparkles
} from 'lucide-react';

interface MemoEditorProps {
  projectId: string;
  memoId?: string;
  initialData?: {
    title?: string;
    content?: string;
    codeId?: string;
    documentId?: string;
    transcriptId?: string;
    annotationId?: string;
  };
  onSave?: (memo: any) => void;
  onCancel?: () => void;
  onDelete?: (memoId: string) => void;
}

const MemoEditor: React.FC<MemoEditorProps> = ({
  projectId,
  memoId,
  initialData,
  onSave,
  onCancel,
  onDelete
}) => {
  const { 
    fetchMemo, 
    createMemo, 
    updateMemo, 
    deleteMemo,
    currentMemo,
    loading 
  } = useMemo(projectId);
  
  const { codes, fetchCodes } = useCoding(projectId);
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [codeId, setCodeId] = useState(initialData?.codeId || '');
  const [documentId, setDocumentId] = useState(initialData?.documentId || '');
  const [transcriptId, setTranscriptId] = useState(initialData?.transcriptId || '');
  const [annotationId, setAnnotationId] = useState(initialData?.annotationId || '');
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(!memoId);

  // Charger le mémo existant si memoId est fourni
  useEffect(() => {
    if (memoId) {
      fetchMemo(memoId);
      setIsEditing(false);
    }
  }, [memoId, fetchMemo]);

  // Charger les codes
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Mettre à jour l'état quand currentMemo change
  useEffect(() => {
    if (currentMemo && memoId) {
      setTitle(currentMemo.title);
      setContent(currentMemo.content);
      setCodeId(currentMemo.codeId || '');
      setDocumentId(currentMemo.documentId || '');
      setTranscriptId(currentMemo.transcriptId || '');
      setAnnotationId(currentMemo.annotationId || '');
    }
  }, [currentMemo, memoId]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Le titre et le contenu sont requis');
      return;
    }

    const memoData = {
      title: title.trim(),
      content: content.trim(),
      projectId,
      codeId: codeId || undefined,
      documentId: documentId || undefined,
      transcriptId: transcriptId || undefined,
      annotationId: annotationId || undefined,
    };

    let result;
    if (memoId) {
      result = await updateMemo(memoId, memoData);
    } else {
      result = await createMemo(memoData);
    }

    if (result.success && onSave) {
      onSave(result.data);
      if (!memoId) {
        // Réinitialiser le formulaire après création
        setTitle('');
        setContent('');
        setCodeId('');
        setDocumentId('');
        setTranscriptId('');
        setAnnotationId('');
      }
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!memoId || !window.confirm('Êtes-vous sûr de vouloir supprimer ce mémo ?')) {
      return;
    }

    const result = await deleteMemo(memoId);
    if (result.success && onDelete) {
      onDelete(memoId);
    }
  };

  const handleGenerateWithAI = async () => {
    // Utiliser l'IA pour générer un contenu basé sur le contexte
    alert('Génération IA à venir - Cette fonctionnalité utilisera DeepSeek');
  };

  const getLinkedItemInfo = () => {
    if (!currentMemo) return null;

    const items = [];
    
    if (currentMemo.code) {
      items.push({
        type: 'code',
        label: 'Code',
        name: currentMemo.code.name,
        color: currentMemo.code.color,
      });
    }

    if (currentMemo.document) {
      items.push({
        type: 'document',
        label: 'Document',
        name: currentMemo.document.title,
      });
    }

    if (currentMemo.annotation) {
      items.push({
        type: 'annotation',
        label: 'Annotation',
        name: currentMemo.annotation.selectedText.substring(0, 50) + '...',
        color: currentMemo.annotation.code?.color,
      });
    }

    return items;
  };

  if (loading && memoId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement du mémo...</div>
      </div>
    );
  }

  const linkedItems = getLinkedItemInfo();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {memoId && !isEditing ? (
            <>
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            </>
          ) : (
            <h2 className="text-xl font-bold text-gray-900">
              {memoId ? 'Modifier le mémo' : 'Nouveau mémo analytique'}
            </h2>
          )}
        </div>

        <div className="flex space-x-2">
          {memoId && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4" />
                <span>Modifier</span>
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </>
          )}
          
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{memoId ? 'Enregistrer' : 'Créer'}</span>
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  <span>Annuler</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Panneau de liens */}
      {showLinkPanel && isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-blue-900">Lier à un élément</h3>
            <button
              onClick={() => setShowLinkPanel(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <select
                value={codeId}
                onChange={(e) => setCodeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Aucun code</option>
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
                Document
              </label>
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Aucun document</option>
                <option value="doc1">Document 1</option>
                <option value="doc2">Document 2</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Éléments liés */}
      {linkedItems && linkedItems.length > 0 && !isEditing && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-2">Éléments liés</h3>
          <div className="flex flex-wrap gap-2">
            {linkedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg"
              >
                {item.type === 'code' && <Tag className="h-4 w-4 text-gray-500" />}
                {item.type === 'document' && <FileText className="h-4 w-4 text-gray-500" />}
                {item.type === 'annotation' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                
                {item.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                
                <span className="text-sm font-medium text-gray-900">
                  {item.label}: {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métadonnées */}
      {currentMemo && !isEditing && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>
                {currentMemo.user.profile.firstName} {currentMemo.user.profile.lastName}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>
                Mis à jour le {new Date(currentMemo.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {!linkedItems?.length && (
            <button
              onClick={() => setShowLinkPanel(true)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              <Link className="h-4 w-4" />
              <span>Lier à un élément</span>
            </button>
          )}
        </div>
      )}

      {/* Éditeur */}
      {isEditing ? (
        <div className="space-y-4">
          {/* Bouton IA */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateWithAI}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90"
            >
              <Brain className="h-4 w-4" />
              <span>Générer avec IA</span>
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-lg font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Titre de votre mémo analytique..."
            />
          </div>

          {/* Bouton pour lier */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowLinkPanel(!showLinkPanel)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              {showLinkPanel ? (
                <>
                  <Unlink className="h-4 w-4" />
                  <span>Masquer les liens</span>
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  <span>Lier à un élément</span>
                </>
              )}
            </button>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenu *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Écrivez votre analyse, réflexions, interprétations..."
            />
          </div>
        </div>
      ) : (
        /* Vue lecture seule */
        <div className="prose max-w-none">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoEditor;