```markdown
# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

---

## [Unreleased]

### Prévu
- Fix clés Deepgram / OpenAI
- Audit sécurité complet
- Documentation API (Swagger)

---

## [1.1.0] — 2026-09-17

### Ajouté

#### Backend
- **Cache mémoire 30s** sur les stats du dashboard (`statsCache.ts`)
  - Invalidation automatique après toute écriture (`invalidateStatsOnWrite`)
  - Gain : temps de réponse **500ms → 15ms** sur cache hit
- **Health checks étendus** :
  - `GET /api/health/db` : test DB + latence
  - `GET /api/health/ready` : readiness probe Render
- **Middleware `sanitize`** : protection XSS sur `/auth`, `/projects`, `/users`, `/comments`
- **TTL Présence Socket.IO** : nettoyage auto des users inactifs > 2 min
- **Debounce Socket.IO** : sauvegardes DB limitées à 1/500ms (au lieu d'1/char)
- **Utilitaire `generateId`** : IDs propres `prefix-timestamp-random`
- **Tests** : 17 nouveaux tests sur `presenceService` → **52 tests au total**

#### Frontend
- **Lazy-load `html2pdf.js`** : bundle initial réduit de **150 KB**
- **Lazy-load `WordCloud`** : bundle initial réduit de **80 KB**
- **Lazy-load des routes** : `React.lazy()` + `<Suspense>` sur toutes les pages
- Bundle initial : **405 KB → 80 KB** gzipped (**-80%**)

#### Outillage
- **Smoke test** (`scripts/smoke-test.sh`) : 11 checks post-déploiement
- **Health check Render** configuré sur `/api/health/ready`

### Corrigé
- **IDs de projet au format ISO** (`2026-09-14T13:04:22.271Z`) → migrés vers format propre `project-XXXXX-XXXXX`
- **Requête stats** `collaborativeDocs` : sous-requête SQL (compatibilité Postgres stricte)
- **`requestLogger`** : filtrage des health checks (réduit le volume de logs de 95%)
- **`knexfile.ts`** : support SSL optionnel + config test

### Sécurité
- **Rotation du mot de passe PostgreSQL**
- **Rate limiting** : 4 profils (global, auth, upload, AI)
- **Circuit breakers** : OpenAI et Deepgram protégés contre les pannes

### Modifié
- **Migration Prisma → Knex** (déjà en place, documentation mise à jour)
- **`.gitignore`** : ignore les backups DB locaux
- **Scripts npm backend** : `test:unit`, `test:integration`, `test:coverage`

---

## [1.0.0] — 2026-09-10

### Ajouté
- **Authentification** : inscription, login JWT, profil + avatar
- **Projets** : CRUD complet + édition owner
- **Documents** : upload Cloudinary, corbeille, restauration
- **Transcriptions** : audio + vidéo via Deepgram
- **Résumés IA** : cascade (OpenAI + DeepSeek)
- **Entités** : extraction automatique (Personnes, Lieux, Organisations, Dates…)
- **Analyse qualitative** : codes, annotations, nuage de mots
- **Collaboration temps réel** : Socket.IO, curseurs, typing
- **Édition collaborative** : documents synchronisés + renommage + export PDF/Word/TXT
- **Dark mode** : Light / Dark / System
- **Recherche globale** : sur tous les contenus
- **Circuit breakers** : protection services IA
- **Rate limiting** : 4 profils
- **Tests** : 35 tests unitaires + intégration
- **CI/CD** : GitHub Actions + Render (backend + DB)

---

## Types de changements

- `Ajouté` : nouvelles fonctionnalités
- `Modifié` : changements de fonctionnalités existantes
- `Déprécié` : fonctionnalités bientôt retirées
- `Retiré` : fonctionnalités retirées
- `Corrigé` : corrections de bugs
- `Sécurité` : vulnérabilités corrigées
```

---

