#!/bin/bash

echo "🔧 Correction des problèmes du serveur..."

cd backend

echo "📦 Installation des dépendances manquantes..."
npm install swagger-ui-express swagger-jsdoc joi
npm install --save-dev @types/swagger-ui-express @types/swagger-jsdoc @types/joi @types/socket.io

echo "📁 Création de la structure..."
mkdir -p src/config src/sockets src/swagger

echo "📝 Mise à jour du tsconfig.json..."
cat > tsconfig.json << 'TSCONFIG_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@config/*": ["config/*"],
      "@controllers/*": ["controllers/*"],
      "@routes/*": ["routes/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@middleware/*": ["middleware/*"],
      "@sockets/*": ["sockets/*"],
      "@swagger/*": ["swagger/*"]
    },
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "types": ["node", "jest"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
TSCONFIG_EOF

echo "✅ Corrections appliquées"
echo "🚀 Test du build..."
npm run build

if [ $? -eq 0 ]; then
    echo "🎉 Build réussi !"
else
    echo "❌ Build échoué. Vérifiez les erreurs ci-dessus."
fi

cd ..
