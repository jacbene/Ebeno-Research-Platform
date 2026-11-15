# frontend/Dockerfile

# --- Étape 1 : Build ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Étape 2 : Serveur Nginx ---
FROM nginx:alpine

# Copier le build dans Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier une config Nginx personnalisée pour le routing React
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
