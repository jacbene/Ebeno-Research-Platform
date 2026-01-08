#!/bin/bash

echo "🔧 Correction des types 'any' implicites..."

# Fonction pour ajouter des types aux paramètres
fix_file() {
  local file=$1
  
  # Remplacer les paramètres sans type par : any
  sed -i 's/(\([a-zA-Z_][a-zA-Z0-9_]*\))/\(\1: any\)/g' "$file"
  sed -i 's/\(map\|filter\|forEach\|reduce\|some\)(\([a-zA-Z_][a-zA-Z0-9_]*\) =>/\1(\(\2: any\) =>/g' "$file"
  sed -i 's/\(map\|filter\|forEach\|reduce\|some\)(\([a-zA-Z_][a-zA-Z0-9_]*\),\([a-zA-Z_][a-zA-Z0-9_]*\) =>/\1(\(\2: any, \3: any\) =>/g' "$file"
}

# Fichiers à corriger
FILES=(
  "src/controllers/projectController.ts"
  "src/controllers/peerReviewController.ts"
  "src/controllers/referenceController.ts"
  "src/services/visualizationService.ts"
  "src/services/bibliography.service.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Correction de $file"
    fix_file "$file"
  fi
done

echo "✅ Types implicites corrigés"
