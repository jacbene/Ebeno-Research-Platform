import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
      <p className="text-gray-600 mt-2">Bienvenue sur Ebeno Research Platform</p>
      
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Cartes de statistiques ou actions rapides */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Mes projets</h3>
            <p className="mt-2 text-sm text-gray-500">Gérez vos projets de recherche</p>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Transcripts</h3>
            <p className="mt-2 text-sm text-gray-500">Accédez à vos transcriptions</p>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Analyse</h3>
            <p className="mt-2 text-sm text-gray-500">Outils d'analyse qualitative</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;