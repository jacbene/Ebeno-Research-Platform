import React, { useState, useEffect } from 'react';
import { useCoding } from '../../hooks/useCoding.js';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  FolderTree
} from 'lucide-react';

interface CodeManagerProps {
  projectId: string;
}

const CodeManager: React.FC<CodeManagerProps> = ({ projectId }) => {
  const { 
    codes, 
    loading, 
    error, 
    fetchCodes, 
    createCode, 
    updateCode, 
    deleteCode 
  } = useCoding(projectId);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [newCode, setNewCode] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    parentId: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    parentId: '',
  });

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const toggleExpand = (codeId: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(codeId)) {
      newExpanded.delete(codeId);
    } else {
      newExpanded.add(codeId);
    }
    setExpandedCodes(newExpanded);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createCode(newCode);
    if (result.success) {
      setNewCode({
        name: '',
        description: '',
        color: '#3b82f6',
        parentId: '',
      });
      setShowCreateForm(false);
    }
  };

  const handleUpdateCode = async (codeId: string) => {
    const result = await updateCode(codeId, editForm);
    if (result.success) {
      setEditingCodeId(null);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
      await deleteCode(codeId);
    }
  };

  const renderCodeTree = (parentId: string | null = null, level = 0) => {
    const childCodes = codes.filter(code => code.parentId === parentId);
    
    return childCodes.map(code => {
      const hasChildren = codes.some(c => c.parentId === code.id);
      const isExpanded = expandedCodes.has(code.id);

      return (
        <div key={code.id} className="ml-4">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleExpand(code.id)}
                className="text-gray-400 hover:text-gray-600"
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <div className="w-4" />
                )}
              </button>

              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: code.color }}
              />

              <div>
                <div className="font-medium text-gray-900">{code.name}</div>
                {code.description && (
                  <div className="text-sm text-gray-600">{code.description}</div>
                )}
                {code._count && (
                  <div className="text-xs text-gray-500">
                    {code._count.annotations} annotations
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditingCodeId(code.id);
                  setEditForm({
                    name: code.name,
                    description: code.description || '',
                    color: code.color,
                    parentId: code.parentId || '',
                  });
                }}
                className="p-1 text-gray-400 hover:text-blue-600"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteCode(code.id)}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Édition en place */}
          {editingCodeId === code.id && (
            <div className="ml-8 p-4 bg-blue-50 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Couleur
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{editForm.color}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateCode(code.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditingCodeId(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enfants */}
          {isExpanded && hasChildren && (
            <div className="ml-4 border-l-2 border-gray-200 pl-4">
              {renderCodeTree(code.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading && codes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des codes...</div>
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
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Codes d'analyse</h2>
          <p className="text-gray-600">
            Créez et gérez vos codes pour analyser vos données
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau code</span>
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Créer un nouveau code
          </h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newCode.name}
                  onChange={(e) => setNewCode(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code parent
                </label>
                <select
                  value={newCode.parentId}
                  onChange={(e) => setNewCode(prev => ({ ...prev, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Aucun (code racine)</option>
                  {codes.map(code => (
                    <option key={code.id} value={code.id}>
                      {code.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newCode.description}
                onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={newCode.color}
                  onChange={(e) => setNewCode(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <div className="flex space-x-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCode(prev => ({ ...prev, color }))}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer le code
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des codes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-2">
            <FolderTree className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900">
              {codes.length} codes créés
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {codes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun code créé
              </h3>
              <p className="text-gray-600 mb-4">
                Commencez par créer votre premier code d'analyse
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Créer un code</span>
              </button>
            </div>
          ) : (
            renderCodeTree()
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeManager;