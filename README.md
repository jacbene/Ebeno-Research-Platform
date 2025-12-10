# Plateforme de Recherche Ebeno

Plateforme de recherche collaborative conçue pour les Sciences Humaines et Sociales. Ce projet est une application web monorepo avec un backend s'appuyant sur Node.js, Express, et PostgreSQL, et un frontend en React.

## Architecture

Le projet est divisé en deux packages principaux :

- `backend` : Une API RESTful construite avec Express.js, TypeScript, et Prisma pour la gestion de la base de données.
- `frontend` : Une application web monopage (SPA) développée avec React, TypeScript, et Vite.

## Fonctionnalités

* **Backend**:
    * Authentification (inscription, connexion) avec JWT.
    * Gestion de projets de recherche.
    * Middleware pour la protection des routes.
* **Frontend**:
    * Interface utilisateur réactive avec React.
    * Gestion de l'état avec MobX.
    * Routage côté client avec React Router.
    * Communication avec le backend via des services API.

## Démarrage Rapide

### Prérequis

- Node.js (version 18 ou supérieure)
- Docker et Docker Compose
- Git

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

4. **Appliquer les migrations de la base de données :**
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
- Frontend : `http://localhost:5173`
- Backend : `http://localhost:3000`

## Scripts Disponibles

- `npm run dev`: Démarre les serveurs de développement du backend et du frontend.
- `npm run setup`: Installe toutes les dépendances.
- `npm run docker:up`: Démarre le conteneur de la base de données.
- `npm run docker:down`: Arrête le conteneur de la base de données.

## Variables d'Environnement

Le backend nécessite une variable d'environnement `DATABASE_URL` pour se connecter à la base de données PostgreSQL. Celle-ci est définie dans le fichier `dev.yml` pour l'environnement de développement IDX. Pour un environnement local, vous pouvez créer un fichier `.env` dans le dossier `backend` :

```
DATABASE_URL="postgresql://user:password@localhost:5432/ebeno_db?schema=public"
```
