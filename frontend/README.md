```markdown
# 🎨 Ebeno Research — Frontend

> Interface utilisateur de la Plateforme de Recherche Ebeno.
> React + TypeScript + Create React App.

---

## 🚀 Démarrage

### Prérequis

- **Node.js** ≥ 18
- **npm** ou **yarn**

### Installation

```bash
cd frontend
npm install
```

Lancer en développement

```bash
npm start
```

· Ouvre http://localhost:3000
· Rechargement automatique à chaque modification

⚠️ Le backend doit tourner sur http://localhost:5001 (voir ../backend/README.md).

Build de production

```bash
npm run build
```

Génère un dossier build/ prêt à déployer.

Tests

```bash
npm test
```

---

📁 Structure

```
frontend/
├── public/                    # Fichiers statiques (index.html, favicon)
├── src/
│   ├── components/            # Composants réutilisables
│   │   ├── ui/                # Design system (Button, Card, Input, Badge)
│   │   ├── layout/            # Layout global (Header, Sidebar)
│   │   ├── CollaborativeEditor.tsx
│   │   ├── PresenceBar.tsx
│   │   ├── WordCloud.tsx
│   │   └── ...
│   │
│   ├── pages/                 # Pages (routing)
│   │   ├── Dashboard.tsx
│   │   ├── CollaborationPage.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── TranscriptionPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── Register.tsx
│   │   └── ...
│   │
│   ├── context/               # React Contexts
│   │   ├── ThemeContext.tsx   # Dark / Light / System
│   │   └── ToastContext.tsx   # Notifications toast
│   │
│   ├── hooks/                 # Hooks personnalisés
│   │   ├── useProjectSocket.ts  # Socket.IO collaboration
│   │   └── useMediaQuery.ts
│   │
│   ├── services/              # Clients API
│   │   └── api.ts             # Axios (intercepteurs JWT)
│   │
│   ├── theme/                 # Design tokens
│   │   └── index.ts           # Couleurs, spacing, typography
│   │
│   ├── styles/                # Styles globaux
│   │   └── breakpoints.ts
│   │
│   ├── App.tsx                # Routing + Auth guard
│   └── index.tsx              # Point d'entrée
│
├── package.json
├── tsconfig.json
└── README.md (ce fichier)
```

---

🎨 Design system

Le projet utilise un design system maison dans src/components/ui/ :

Composant Usage
<Button variant="primary \| secondary \| outline \| success"> Boutons
<Card title="..."> Conteneurs avec ombre
<Input label="..." /> Champs de formulaire
<Badge variant="info \| secondary"> Étiquettes

Thème : useTheme() expose colors, spacing, typography, borderRadius.

Mode sombre : géré via ThemeContext (Light / Dark / System).

---

🔌 Communication backend

REST (via services/api.ts)

Client axios avec :

· Base URL automatique (REACT_APP_API_URL ou http://localhost:5001/api)
· Injection automatique du token JWT dans le header Authorization
· Intercepteur 401 → redirection vers login

WebSocket (via hooks/useProjectSocket.ts)

Connexion Socket.IO pour :

· Présence utilisateurs en temps réel
· Édition collaborative
· Indicateur de frappe
· Curseurs colorés

---

⚡ Performance

Lazy-loading

Les composants lourds sont chargés à la demande :

Composant Taille Chargé quand
html2pdf.js ~262 KB Au 1er clic sur "Télécharger PDF"
WordCloud ~18 KB À l'ouverture de l'onglet Analyse
Routes (Dashboard, CollaborationPage, ...) ~20-50 KB chacune À la navigation

Bundle initial : ~80 KB (gzip)

Optimisations

· React.lazy() + <Suspense> pour les routes
· Import dynamique (import()) pour html2pdf.js
· Découpage par chunk automatique (CRA)

---

🎯 Pages principales

Route Composant Description
/ Dashboard Vue d'ensemble, stats, top entités
/project/:id ProjectDetail Détail projet (8 onglets)
/collaboration CollaborationPage Édition collaborative temps réel
/transcription TranscriptionPage Upload + transcription audio
/transcriptions TranscriptionList Liste des transcriptions
/text-upload TextUploadPage Import de texte
/chat ChatPage Assistant IA
/settings SettingsPage Profil, avatar, préférences

---

🎨 Charte graphique

· Couleur primaire : #4A6CF7
· Police : système (San Francisco, Roboto, Segoe UI…)
· Icônes : Emojis + SVG inline
· Rayons : sm (4px), md (8px), lg (16px)
· Mode sombre : détection système ou choix manuel

---

🔧 Configuration

Variables d'environnement

Crée un fichier .env à la racine de frontend/ :

```env
REACT_APP_API_URL=https://ebeno-backend.onrender.com/api
```

Par défaut (dev) : http://localhost:5001/api

TypeScript

· Config : tsconfig.json
· Mode strict activé
· Types pour React, React Router, Axios

---

🚀 Déploiement

Le frontend est déployé en static site (Vercel, Netlify, ou Render Static).

```bash
npm run build
# → dossier build/ à déployer
```

Note : le projet utilise react-scripts (Create React App). Pour migrer vers Vite, voir ../ARCHITECTURE.md.

---

🤝 Contribution

Avant de committer :

```bash
npm run build      # Vérifie que le build passe
```

Puis :

```bash
git add .
git commit -m "feat(frontend): description du changement"
git push
```

Le déploiement est automatique (CI/CD via Render/Vercel).

---

📬 Contact

· 📧 jacquesbene301@gmail.com
· 🔗 github.com/jacbene/Ebeno-Research-Platform

---

Copyright (c) 2023-2026, Entreprise Bene Mbama Jacques — Tous droits réservés.

```

---
