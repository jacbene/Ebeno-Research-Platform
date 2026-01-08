#!/bin/bash

echo "🔧 Correction des erreurs req.user..."

# Fonction pour sécuriser l'accès à req.user
secure_req_user() {
  sed -i 's/const userId = req\.user\.id;/const userId = req\.user\?.id;\n  if (!userId) {\n    return res.status(401).json({ error: "Utilisateur non authentifié" });\n  }/g' "$1"
  
  sed -i 's/error\.message/error instanceof Error ? error.message : String(error)/g' "$1"
  sed -i 's/error\.response\.status/error instanceof Error \&\& (error as any)\.response\.status/g' "$1"
  sed -i 's/error\.response\.data/error instanceof Error \&\& (error as any)\.response\.data/g' "$1"
}

# Appliquer aux fichiers problématiques
FILES=(
  "src/controllers/peerReviewController.ts"
  "src/controllers/referenceController.ts"
  "src/controllers/projectController.ts"
  "src/middleware/apiAuthMiddleware.ts"
  "src/services/mobileSyncService.ts"
  "src/services/webhookService.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Sécurisation de $file"
    secure_req_user "$file"
  fi
done

echo "✅ req.user sécurisé"
