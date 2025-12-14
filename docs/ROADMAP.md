# Plan de Travail pour la Plateforme de Recherche Ebeno

Ce document présente les modules et fonctionnalités envisagés pour les prochaines versions de la plateforme.

## Phase 0: Infrastructure et IA (✓ COMPLÉTÉ)

### 0.1. Infrastructure de Base
- [x] Backend Node.js/Express avec TypeScript
- [x] Frontend React avec TypeScript et Vite
- [x] Base de données PostgreSQL avec Prisma
- [x] Authentification JWT sécurisée
- [x] Déploiement continu sur Firebase

### 0.2. Intégration d'IA pour la Recherche
- [x] **Assistant IA DeepSeek Intégré**
  - [x] API complète avec rate limiting et sécurité
  - [x] Interface de chat avec historique
  - [x] Streaming de réponses en temps réel
  - [x] Analyse spécialisée de textes de recherche
  - [x] Support multilingue (FR, EN, AR)

## Phase 1: Consolidation de l'Analyse Qualitative (CAQDAS)

L'objectif de cette phase est de doter la plateforme de véritables outils d'analyse de données qualitatives, transformant Ebeno en un logiciel d'aide à l'analyse qualitative de données (CAQDAS) complet.

### 1.1. Module de Codage (Coding)
- **Objectif:** Permettre aux chercheurs d'analyser systématiquement leurs données textuelles.
- **Fonctionnalités Clés:**
    - [ ] Créer et gérer une banque de codes (tags) par projet (avec nom, description, couleur).
    - [ ] Mettre en place une hiérarchie de codes (codes parents/enfants).
    - [ ] Surligner des segments de texte dans les documents et transcriptions.
    - [ ] Associer un ou plusieurs codes à ces segments surlignés.
    - [ ] Visualiser tous les extraits associés à un code spécifique.
    - [ ] **Intégration IA:** Suggestion automatique de codes par l'assistant DeepSeek.

### 1.2. Mémos Analytiques
- **Objectif:** Offrir un espace pour la réflexion et l'interprétation théorique.
- **Fonctionnalités Clés:**
    - [ ] Créer des mémos (notes de recherche) riches en texte.
    - [ ] Lier des mémos à des projets, des documents, des codes ou des extraits de texte spécifiques.
    - [ ] Organiser et rechercher dans les mémos.
    - [ ] **Intégration IA:** Aide à la rédaction et structuration des mémos par l'IA.

### 1.3. Visualisations de Données Qualitatives
- **Objectif:** Aider à la synthèse et à l'exploration des données codées.
- **Fonctionnalités Clés:**
    - [ ] Afficher des graphiques de fréquence des codes.
    - [ ] Générer des nuages de mots à partir des codes ou du contenu des documents.
    - [ ] Créer des matrices de co-occurrence de codes pour explorer les relations entre les thèmes.
    - [ ] **Intégration IA:** Génération automatique de visualisations pertinentes.

### 1.4. Analyse Assistée par IA
- **Objectif:** Utiliser l'IA DeepSeek pour approfondir l'analyse qualitative.
- **Fonctionnalités Clés:**
    - [ ] Analyse thématique automatique des transcriptions
    - [ ] Détection de motifs récurrents dans les données
    - [ ] Génération de résumés analytiques
    - [ ] Suggestions de méthodologies d'analyse
    - [ ] Comparaison inter-cas assistée par IA

---

## Phase 2: Gestion Intégrée des Données de Recherche

Cette phase vise à centraliser d'autres aspects du cycle de vie de la recherche au sein de la plateforme.

### 2.1. Gestion Bibliographique
- **Objectif:** Intégrer un outil de gestion de références pour éviter aux chercheurs de jongler avec plusieurs logiciels.
- **Fonctionnalités Clés:**
    - [ ] Ajouter manuellement des références bibliographiques (articles, livres, chapitres).
    - [ ] Importer des références depuis des fichiers (BibTeX, RIS).
    - [ ] Organiser les références dans des dossiers.
    - [ ] Joindre des fichiers PDF aux références.
    - [ ] Générer des bibliographies formatées (APA, Chicago, MLA, etc.).
    - [ ] **Intégration IA:** Suggestions de lectures pertinentes basées sur les projets.

### 2.2. Outil d'Enquêtes et de Sondages
- **Objectif:** Permettre la collecte de données quantitatives et mixtes.
- **Fonctionnalités Clés:**
    - [ ] Créateur de formulaires avec différents types de questions.
    - [ ] Partager les enquêtes via un lien public.
    - [ ] Collecter et visualiser les réponses directement dans la plateforme.
    - [ ] Exporter les résultats au format CSV.
    - [ ] **Intégration IA:** Analyse automatique des résultats d'enquêtes.

### 2.3. Gestion de Données de Terrain
- **Objectif:** Centraliser toutes les données de terrain.
- **Fonctionnalités Clés:**
    - [ ] Carnet de terrain numérique
    - [ ] Gestion d'entretiens et d'observations
    - [ ] Géolocalisation des données de terrain
    - [ ] Synchronisation mobile

---

## Phase 3: Amélioration de la Collaboration et de la Diffusion

Cette dernière phase se concentre sur le renforcement du travail d'équipe et la préparation à la publication.

### 3.1. Collaboration en Temps Réel
- **Objectif:** Rendre la collaboration sur les documents plus fluide et interactive.
- **Fonctionnalités Clés:**
    - [ ] Permettre à plusieurs utilisateurs d'éditer simultanément un même document ou mémo.
    - [ ] Afficher les curseurs et les modifications des autres collaborateurs en temps réel.
    - [ ] Système de commentaires et annotations collaboratives.

### 3.2. Module d'Évaluation par les Pairs (Peer Review)
- **Objectif:** Faciliter le processus de relecture interne avant la soumission à des revues.
- **Fonctionnalités Clés:**
    - [ ] Soumettre un brouillon d'article pour relecture.
    - [ ] Système de commentaires et d'annotations.
    - [ ] Gérer les différentes versions du document (versioning).
    - [ ] **Intégration IA:** Vérification automatique de la structure et du style académique.

### 3.3. Assistant à la Rédaction Scientifique
- **Objectif:** Aider les chercheurs dans la rédaction de leurs articles.
- **Fonctionnalités Clés:**
    - [ ] Templates de sections d'articles
    - [ ] Vérificateur de conventions académiques
    - [ ] Suggestions d'amélioration stylistique
    - [ ] Génération de résumés et abstracts

### 3.4. Tableau de Bord Analytique Avancé
- **Objectif:** Offrir une vue d'ensemble des projets de recherche.
- **Fonctionnalités Clés:**
    - [ ] Métriques d'avancement des projets
    - [ ] Visualisation des réseaux de collaborateurs
    - [ ] Statistiques d'utilisation de l'IA
    - [ ] Rapports d'activité automatisés

---

## Phase 4: Extension et Intégrations

### 4.1. API Publique
- **Objectif:** Permettre l'intégration avec d'autres outils de recherche.
- **Fonctionnalités Clés:**
    - [ ] Documentation OpenAPI/Swagger
    - [ ] Authentification OAuth2
    - [ ] Webhooks pour les événements

### 4.2. Applications Mobiles
- **Objectif:** Accéder à la plateforme depuis mobile.
- **Fonctionnalités Clés:**
    - [ ] Application iOS
    - [ ] Application Android
    - [ ] Synchronisation hors-ligne

### 4.3. Intégrations Tierces
- **Objectif:** Connecter Ebeno à l'écosystème de recherche existant.
- **Fonctionnalités Clés:**
    - [ ] Zotero / Mendeley
    - [ ] NVivo / MAXQDA
    - [ ] Google Scholar / ORCID
    - [ ] Dropbox / Google Drive

---

## Priorités à Court Terme (Q1 2024)

1. ✅ **Intégration IA DeepSeek** - Complétée
2. 🔄 Module de codage de base
3. 🔄 Gestion bibliographique simple
4. 🔄 Amélioration de l'interface de transcription

## Métriques de Succès

- [ ] 100 chercheurs utilisateurs actifs
- [ ] 500 projets de recherche hébergés
- [ ] 10,000 requêtes IA traitées mensuellement
- [ ] Satisfaction utilisateur > 4.5/5

---

Ce plan de travail n'est pas figé et pourra être adapté en fonction des retours des utilisateurs et des priorités du projet. La phase 0 étant complétée, nous nous concentrons maintenant sur la Phase 1 (CAQDAS).

**Dernière mise à jour :** Decembre 2025
**Prochaine revue :** Avril 2026