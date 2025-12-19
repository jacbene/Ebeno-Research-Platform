# Plateforme de Recherche Ebeno

Plateforme de recherche collaborative conçue pour les Sciences Humaines et Sociales (SHS). Ce projet est une application web monorepo avec un backend s'appuyant sur Node.js/Express et un frontend en React développé en TypeScript.

*Dernière mise à jour : 19 December 2025*

## 🚀 Nouveautés

### Assistant IA DeepSeek Intégré

La plateforme intègre maintenant un **assistant IA DeepSeek** spécialisé dans la recherche scientifique :
- 💬 Chat intelligent avec historique des conversations
- 🔍 Analyse approfondie de textes de recherche
- ⚡ Réponses en streaming en temps réel
- 📊 Spécialisé en méthodologie de recherche qualitative
- 🛡️ Sécurisé avec rate limiting et authentification

### 📊 Analyse Qualitative & Codage

Pour compléter l'analyse IA, la plateforme intègre désormais un module complet d'analyse qualitative manuelle, inspiré des méthodologies de recherche SHS.

-   **Gestion des Codes :** Créez, modifiez et organisez une hiérarchie de codes (thèmes) pour structurer votre analyse. Attribuez des couleurs et des descriptions pour une meilleure lisibilité.
-   **Annotation de Texte :** Surlignez des extraits de texte directement dans vos documents et transcriptions pour les lier à un ou plusieurs codes.
-   **Prise de Notes :** Ajoutez des notes détaillées à chaque annotation pour y consigner vos réflexions et mémos analytiques.
-   **Tableau de Bord du Codage :** Visualisez en un coup d'œil les statistiques de votre projet : codes les plus utilisés, activité des collaborateurs, et nombre total d'annotations.

## Architecture

Le projet est divisé en deux packages principaux :

-   `backend` : Une API RESTful construite avec Express.js, TypeScript, et Prisma pour la gestion de la base de données PostgreSQL.
-   `frontend` : Une application web monopage (SPA) développée avec React, TypeScript, Vite, et stylisée avec Tailwind CSS.

## Fonctionnalités Actuelles

### **Backend**:
*   Authentification sécurisée (inscription, connexion) avec JWT.
*   Gestion de projets, documents et transcriptions.
*   Middleware pour la protection des routes.
*   **Intégration DeepSeek IA** : API complète pour le chat, streaming, et analyse de recherche.
*   **Module de Codage :** API complète pour la gestion hiérarchique des codes, des annotations sur les documents et transcriptions, et des statistiques de codage.
*   Rate limiting et gestion d'erreurs robuste.

### **Frontend**:
*   Interface utilisateur réactive construite avec React 19 et Vite.
*   Gestion de l'état global avec Zustand.
*   Routage côté client avec React Router v6.
*   **Internationalisation (i18n)** avec `i18next` pour le support multilingue.
*   Composants d'interface stylisés avec Tailwind CSS.
*   Application Web Progressive (PWA) pour une expérience hors ligne.
*   **Assistant IA DeepSeek** : Interface complète de chat avec historique, streaming, et outils d'analyse.
*   **Analyse Qualitative :** Interface dédiée à la création et à la gestion des codes.
*   **Annotation de Texte :** Outils de surlignage et d'annotation de texte intégrés à la visionneuse de documents.
*   **Dashboard de Codage :** Tableau de bord interactif pour le suivi des statistiques d'analyse.

### **Gestion Bibliographique**:
*   Importation de références depuis des fichiers BibTeX et Zotero.
*   Gestion des métadonnées des références (titre, auteurs, année, etc.).
*   Association des références aux projets de recherche.
*   Recherche et filtrage avancés des références.

### **Déploiement**:
*   Déploiement continu sur **Firebase Hosting**.

## Structure du Projet
ebeno-research-platform/
├── docs/
│   ├── ROADMAP.md
│   └── NOTICE.md
├──backend/
│├── controllers/      # Contrôleurs DeepSeek, Auth, Projects
│├── routes/          # Routes API
│├── services/        # Services DeepSeek, Auth
│├── middleware/      # Authentification, validation
│└── prisma/         # Schéma de base de données
├──frontend/
│├── src/
││   ├── components/  # Composants React
││   ├── pages/       # Pages de l'application
││   ├── services/    # Services API
││   ├── hooks/       # Hooks personnalisés
││   └── stores/      # États globaux Zustand
└──README.md

## Démarrage Rapide

### Prérequis

-   Node.js (version 20.19+ ou 22.12+)
-   Docker et Docker Compose
-   Git
-   Clé API DeepSeek (optionnel mais recommandé)

### Installation et Lancement

1.  **Cloner le dépôt :**
    ```bash
    git clone https://github.com/jacbene/Ebeno-Research-Platform.git
    cd ebeno-research-platform
    ```

2.  **Installer les dépendances :**
    Ce script installe les dépendances pour le projet racine, le backend et le frontend.
    ```bash
    npm run setup
    ```

3.  **Configurer les variables d'environnement :**
    ```bash
    # Copier les fichiers d'exemple
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    
    # Configurer vos variables dans backend/.env
    DEEPSEEK_API_KEY=votre_clé_api_ici
    ```

4.  **Lancer l'environnement de développement :**
    Cette commande utilise `docker-compose` pour démarrer un conteneur PostgreSQL.
    ```bash
    npm run docker:up
    ```

5.  **Appliquer les migrations de la base de données :**
    ```bash
    cd backend
    npx prisma migrate dev
    cd ..
    ```

6.  **Démarrer les serveurs de développement :**
    Exécute simultanément les serveurs de développement pour le backend et le frontend.
    ```bash
    npm run dev
    ```

L'application sera alors accessible :
-   **Frontend** : `http://localhost:3000`
-   **Backend** : `http://localhost:5000`
-   **Documentation API** : `http://localhost:5000/api/health`

## Utilisation de l'Assistant IA

1. Connectez-vous à la plateforme
2. Accédez à l'assistant IA depuis le Dashboard
3. Posez vos questions de recherche
4. Utilisez les outils d'analyse spécialisés

## Scripts Disponibles

-   `npm run dev`: Démarre les serveurs de développement du backend et du frontend.
-   `npm run setup`: Installe toutes les dépendances du projet (racine, backend, frontend).
-   `npm run build:frontend`: Construit l'application frontend pour la production.
-   `npm run docker:up`: Démarre le conteneur de la base de données via Docker.
-   `npm run docker:down`: Arrête le conteneur de la base de données.
-   `npm run test:deepseek`: Teste la connexion à l'API DeepSeek.

## License

Ce projet est propriétaire et soumis au droit d'auteur.
Copyright (c) 2023, Entreprise Bene Mbama Jacques. Tous droits réservés.

Consultez le fichier `LICENSE` pour plus de détails sur les conditions d'utilisation.
