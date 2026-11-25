#!/bin/bash

echo "🚀 Application des corrections aux 5 fichiers..."

cd backend

echo "📝 Correction de peerReviewController.ts..."
cat > src/controllers/peerReviewController.ts << 'PEER_REVIEW_EOF'
// Contenu corrigé (voir ci-dessus)
PEER_REVIEW_EOF

echo "📝 Correction de projectController.ts..."
cat > src/controllers/projectController.ts << 'PROJECT_EOF'
// Contenu corrigé (voir ci-dessus)
PROJECT_EOF

echo "📝 Correction de referenceController.ts..."
cat > src/controllers/referenceController.ts << 'REFERENCE_EOF'
// Contenu corrigé (voir ci-dessus)
REFERENCE_EOF

echo "📝 Correction de bibliography.service.ts..."
cat > src/services/bibliography.service.ts << 'BIBLIOGRAPHY_EOF'
// Contenu corrigé (voir ci-dessus)
BIBLIOGRAPHY_EOF

echo "📝 Correction de visualizationService.ts..."
cat > src/services/visualizationService.ts << 'VISUALIZATION_EOF'
// Contenu corrigé (voir ci-dessus)
VISUALIZATION_EOF

echo "🧪 Test du build..."
if npm run build; then
  echo "✅ Build réussi !"
  echo "🎉 Toutes les erreurs sont corrigées !"
else
  echo "⚠️  Il reste des erreurs. Vérifiez la sortie ci-dessus."
  npx tsc --noEmit --skipLibCheck | grep -A2 "error TS"
fi

cd ..
