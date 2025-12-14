import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Importation de la configuration i18n
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      Suspense est utilisé pour afficher une interface de secours (ex: un loader)
      pendant que les fichiers de traduction sont chargés de manière asynchrone.
    */}
    <Suspense fallback="Chargement...">
      <App />
    </Suspense>
  </React.StrictMode>
);
