# Plateforme de Recherche Ebeno

**Statut du déploiement :** [![Deployment](https://github.com/your-username/ebeno-research-platform/actions/workflows/firebase-hosting-pull-request.yml/badge.svg)](https://ebeno-research-platform.web.app/)

Plateforme de recherche collaborative conçue pour les Sciences Humaines et Sociales (SHS). Ce projet est une application web monorepo avec un backend s'appuyant sur Node.js/Express et un frontend en React, entièrement développé en TypeScript.

L'application est désormais multilingue (Français, Anglais, Arabe) et déployée sur Firebase Hosting.

## Prochaines Étapes

Nous avons une feuille de route détaillée pour les futures fonctionnalités. Vous pouvez la consulter ici : [**ROADMAP.md**](./ROADMAP.md).

## Architecture

Le projet est divisé en deux packages principaux :

-   `backend` : Une API RESTful construite avec Express.js, TypeScript, et Prisma pour la gestion de la base de données PostgreSQL.
-   `frontend` : Une application web monopage (SPA) développée avec React, TypeScript, Vite, et stylisée avec Tailwind CSS.

## Fonctionnalités Actuelles

*   **Backend**:
    *   Authentification sécurisée (inscription, connexion) avec JWT.
    *   Gestion de projets, documents et transcriptions.
    *   Middleware pour la protection des routes.
*   **Frontend**:
    *   Interface utilisateur réactive construite avec React 19 et Vite.
    *   Gestion de l'état global avec Zustand.
    *   Routage côté client avec React Router v6.
    *   **Internationalisation (i18n)** avec `i18next` pour le support multilingue.
    *   Composants d'interface stylisés avec Tailwind CSS.
    *   Application Web Progressive (PWA) pour une expérience hors ligne.
*   **Déploiement**:
    *   Déploiement continu sur **Firebase Hosting**.

## Démarrage Rapide

### Prérequis

-   Node.js (version 20.19+ ou 22.12+)
-   Docker et Docker Compose
-   Git

### Installation et Lancement

1.  **Cloner le dépôt :**
    ```bash
    git clone [URL-du-depot]
    cd ebeno-research-platform
    ```

2.  **Installer les dépendances :**
    Ce script installe les dépendances pour le projet racine, le backend et le frontend.
    ```bash
    npm run setup
    ```

3.  **Lancer l'environnement de développement :**
    Cette commande utilise `docker-compose` pour démarrer un conteneur PostgreSQL.
    ```bash
    npm run docker:up
    ```

4.  **Appliquer les migrations de la base de données :**
    ```bash
    cd backend
    npx prisma migrate dev
    cd ..
    ```

5.  **Démarrer les serveurs de développement :**
    Exécute simultanément les serveurs de développement pour le backend et le frontend.
    ```bash
    npm run dev
    ```

L'application sera alors accessible :
-   **Frontend** : `http://localhost:3000`
-   **Backend** : `http://localhost:5000`

## Scripts Disponibles

-   `npm run dev`: Démarre les serveurs de développement du backend et du frontend.
-   `npm run setup`: Installe toutes les dépendances du projet (racine, backend, frontend).
-   `npm run build:frontend`: Construit l'application frontend pour la production.
-   `npm run docker:up`: Démarre le conteneur de la base de données via Docker.
-   `npm run docker:down`: Arrête le conteneur de la base de données.
