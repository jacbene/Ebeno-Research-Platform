import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useState } from 'react';

// On importe les fichiers .md directement via Vite (?raw)
// Note : Vite permet d'importer des fichiers hors du dossier src si configuré
import guideDeploiement from '../../../GUIDE_DEPLOIEMENT_UNIVERSITE.md?raw';
import installSelfHosted from '../../../INSTALL_SELF_HOSTED.md?raw';

const docsMap: Record<string, { title: string; content: string }> = {
  'deployment': { title: 'Guide de Déploiement (DSI)', content: guideDeploiement },
  'self-hosted': { title: 'Installation Technique', content: installSelfHosted },
};

export default function DocumentationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState(docsMap['deployment']);

  useEffect(() => {
    if (slug && docsMap[slug]) {
      setDoc(docsMap[slug]);
    } else {
      setDoc(docsMap['deployment']);
    }
  }, [slug]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Fil d'ariane */}
        <div className="mb-8 flex gap-4 text-sm">
          <Link to="/" className="text-blue-600 hover:underline">← Retour à l'accueil</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-300">Documentation</span>
        </div>

        {/* Menu latéral simplifié pour mobile */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <Link to="/docs/deployment" className={`px-4 py-2 rounded-lg whitespace-nowrap ${slug === 'deployment' || !slug ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
            Guide DSI
          </Link>
          <Link to="/docs/self-hosted" className={`px-4 py-2 rounded-lg whitespace-nowrap ${slug === 'self-hosted' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
            Installation Technique
          </Link>
        </div>

        {/* Contenu Markdown */}
        <div className="prose prose-blue dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
