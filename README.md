<div align="center">

# 🎓 Ebeno Research Platform

**Plateforme collaborative d'analyse qualitative et de gestion de projets de recherche pour les Sciences Humaines et Sociales (SHS).**

[![Tests](https://img.shields.io/badge/tests-59%20passed-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]()
[![Souveraineté](https://img.shields.io/badge/souverainet%C3%A9-100%25-success)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Docker](https://img.shields.io/badge/docker-compose%2011%20services-2496ED)]()

[Documentation technique](./INSTALL_SELF_HOSTED.md) · [Guide université](./GUIDE_DEPLOIEMENT_UNIVERSITE.md) · [Signaler un bug](https://github.com/jacbene/Ebeno-Research-Platform/issues)

</div>

---

## 🌍 Souveraineté 100% — Pourquoi Ebeno ?

Ebeno a été conçu dès le départ pour les institutions qui ne peuvent pas envoyer leurs données de recherche chez un cloud tiers (RGPD strict, données médicales, données sensibles).

**Toutes les briques critiques sont auto-hébergeables** :

| Brique | Technologie | Mode SaaS (Cloud) | Mode Self-Hosted (Souverain) |
| :--- | :--- | :--- | :--- |
| 🧠 **IA Texte** | Ollama / DeepSeek | DeepSeek / OpenAI | **Ollama** (local) |
| 🎙️ **IA Audio** | Whisper / Deepgram | Deepgram / OpenAI | **Whisper Local** (local) |
| 💾 **Stockage** | S3-compatible | Cloudinary | **MinIO** (local) |
| 📧 **Emails** | SMTP | Brevo (API) | **Mailpit / Mailu** (local) |
| 🚨 **Monitoring** | Sentry SDK | Sentry.io | **GlitchTip** (local) |

> 🔒 **Résultat** : en mode self-hosted, **aucune donnée de recherche ne quitte vos serveurs**. Idéal pour les universités, laboratoires CNRS, et projets financés par l'ANR/ERC.

---

## ✨ Fonctionnalités Clés

### 🔐 Authentification & Sécurité
- Inscription et connexion sécurisées (JWT)
- **Double authentification (2FA TOTP)** avec codes de secours
- Vérification d'email obligatoire
- Chiffrement AES des données sensibles (bio, institution)
- Suppression de compte RGPD (art. 17) avec délai de grâce de 30 jours

### 📁 Gestion de Projets
- CRUD complet des projets de recherche
- **Rôles granulaires** (owner, admin, member)
- Ajout de tags, statuts, visibilité
- Suivi d'activité en temps réel (WebSocket)
- **Organisations** (multi-utilisateurs, quota IA partagé)

### 📄 Documents & Sources
- Upload multi-format (PDF, DOCX, TXT, MD)
- **Extraction de texte** (PDF, DOCX) pour l'analyse IA
- Corbeille avec soft-delete / restauration
- **Édition collaborative** temps réel
- Téléchargement réécrit (PDF / Word / TXT)

### 🎙️ Audios & Transcriptions
- Upload audio / vidéo (MP3, WAV, MP4, M4A, WebM)
- Transcription automatique en **cascade** (Whisper Local → Deepgram → OpenAI)
- Suivi de statut (4 états : pending, processing, completed, failed)
- **Retry intelligent** avec remboursement automatique de quota IA en cas d'échec

### 🧠 Intelligence Artificielle Souveraine
- **Résumé IA** (cascade Ollama → DeepSeek → OpenAI)
- **Extraction d'entités** (personnes, lieux, organisations, dates)
- **Analyse thématique** (CAQDAS : codage manuel et suggestif)
- **Détection de langue** automatique (99 langues)
- **Traduction** multi-langues
- **Chat collaboratif** avec contexte projet

### 📊 CAQDAS
- Codage de segments (manuel et suggestions IA)
- Analyse thématique de corpus
- Export vers NVivo / Atlas.ti *(roadmap v2.6)*

### 📈 Statistiques & Monitoring
- Dashboard temps réel (projets, fichiers, entités)
- Suivi d'activité par projet
- **Monitoring auto-hébergé** (GlitchTip)

---

## 🏗️ Architecture

### Mode SaaS (Cloud) — Production actuelle

```text
Frontend (React 18)  ──▶  Backend (Node 24)  ──▶  PostgreSQL (Neon)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Cloudinary        DeepSeek         Brevo
        (stockage)          (IA)          (email)
```

### Mode Self-Hosted (Souverain) — 11 services Docker

```text
                  Reverse Proxy (Nginx/Traefik + Let's Encrypt)
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
          Frontend                Backend            PostgreSQL
                                    │
       ┌───────┬───────┬────────────┼────────┬────────┬─────────┐
       ▼       ▼       ▼            ▼        ▼        ▼         ▼
     Ollama  Whisper  MinIO       Mailpit  GlitchTip  Ollama-init
      (IA)   (local) (stockage)   (email)  (monitor)
```

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 20+ (backend)
- **Docker** + **Docker Compose** (self-hosted)
- **PostgreSQL** 15+ (ou Neon en SaaS)

### Option 1 — Mode Self-Hosted (recommandé pour les universités)

```bash
git clone https://github.com/jacbene/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform
cp backend/.env.example backend/.env
nano backend/.env
docker compose up -d
docker compose logs -f ollama-init
```

📘 **Guide complet** : [GUIDE_DEPLOIEMENT_UNIVERSITE.md](./GUIDE_DEPLOIEMENT_UNIVERSITE.md)
🔧 **Référence technique** : [INSTALL_SELF_HOSTED.md](./INSTALL_SELF_HOSTED.md)

### Option 2 — Développement local

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

---

## 🛠️ Stack Technique

| Couche | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, PWA (Workbox) |
| **Backend** | Node.js 24, Express, Knex, Socket.IO |
| **Base de données** | PostgreSQL 15+ (Neon en SaaS, ou local) |
| **IA Texte** | Ollama (llama3.1), DeepSeek, OpenAI |
| **IA Audio** | Whisper Local (faster-whisper), Deepgram, OpenAI |
| **Stockage** | MinIO (self-hosted) ou Cloudinary (SaaS) |
| **Emails** | SMTP Local (Mailpit/Mailu) ou Brevo |
| **Monitoring** | GlitchTip (self-hosted) ou Sentry |
| **Tests** | Jest (unit + integration), pg-mem |
| **CI/CD** | Render (SaaS), GitHub Actions |

---

## 🧪 Tests & Qualité

```bash
cd backend && npm test
npx tsc --noEmit
```

**État actuel :**

- ✅ **59 tests passent** (62 total, 3 skipped)
- ✅ **8 suites vertes** sur 9
- ✅ **0 erreur TypeScript**
- ✅ **Smoke test** : 11/11

---

## 📚 Documentation

| Document | Public | Description |
| :--- | :--- | :--- |
| [INSTALL_SELF_HOSTED.md](./INSTALL_SELF_HOSTED.md) | DSI / DevOps | Guide technique complet (15 sections) |
| [GUIDE_DEPLOIEMENT_UNIVERSITE.md](./GUIDE_DEPLOIEMENT_UNIVERSITE.md) | Décideurs / VP Recherche | Business case + plan 4 semaines |
| [RAPPORT_DE_REPRISE_v2.5.0.md](./RAPPORT_DE_REPRISE_v2.5.0.md) | Équipe dev | Rapport de session |

---

## 🤝 Support & Contact

- 📧 **Email** : contact@ebenoresearch.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/jacbene/Ebeno-Research-Platform/issues)
- 🏛️ **Déploiement université** : contactez-nous pour un accompagnement dédié

---

## 📄 Licence

**Propriétaire** — Tous droits réservés. Ce logiciel n'est pas open-source. Contactez-nous pour les modalités de licence institutionnelle.

---

<div align="center">

**Fait avec ❤️ pour la recherche souveraine en Sciences Humaines et Sociales**

[⬆ Retour en haut](#-ebeno-research-platform)

</div>