```markdown
# 🎓 Plateforme de Recherche Ebeno

> Plateforme de recherche collaborative conçue pour les **Sciences Humaines et Sociales (SHS)**.  
> Application web **monorepo** offrant une suite d'outils complète pour assister les chercheurs dans leurs projets d'analyse qualitative.

[![Tests](https://img.shields.io/badge/tests-52%2F52%20passing-brightgreen)]()
[![Smoke](https://img.shields.io/badge/smoke%20test-11%2F11-brightgreen)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

---

## ✨ Fonctionnalités principales

### 🔐 Authentification & Profil
- Inscription, connexion sécurisée (JWT)
- Gestion du profil utilisateur et **avatar personnalisé**
- Mode **Dark / Light / System** complet

### 📁 Gestion de projets
- CRUD complet des projets de recherche
- **Édition réservée au propriétaire** du projet
- Sélecteur global : *Tous mes projets* ou projet spécifique
- Ajout de **tags** aux projets

### 📄 Documents & Sources
- Upload de documents (PDF, Word, TXT…)
- **Stockage Cloudinary** avec **corbeille** (soft delete / restauration / suppression définitive)
- Renommage et **téléchargement** en PDF / Word / TXT
- **Édition collaborative** en temps réel

### 🎙️ Audios & Transcriptions
- Upload de fichiers **audio et vidéo**
- **Transcription automatique** (Deepgram)
- Suivi du **statut des transcriptions** (4 états : pending, processing, completed, failed)
- **Retry automatique** en cas d'échec

### 🧠 Intelligence Artificielle
- **Résumé IA en cascade** (avec bouton *Réessayer*)
- Extraction d'**entités** (Personnes, Lieux, Organisations, Dates…)
- **Circuit breakers** pour éviter le spam en cas de panne IA
- Intégration DeepSeek pour l'assistance à l'analyse

### 🏷️ Analyse qualitative
- **Entités** : extraction + filtres par type + compteur d'occurrences
- **Codes et annotations** sur documents et transcriptions
- Nuage de mots (WordCloud) et fréquences
- Suggestions de codes par IA

### 🤝 Collaboration temps réel
- Édition collaborative synchronisée (Socket.IO)
- **Présence** des utilisateurs (avatars colorés)
- **Curseurs partagés** et **indicateurs de frappe**
- **Documents collaboratifs** partagés entre chercheurs
- Feed d'**activité récente**

### 🔎 Recherche & Statistiques
- **Recherche globale** sur tous les contenus
- Dashboard analytique avec cartes de stats
- Top entités, fichiers récents, projets récents

### 🛡️ Fiabilité & Observabilité
- **Rate limiting** par usage (global / auth / upload / IA)
- **Circuit breakers** pour services externes
- **Cache mémoire 30s** sur les stats du dashboard
- **Health checks** : `/health`, `/health/db`, `/health/ready`, `/health/breakers`
- **Smoke test** automatisé pour valider les déploiements

---

## 🏗️ Stack technique

### Backend
| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Base de données | **PostgreSQL** (prod) / **SQLite** (dev/test) |
| ORM | **Knex.js** (migrations + query builder) |
| Temps réel | Socket.IO 4 |
| Authentification | JWT + bcrypt |
| Stockage fichiers | Cloudinary |
| IA / Transcription | OpenAI, Deepgram, DeepSeek |
| Logs | Winston |
| Tests | Jest + Supertest |

### Frontend
| Composant | Technologie |
|-----------|-------------|
| Framework | React 18 + TypeScript |
| Build | Create React App (react-scripts) |
| Routing | React Router 6 |
| HTTP | Axios |
| Éditeur collaboratif | Custom (Socket.IO) |
| Export PDF | html2pdf.js (lazy-loaded) |
| Nuage de mots | WordCloud (lazy-loaded) |
| Thème | Context API (Light/Dark/System) |

---

## 📁 Structure du projet

```

Ebeno-Research-Platform/
├── backend/                    # API Express + Socket.IO + Knex
│   ├── src/
│   │   ├── config/             # knexfile, configs
│   │   ├── controllers/        # Logique métier par domaine
│   │   ├── db/migrations/      # Migrations Knex
│   │   ├── middleware/         # Auth, rate limit, logger, sanitize
│   │   ├── routes/             # Déclaration des routes
│   │   ├── services/           # Cache, circuit breakers, cleanup
│   │   ├── sockets/            # Handlers Socket.IO
│   │   ├── utils/              # Logger, generateId, helpers
│   │   └── server.ts           # Point d'entrée
│   └── tests/                  # Jest (unit + integration)
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/         # UI réutilisable
│   │   ├── context/            # Theme, Toast, Auth
│   │   ├── hooks/              # useProjectSocket, useMediaQuery…
│   │   ├── pages/              # Dashboard, ProjectDetail, Collaboration…
│   │   └── services/           # API client
│   └── public/
│
├── scripts/                    # Outils (smoke test…)
│   ├── smoke-test.sh
│   └── smoke-test.env.example
│
└── README.md                   # Ce fichier

```

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** ≥ 20
- **npm** ou **pnpm**
- **PostgreSQL** (pour la prod ; SQLite suffit en dev)

### Installation

```bash
git clone https://github.com/jacbene/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform

# Backend
cd backend && npm install

# Frontend (dans un autre terminal)
cd frontend && npm install
```

Configuration — backend/.env

Crée un fichier backend/.env :

```env
# === Base de données ===
# Prod : PostgreSQL (Render, Supabase…)
DATABASE_URL="postgresql://user:password@host:5432/dbname"
# Dev : SQLite (par défaut)
NODE_ENV=development

# === Auth ===
JWT_SECRET="votre_secret_jwt_super_long"

# === Cloudinary (stockage fichiers) ===
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# === Services IA ===
OPENAI_API_KEY="sk-..."       # Résumés IA
DEEPGRAM_API_KEY="..."         # Transcription audio
DEEPSEEK_API_KEY="..."         # Assistance analyse

# === Application ===
PORT=5001
```

Lancer le projet

```bash
# Backend (migrations automatiques au démarrage)
cd backend
npm run dev

# Frontend (dans un autre terminal)
cd frontend
npm start
```

· API : http://localhost:5001
· Frontend : http://localhost:3000
· Health : http://localhost:5001/api/health

---

🧪 Tests

Tests unitaires + intégration

```bash
cd backend
npm test                 # Tous les tests (52 tests, ~2min)
npm run test:unit        # Tests unitaires uniquement
npm run test:integration # Tests d'intégration uniquement
npm run test:coverage    # Avec rapport de couverture
```

Smoke test post-déploiement

Teste l'API en production en ~15 secondes (11 checks) :

```bash
cd ~/Ebeno-Research-Platform
./scripts/smoke-test.sh
```

Vérifie :

· Health check + DB + readiness
· Circuit breakers
· Login (valide et invalide)
· Auth (accès sans token)
· Liste des projets
· Stats dashboard + cache
· Recherche globale

Alias Termux (optionnel) :

```bash
echo "alias smoke='cd ~/Ebeno-Research-Platform && ./scripts/smoke-test.sh'" >> ~/.bashrc
```

---

🏥 Health Checks

Endpoint Usage Réponse
GET /api/health Liveness (process vivant ?) { status: 'OK', uptime }
GET /api/health/db Test DB + latence { status: 'OK', latencyMs: 12 }
GET /api/health/ready Readiness (Render) { ready: true, checks: {...} }
GET /api/health/breakers État circuits IA { breakers: {...} }

Configure Render Health Check Path sur /api/health/ready.

---

🚢 Déploiement

Backend — Render

1. Web Service connecté à main
2. Build command : npm install --include=dev && npm run build
3. Start command : npm start
4. Health Check Path : /api/health/ready
5. Variables d'environnement : voir .env.example

Les migrations Knex s'exécutent automatiquement au démarrage.

Frontend — Render Static / Vercel / Netlify

1. Build command : npm run build
2. Publish directory : build
3. Environment : pointer REACT_APP_API_URL vers le backend

---

🧩 Architecture & choix techniques

Voir ARCHITECTURE.md pour :

· Fonctionnement du cache de stats
· Stratégie de migrations Knex
· Design des circuit breakers
· Debounce Socket.IO
· Code splitting frontend
· Sécurité (rate limiting, sanitize, JWT)

---

📝 Changelog

Voir CHANGELOG.md pour l'historique des changements notables.

---

📜 Licence

Copyright (c) 2023, Entreprise Bene Mbama Jacques
Tous droits réservés.

La redistribution et l'utilisation, sous forme source et binaire, avec ou sans modification, ne sont pas autorisées sans l'accord écrit préalable du titulaire du droit d'auteur.

---

📬 Contact

· 📧 jacquesbene301@gmail.com
· 🔗 github.com/jacbene/Ebeno-Research-Platform

```

---
