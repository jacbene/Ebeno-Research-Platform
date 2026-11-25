#!/bin/bash

echo "🚀 Lancement de la correction complète TypeScript..."

cd backend

echo "📦 Installation des dépendances manquantes..."
npm install --save-dev @types/swagger-ui-express @types/swagger-jsdoc @types/joi @types/socket.io
npm install joi swagger-ui-express swagger-jsdoc

echo "📝 Correction des imports..."
# Remplacer les imports incorrects
find src -name "*.ts" -type f -exec sed -i 's|from '"'"'../lib/prisma'"'"'|from '"'"'../lib/prisma'"'"'|g' {} \;
find src -name "*.ts" -type f -exec sed -i 's|from '"'"'../prisma'"'"'|from '"'"'../lib/prisma'"'"'|g' {} \;
find src -name "*.ts" -type f -exec sed -i 's|from '"'"'../../../lib/prisma'"'"'|from '"'"'../lib/prisma'"'"'|g' {} \;

echo "⚡ Correction des erreurs TypeScript..."
# Type assertions pour les erreurs
find src -name "*.ts" -type f -exec sed -i 's|error\.message|(error as Error)\.message|g' {} \;
find src -name "*.ts" -type f -exec sed -i 's|error\.code|(error as any)\.code|g' {} \;
find src -name "*.ts" -type f -exec sed -i 's|error\.response|(error as any)\.response|g' {} \;

echo "🧪 Test du build..."
if npm run build; then
  echo "✅ Build réussi !"
  echo "🚀 Lancement des tests..."
  if npm test; then
    echo "🎉 Tous les tests passent !"
  else
    echo "⚠️  Certains tests échouent, mais le build est OK"
  fi
else
  echo "❌ Build échoué. Vérifiez les erreurs ci-dessus."
  exit 1
fi

cd ..
