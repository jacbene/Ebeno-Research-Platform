import React, { useState, useEffect } from 'react';
import { useMemo } from '../../hooks/useMemo';
import { 
  Search, 
  MessageSquare,
  User,
  Calendar,
  Tag,
  FileText,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import MemoEditor from './MemoEditor.js';

interface MemoListProps {
  projectId: string;
}

const MemoList: React.FC<MemoListProps> = ({ projectId }) => {
  const {
    memos, loading, error, fetchProjectMemos, deleteMemo
  } = useMemo(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, code, document, annotation, standalone
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectMemos(searchQuery);
  }, [fetchProjectMemos, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjectMemos(searchQuery);
  };

  const handleDelete = async (memoId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce mémo ?')) {
      await deleteMemo(memoId);
    }
  };

  const filteredMemos = memos.filter(memo => {
    if (filter === 'all') return true;
    if (filter === 'code' && memo.codeId) return true;
    if (filter === 'document' && memo.documentId) return true;
    if (filter === 'transcript' && memo.transcriptId) return true;
    if (filter === 'annotation' && memo.annotationId) return true;
    if (filter === 'standalone' && !memo.codeId && !memo.documentId && !memo.annotationId) return true;
    return false;
  });

  const getMemoIcon = (memo: any) => {
    if (memo.annotationId) return <MessageSquare className="h-4 w-4 text-purple-600" />;
    if (memo.codeId) return <Tag className="h-4 w-4 text-blue-600" />;
    if (memo.documentId) return <FileText className="h-4 w-4 text-green-600" />;
    return <MessageSquare className="h-4 w-4 text-gray-600" />;
  };

  const getMemoTypeLabel = (memo: any) => {
    if (memo.annotationId) return 'Annotation';
    if (memo.codeId) return 'Code';
    if (memo.documentId) return 'Document';
    if (memo.transcriptId) return 'Transcription';
    return 'Standalone';
  };

  if (loading && memos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des mémos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">Erreur : {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec recherche et filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mémos analytiques</h2>
          <p className="text-gray-600">
            {memos.length} mémos créés
          </p>
        </div>

        <div className="flex space-x-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des mémos..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64" />
          </form>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau mémo</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Tous ({memos.length})
        </button>
        <button
          onClick={() => setFilter('code')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'code'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Liés à un code ({memos.filter(m => m.codeId).length})
        </button>
        <button
          onClick={() => setFilter('document')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'document'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Liés à un document ({memos.filter(m => m.documentId).length})
        </button>
        <button
          onClick={() => setFilter('annotation')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'annotation'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Liés à une annotation ({memos.filter(m => m.annotationId).length})
        </button>
        <button
          onClick={() => setFilter('standalone')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'standalone'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Standalone ({memos.filter(m => !m.codeId && !m.documentId && !m.annotationId).length})
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-6">
            <MemoEditor
              projectId={projectId}
              onSave={() => {
                setShowCreateForm(false);
                fetchProjectMemos();
              } }
              onCancel={() => setShowCreateForm(false)} />
          </div>
        </div>
      )}

      {/* Éditeur pour modification */}
      {editingMemoId && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-6">
            <MemoEditor
              projectId={projectId}
              memoId={editingMemoId}
              onSave={() => {
                setEditingMemoId(null);
                fetchProjectMemos();
              } }
              onCancel={() => setEditingMemoId(null)} />
          </div>
        </div>
      )}

      {/* Liste des mémos */}
      <div className="space-y-4">
        {filteredMemos.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucun mémo créé'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Commencez par créer votre premier mémo analytique'}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Créer un mémo</span>
            </button>
          </div>
        ) : (
          filteredMemos.map(memo => (
            <div
              key={memo.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${selectedMemoId === memo.id
                  ? 'border-blue-300 shadow-sm'
                  : 'border-gray-200'}`}
            >
              {/* En-tête du mémo */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getMemoIcon(memo)}
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {getMemoTypeLabel(memo)}
                      </span>
                      {memo.code && (
                        <div className="flex items-center space-x-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: memo.code.color }} />
                          <span className="text-xs text-gray-600">
                            {memo.code.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {memo.title}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>
                          {memo.user.profile.firstName} {memo.user.profile.lastName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(memo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedMemoId(
                        selectedMemoId === memo.id ? null : memo.id
                      )}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingMemoId(memo.id)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(memo.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenu du mémo (déplié) */}
              {selectedMemoId === memo.id && (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {memo.content.length > 500
                        ? `${memo.content.substring(0, 500)}...`
                        : memo.content}
                    </div>

                    {memo.content.length > 500 && (
                      <button
                        onClick={() => window.open(`/memos/${memo.id}`, '_blank')}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Lire la suite →
                      </button>
                    )}

                    {/* Éléments liés */}
                    {(memo.code || memo.document || memo.annotation) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Éléments liés
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {memo.code && (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg">
                              <Tag className="h-3 w-3 text-gray-500" />
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: memo.code.color }} />
                              <span className="text-xs font-medium">
                                Code: {memo.code.name}
                              </span>
                            </div>
                          )}

                          {memo.document && (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg">
                              <FileText className="h-3 w-3 text-gray-500" />
                              <span className="text-xs font-medium">
                                Document: {memo.document.title}
                              </span>
                            </div>
                          )}

                          {memo.annotation && (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg">
                              <MessageSquare className="h-3 w-3 text-gray-500" />
                              <span className="text-xs font-medium">
                                Annotation: {memo.annotation.selectedText.substring(0, 30)}...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MemoList;
