# 📘 Ebeno Research Platform — Guide Complet du Projet

Ce document centralise toute la documentation technique, les accès, l'architecture, les fonctionnalités et les règles de développement de la plateforme.

---

## 1. 🌍 Contexte & Infrastructure

| Composant | Technologie | URL / Fournisseur |
|---|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind | [https://ebeno-frontend.onrender.com](https://ebeno-frontend.onrender.com) |
| **Backend** | Node.js + Express + Knex + Socket.IO | [https://ebeno-backend.onrender.com](https://ebeno-backend.onrender.com) |
| **Base de données** | PostgreSQL (Serverless) | Neon (`ep-steep-night...neon.tech`) |
| **Paiement Mobile Money** | CamPay (MTN / Orange) | Mode Test (en attente docs pour Live) |
| **Paiement Carte Bancaire** | Startbutton (en cours) / Paddle (en appel) | En attente de validation |
| **Emails** | Brevo (API HTTP) | Expéditeur : `contact@ebenoresearch.com` |
| **Stockage Fichiers** | Cloudinary | Dossier `projects/{id}` |
| **IA Texte** | DeepSeek (principal) + OpenAI (fallback) | Via clés API |
| **IA Audio** | Deepgram (principal) + OpenAI Whisper (fallback) | Via clés API |
| **Monitoring** | Sentry | Backend & Frontend |
| **PWA** | Workbox + Service Worker | Installable, cache offline |

---

## 2. 👤 Comptes de Test

| Rôle | Email | Mot de passe | ID (Neon) |
|---|---|---|---|
| **Admin / Pro** | `jacquesbene301@gmail.com` | `Berny752901` | `1790108972430-r97bi2o3` |
| **Free** | `test@test.com` | `123456` | `1788252523390` |
| **Organisation** | Owner: `jacquesbene301`<br>Membre: `pasmasys@gmail.com` | - | "Université de Test" |

---

## 3. 🏗️ Architecture & Structure du Code

### Backend (`/backend`)
- **Architecture** : MVC classique avec des services métiers.
- **Point d'entrée** : `src/server.ts` (initialisation Express, Socket.IO, Sentry, migrations Knex).
- **Dossier `controllers/`** : Gère les requêtes HTTP (auth, chat, transcriptions, admin, paiement).
- **Dossier `services/`** : Logique métier (Deepgram, Whisper, DeepSeek, Email, Cloudinary, CamPay).
- **Dossier `db/`** : Configuration Knex (`knexfile.ts`) et migrations.
- **Webhooks** : Routes publiques (Paddle, CamPay) configurées **avant** `express.json()` pour conserver le raw body.

### Frontend (`/frontend`)
- **Architecture** : SPA React avec routage (`react-router-dom`).
- **Composants clés** :
  - `DocumentActions.tsx` : Panneau central d'IA (Résumer, Entités, Analyser, Sentiment, PDF).
  - `TranscriptionUploader.tsx` : Upload audio avec pré-écoute et suivi.
  - `PaymentModal.tsx` : Modale de paiement (Mobile Money vs Carte).
  - `ChatPage.tsx` : Chat IA avec streaming Socket.IO et rendu Markdown.
- **Hooks personnalisés** : `useQuotaWarning` (alertes 50/75/95/100%), `useChatStream`, `useProjectSocket`.
- **i18n** : 5 langues (FR, EN, ES, PT, AR avec RTL).

---

## 4. ⚙️ Fonctionnalités Clés

### 📁 Projets & Collaboration
- Création de projets, gestion des membres (Owner, Editor, Viewer).
- Onglets : Audio, Transcriptions IA, Memos, Analyse, Documents, Activité, Corbeille, Présence.
- Collaboration temps réel via Socket.IO (curseurs, frappe, activité).
- Soft delete (corbeille) et restauration.

### 🎙️ Transcription Audio
- Upload vers Cloudinary (max 100 Mo).
- Cascade IA : Deepgram → Whisper.
- Lecteur audio intégré (pré-écoute avant upload et post-upload).
- Rattachement possible d'une transcription à un projet.
- Emails de notification avec lien direct vers l'onglet "Transcriptions IA".

### 🤖 Intelligence Artificielle (via `DocumentActions`)
- **Chat** : Contexte limité aux documents du projet (RAG fermé).
- **Résumer** : Synthèses structurées.
- **Entités** : Extraction (Personnes, Lieux, Organisations, Dates).
- **Codes** : Suggestions de codes qualitatifs à partir du texte.
- **Analyser** : Nuage de mots, mots-clés, nombre de mots.
- **Sentiment** : Analyse (Positif, Négatif, Neutre, Mixte) avec score et explication (via DeepSeek).
- **Traduction** : 5 langues supportées, rendu RTL natif.
- **Export PDF** : Génération du document (via jsPDF) et sauvegarde automatique dans les documents du projet.

### 🛡️ Administration
- Dashboard Admin : Stats globales, Utilisateurs, Abonnements, Usage IA, Modération.
- Envoi d'emails collectifs/individuels avec template Ebeno.
- Suspension de compte, attribution de crédits manuels.

### 💳 Paiements & Quotas
- **CamPay** : Mobile Money (MTN/Orange), webhook sécurisé.
- **Paddle/Startbutton** : En attente pour les cartes internationales.
- **Quotas IA** : 50 (Free), 2000 (Pro), 10000 (Institution).
- **Alertes** : Toasts à 50%, 75%, 95%, 100% d'utilisation.

---

## 5. 🔑 Variables d'Environnement (Backend)

```env
# Base de données
DATABASE_URL="postgresql://..." # URL Neon
USE_NEON=true

# IA
DEEPSEEK_API_KEY=sk-...
DEEPGRAM_API_KEY=...
OPENAI_API_KEY=sk-...

# Stockage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Emails
BREVO_API_KEY=xkeysib-...
SMTP_FROM="Ebeno Research Platform <contact@ebenoresearch.com>"
FRONTEND_URL=https://ebeno-frontend.onrender.com

# Paiements
CAMPAY_USERNAME=...
CAMPAY_PASSWORD=...
CAMPAY_ENVIRONMENT=DEV # ou PROD
CAMPAY_WEBHOOK_SECRET=...
# PADDLE_API_KEY=...
# STARTBUTTON_API_KEY=...

# Sécurité
JWT_SECRET=...
