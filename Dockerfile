FROM node:18-alpine

WORKDIR /usr/src/app

COPY backend/package*.json ./

RUN npm install

COPY backend/ ./

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
