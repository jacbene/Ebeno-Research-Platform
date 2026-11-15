# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances (y compris dev pour le build)
RUN npm install --include=dev

# Copier le code source
COPY . .

# Compiler le TypeScript
RUN npm run build

# Supprimer les dépendances de dev pour alléger l'image
RUN npm prune --production

# Exposer le port
EXPOSE 5001

# Démarrer le serveur
CMD ["node", "dist/server.js"]
