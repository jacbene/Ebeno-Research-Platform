import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MemoEditor from '../components/memos/MemoEditor.js';

const MemoPage: React.FC = () => {
  const { memoId } = useParams<{ memoId: string }>();
  const navigate = useNavigate();

  // Dans un cas réel, vous récupéreriez le projectId depuis le mémo
  const projectId = 'placeholder'; // À remplacer par la logique réelle

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Retour</span>
        </button>

        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <MemoEditor
              projectId={projectId}
              memoId={memoId}
              onSave={() => navigate(-1)}
              onCancel={() => navigate(-1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoPage;
