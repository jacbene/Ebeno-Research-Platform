# 🗺️ Plan de Travail — Ebeno Research Platform

Ce document présente les modules et fonctionnalités de la plateforme, mis à jour selon l'état réel du développement (Novembre 2026).

---

## Phase 0 : Infrastructure, IA & Monétisation (✓ COMPLÉTÉ)

### 0.1. Infrastructure de Base
- [x] Backend Node.js/Express avec TypeScript
- [x] Frontend React 18 avec TypeScript et Vite
- [x] Base de données PostgreSQL (Neon) avec Knex
- [x] Authentification JWT sécurisée (avec 2FA)
- [x] Déploiement continu sur Render (Frontend & Backend)
- [x] PWA (Progressive Web App) avec Workbox

### 0.2. Intégration d'IA pour la Recherche
- [x] **Assistant IA DeepSeek Intégré**
  - [x] API complète avec rate limiting et sécurité
  - [x] Interface de chat avec historique et streaming temps réel (Socket.IO)
  - [x] Rendu Markdown (tableaux, gras) et export PDF/Markdown des conversations
  - [x] Cascade de fallback (DeepSeek → OpenAI → Deepgram → Heuristique)
- [x] **Transcription Audio**
  - [x] Cascade Deepgram → Whisper
  - [x] Upload Cloudinary, lecteur audio (pré-écoute et post-écoute)
  - [x] Export PDF et sauvegarde dans les documents du projet
- [x] **Analyse Documentaire**
  - [x] Résumés intelligents, Extraction d'entités (NER), Suggestions de codes
  - [x] Analyse de sentiment (Positif/Négatif/Neutre/Mixte avec score)
  - [x] Traduction multilingue (5 langues, support RTL)

### 0.3. Monétisation & Gestion
- [x] **Paiements** : Mobile Money (CamPay) + Intégration Cartes Bancaires (en cours avec Startbutton/Paddle)
- [x] **Système de Quotas** : 50 (Free), 2000 (Pro), 10000 (Institution)
- [x] **Admin Panel** : Gestion des utilisateurs, abonnements, usage IA, modération
- [x] **Envoi d'emails** : Notifications transactionnelles (Brevo) et campagnes collectives
- [x] **Internationalisation (i18n)** : FR, EN, ES, PT, AR

---

## Phase 1 : Consolidation de l'Analyse Qualitative (CAQDAS) — 🚧 EN COURS

L'objectif est de transformer Ebeno en un logiciel d'aide à l'analyse qualitative complet.

### 1.1. Module de Codage (Coding)
- [x] *Partiel* : Banque de codes suggérés par l'IA (`suggested_codes`).
- [ ] *À faire* : **Surlignage interactif** (sélectionner un segment de texte et lui attribuer un code).
- [ ] *À faire* : Hiérarchie de codes (parents/enfants).
- [ ] *À faire* : Visualisation de tous les extraits associés à un code.

### 1.2. Mémos Analytiques
- [x] Création, édition et suppression de mémos liés au projet.
- [x] Commentaires et collaboration sur les mémos.
- [x] Résumés et traduction IA des mémos.

### 1.3. Visualisations de Données Qualitatives
- [x] Nuage de mots (WordCloud) et Top Keywords (via l'onglet Analyse).
- [ ] *À faire* : Graphiques de fréquence des codes.
- [ ] *À faire* : Matrices de co-occurrence des codes.

### 1.4. Analyse Assistée par IA
- [x] Résumés analytiques et extraction d'entités.
- [x] Analyse de sentiment.
- [ ] *À faire* : Analyse thématique automatique complète et comparaison inter-cas.

---

## Phase 2 : Vision "Self-Hosted" & Confidentialité (Nouveau)

De nombreux chercheurs (santé, droit) font face à des exigences strictes de confidentialité. L'objectif est de proposer une version **entièrement autonome** (On-Premise), garantissant que les données ne quittent jamais le réseau local.

### Niveau 1 — Self-Hosted pour les Institutions (Docker)
**Cible :** Clients plan "Institution" (Universités, Labos).
**Principe :** Déploiement sur serveur local via Docker Compose.
**Stack :**
- Base de données : PostgreSQL local.
- IA : Ollama (Llama 3.1 / Mistral) + Whisper.cpp pour l'audio.
- Zéro dépendance aux APIs Cloud (ni DeepSeek, ni Paddle).
**Argument commercial :** "Vos données restent chez vous." (Licence d'usage annuelle).

### Niveau 2 — Mode Hybride "Confidentialité" (Desktop App)
**Cible :** Clients plan "Pro" sensibles.
**Principe :** Application desktop (Tauri/Electron) embarquant un modèle quantifié via Ollama. Bascule possible entre "IA Cloud" (rapide) et "IA Locale" (100% privé).

### Niveau 3 — 100% Local sur Mobile
**Cible :** Chercheurs sur le terrain sans connexion.
**Principe :** Modèles ultra-légers (ex: Phi-3 quantifié) tournant sur smartphone pour des tâches basiques (résumés courts, extraction simple).

### Préparation technique
- [x] L'architecture utilise déjà une cascade de fournisseurs dans `chatService.ts` et `summaryService.ts`.
- [ ] *À faire* : Ajouter le fournisseur `ollama` en fonction de la variable `OLLAMA_URL`.

---

## Phase 3 : Gestion Intégrée des Données de Recherche

### 3.1. Gestion Bibliographique
- [ ] Ajouter manuellement des références (articles, livres).
- [ ] Importer des références (BibTeX, RIS).
- [ ] Générer des bibliographies formatées (APA, Chicago, MLA).
- [ ] *IA* : Suggestions de lectures pertinentes.

### 3.2. Outil d'Enquêtes et de Sondages
- [ ] Créateur de formulaires (questions multiples, échelles).
- [ ] Partage public via lien.
- [ ] Collecte et visualisation des réponses.
- [ ] *IA* : Analyse automatique des résultats.

### 3.3. Gestion de Données de Terrain
- [ ] Carnet de terrain numérique.
- [ ] Géolocalisation des observations.
- [ ] Synchronisation mobile.

---

## Phase 4 : Collaboration et Diffusion

### 4.1. Collaboration en Temps Réel
- [x] Présence des utilisateurs, indicateur de frappe, fil d'activité.
- [ ] *À faire* : Édition simultanée (Google Docs-like) sur les mémos et documents.

### 4.2. Module d'Évaluation par les Pairs (Peer Review)
- [ ] Soumission de brouillons pour relecture interne.
- [ ] Système d'annotations et gestion de versions.

### 4.3. Assistant à la Rédaction Scientifique
- [ ] Templates de sections d'articles.
- [ ] Vérificateur de conventions académiques.
- [ ] *IA* : Génération de résumés et abstracts.

---

## Phase 5 : Extensions et Intégrations

### 5.1. API Publique
- [ ] Documentation OpenAPI/Swagger.
- [ ] Authentification OAuth2 pour les intégrations tierces.
- [x] *Partiel* : Webhooks utilisateurs déjà en place.

### 5.2. Intégrations Tierces
- [ ] Zotero / Mendeley.
- [ ] NVivo / MAXQDA.
- [ ] Google Scholar / ORCID.

---

## Priorités à Court Terme (Q1 2027)

1. ✅ **Intégration IA & Paiements** — Complété (CamPay opérationnel).
2. 🔄 **Validation Paddle / Startbutton** pour les paiements par carte.
3. 🔄 **Module de codage interactif** (Surlignage de texte).
4. 🔄 **Version Self-Hosted (Docker)** pour les institutions.

## Métriques de Succès (2027)

- [ ] 100 chercheurs utilisateurs actifs
- [ ] 500 projets de recherche hébergés
- [ ] 10,000 requêtes IA traitées mensuellement
- [ ] Satisfaction utilisateur > 4.5/5

---

**Dernière mise à jour :** Novembre 2026
**Prochaine revue :** Février 2027
