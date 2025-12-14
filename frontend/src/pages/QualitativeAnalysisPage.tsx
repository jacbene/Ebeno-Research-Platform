
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Tag, 
  FileText, 
  BarChart3, 
  Settings,
  ArrowLeft,
  Layers,
  Code,
  PieChart
} from 'lucide-react';
import CodeManager from '../components/coding/CodeManager.js';
import TextAnnotator from '../components/coding/TextAnnotator.js';
import CodingDashboard from '../components/coding/CodingDashboard.js';
import './QualitativeAnalysisPage.css';

const QualitativeAnalysisPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'codes' | 'annotate' | 'dashboard' | 'settings'>('codes');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');

  // Simuler la récupération des documents
  const documents = [
    { id: '1', title: 'Entretien avec Participant A', type: 'transcription' },
    { id: '2', title: 'Notes de terrain - Jour 1', type: 'field-notes' },
    { id: '3', title: 'Article de référence', type: 'article' },
  ];

  const loadDocumentContent = (docId: string) => {
    // Simuler le chargement du contenu
    setSelectedDocumentId(docId);
    setDocumentContent(`Ceci est un exemple de contenu pour le document ${docId}.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Les chercheurs ont noté plusieurs thèmes récurrents dans les entretiens : la perception du temps, les relations sociales, et l'impact environnemental.

Chaque participant a exprimé des préoccupations différentes, mais certains motifs communs émergent clairement de l'analyse.`);
    
    setActiveTab('annotate');
  };

  if (!projectId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Projet non spécifié</div>
      </div>
    );
  }

  return (
    <div className="qualitative-analysis-page">
      {/* Header */}
      <header className="analysis-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg">
              <Code className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analyse Qualitative</h1>
              <p className="text-gray-600">Codage et analyse thématique</p>
            </div>
          </div>
        </div>
      </header>

      <div className="analysis-container">
        {/* Sidebar */}
        <aside className="analysis-sidebar">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('codes')}
              className={`sidebar-button ${activeTab === 'codes' ? 'active' : ''}`}
            >
              <Tag className="h-5 w-5" />
              <span>Gestion des codes</span>
            </button>
            
            <button
              onClick={() => setActiveTab('annotate')}
              className={`sidebar-button ${activeTab === 'annotate' ? 'active' : ''}`}
            >
              <FileText className="h-5 w-5" />
              <span>Annoter du texte</span>
            </button>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`sidebar-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Tableau de bord</span>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`sidebar-button ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Settings className="h-5 w-5" />
              <span>Paramètres</span>
            </button>
          </nav>

          {/* Documents */}
          <div className="mt-8">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <Layers className="h-4 w-4" />
              <span>Documents disponibles</span>
            </div>
            <div className="space-y-2">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => loadDocumentContent(doc.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedDocumentId === doc.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-900">{doc.title}</div>
                  <div className="text-xs text-gray-500 capitalize">{doc.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <PieChart className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Statistiques</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Codes créés</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Annotations</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Documents annotés</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="analysis-main">
          {activeTab === 'codes' && (
            <div className="p-6">
              <CodeManager projectId={projectId} />
            </div>
          )}

          {activeTab === 'annotate' && (
            <div className="p-6">
              {selectedDocumentId ? (
                <TextAnnotator
                  documentId={selectedDocumentId}
                  content={documentContent}
                  projectId={projectId}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sélectionnez un document
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Choisissez un document dans la barre latérale pour commencer l'annotation.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="p-6">
              <CodingDashboard projectId={projectId} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Paramètres du codage</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Export des données</h3>
                    <div className="space-y-3">
                      <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">Export CSV</div>
                        <div className="text-sm text-gray-600">
                          Exportez vos annotations au format CSV
                        </div>
                      </button>
                      <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">Export JSON</div>
                        <div className="text-sm text-gray-600">
                          Exportez vos données de codage au format JSON
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Préférences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="text-gray-700">Afficher les annotations par défaut</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="text-gray-700">Notifications pour les nouvelles annotations</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QualitativeAnalysisPage;