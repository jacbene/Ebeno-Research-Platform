# Installation Ebeno Research Platform — Self-Hosted

**Guide pour institutions académiques**  
Version : 2.5.0+ — Dernière mise à jour : Novembre 2026

> 🎯 **Objectif** : déployer la plateforme Ebeno Research sur vos propres serveurs, avec une **souveraineté totale sur les données de recherche**. Aucune donnée n'est envoyée à des services cloud tiers pour l'IA (sauf fallback optionnel explicitement activé).

---

## Table des matières

1. [Prérequis matériels](#1-prérequis-matériels)
2. [Prérequis logiciels](#2-prérequis-logiciels)
3. [Installation rapide (5 minutes)](#3-installation-rapide-5-minutes)
4. [Configuration détaillée (.env)](#4-configuration-détaillée-env)
5. [Démarrage des services](#5-démarrage-des-services)
6. [Téléchargement du modèle IA local](#6-téléchargement-du-modèle-ia-local)
7. [Création du compte administrateur](#7-création-du-compte-administrateur)
8. [Vérifications post-installation](#8-vérifications-post-installation)
9. [Accès à la plateforme](#9-accès-à-la-plateforme)
10. [Sauvegarde et restauration (PostgreSQL)](#10-sauvegarde-et-restauration-postgresql)
11. [Mise à jour](#11-mise-à-jour)
12. [Dépannage](#12-dépannage)
13. [Stockage local (MinIO)](#13-stockage-local-minio)
14. [Désactiver Ollama (repasser en mode cloud)](#14-désactiver-ollama-repasser-en-mode-cloud)

---

## 1. Prérequis matériels

| Configuration | Utilisateurs simultanés | RAM | CPU | Disque |
|---|---|---|---|---|
| **Minimale** (test/dev) | 1-5 | 8 GB | 4 cœurs | 30 GB |
| **Recommandée** (département) | 5-20 | 16 GB | 8 cœurs | 60 GB |
| **Production** (faculté) | 20-50 | 32 GB | 16 cœurs | 120 GB |
| **Grande échelle** | 50+ | 64 GB+ | 32 cœurs+ | 250 GB+ |

> ⚠️ **Le CPU est le facteur limitant pour Ollama**, pas la RAM. Un modèle `llama3.1` (8B) en self-hosted sur CPU met **5-30 secondes** par réponse (contre 1-3s pour le cloud). Pour des performances proches du cloud, un GPU NVIDIA (RTX 3090 / A10 / A100) est recommandé.

### Matériel GPU (optionnel mais recommandé)

Si votre serveur dispose d'un GPU NVIDIA :
- Installer `nvidia-container-toolkit` : https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
- Ollama détecte automatiquement le GPU → performances ×10 à ×50
- Modèles recommandés : `llama3.1:8b` (6 GB VRAM), `mistral:7b` (5 GB VRAM)

---

## 2. Prérequis logiciels

| Logiciel | Version minimale | Vérification |
|---|---|---|
| Docker Engine | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | 2.30+ | `git --version` |
| (optionnel) GPU NVIDIA | driver 535+ | `nvidia-smi` |

### Installation Docker (Ubuntu/Debian)

```bash
# 1. Retirer les anciennes versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# 2. Installer Docker officiel
curl -fsSL https://get.docker.com | sudo sh

# 3. Ajouter votre utilisateur au groupe docker (évite "sudo" partout)
sudo usermod -aG docker $USER
newgrp docker   # ou déconnexion/reconnexion

# 4. Vérification
docker --version          # → Docker version 24.x.x
docker compose version    # → Docker Compose version v2.x.x
```

## 3. Installation rapide (5 minutes)

```bash
# 1. Cloner le dépôt
git clone https://github.com/<votre-org>/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform

# 2. Préparer l'environnement backend
cp backend/.env.example backend/.env
# Éditer les variables critiques → voir section 4

# 3. Lancer toute la stack
docker compose up -d

# 4. Suivre le pull du modèle IA (5-15 min au premier démarrage)
docker compose logs -f ollama-init
# Attendre "success" ou "pulled llama3.1", puis Ctrl+C

# 5. Vérifier
curl -s http://localhost:5000/api/health
# Attendu : {"status":"ok"}
```

💡 Pour un environnement de production, préférez la section 4 (configuration détaillée) avant de lancer docker compose up -d.

---

## 4. Configuration détaillée (.env)

Les variables essentielles à configurer dans backend/.env :

```bash
# ─── Application ───
NODE_ENV=production
PORT=5001
JWT_SECRET=<openssl rand -hex 32>   # ⚠️ 32 caractères minimum

# ─── Base de données ───
DATABASE_URL=postgresql://ebeno:mot_de_passe_fort@db:5432/ebeno

# ─── Stockage (voir section 13) ───
STORAGE_PROVIDER=minio               # ou 'cloudinary'
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=<openssl rand -hex 32>
MINIO_SECRET_KEY=<openssl rand -hex 64>
MINIO_BUCKET=ebeno-files
# MINIO_PUBLIC_URL=https://files.mon-universite.fr

# ─── IA locale ───
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1

# ─── Emails (Brevo, section 14 si auto-hébergé) ───
BREVO_API_KEY=<votre clé Brevo>

# ─── Fallback cloud (optionnel) ───
# DEEPSEEK_API_KEY=
# OPENAI_API_KEY=
```

🔒 Règle : JWT_SECRET et secrets MinIO doivent être uniques et forts. Ne jamais réutiliser les valeurs d'exemple.

---

## 5. Démarrage des services

```bash
# Démarrer tous les services en arrière-plan
docker compose up -d

# Vérifier l'état (7 services attendus)
docker compose ps
```

Sortie attendue :

```
NAME                 STATUS
ebeno-db             running (healthy)
ebeno-minio          running (healthy)
ebeno-minio-init     exited (0)      ← attendu
ebeno-ollama         running
ebeno-ollama-init    exited (0)      ← attendu
ebeno-backend        running
ebeno-frontend       running
```

⚠️ minio-init et ollama-init sont des jobs d'initialisation one-shot. exited (0) = succès.

---

## 6. Téléchargement du modèle IA local

Au premier lancement, ollama-init télécharge llama3.1 (~4.7 Go). Suivez l'avancement :

```bash
docker compose logs -f ollama-init
```

Attendez la ligne success ou pulled llama3.1, puis Ctrl+C (le suivi n'arrête pas le service).

Pour remplacer par un modèle plus léger (RAM < 8 Go) :

```bash
# Éditer docker-compose.yml ou .env
OLLAMA_MODEL=llama3.2:3b
docker compose up -d --force-recreate ollama-init
```

---

## 7. Création du compte administrateur

Deux options :

a) Via l'interface web (recommandé)

1. Aller sur http://localhost:3000
2. Cliquer sur Inscription
3. S'inscrire avec votre email
4. Vérifier l'email de confirmation

b) Via CLI (pour automatiser)

```bash
docker compose exec backend node -e "
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const id = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
console.log('ID:', id);
console.log('Password hash:', bcrypt.hashSync('motdepasse', 10));
// Insérer ensuite via psql avec l'ID et le hash
"
```

---

## 8. Vérifications post-installation

```bash
# Backend
curl -s http://localhost:5000/api/health

# Base de données
docker compose exec db psql -U ebeno -d ebeno -c "\dt"

# MinIO (section 13)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000/minio/health/live

# Ollama
curl -s http://localhost:11434/api/tags | jq '.models[].name'
```

---

## 9. Accès à la plateforme

| Service | URL | Identifiants |
|---|---|---|
| Frontend Ebeno | http://localhost:3000 | Compte créé en section 7 |
| API Backend | http://localhost:5001/api | — |
| Console MinIO | http://localhost:9001 | MINIO_ACCESS_KEY / MINIO_SECRET_KEY |

Pour la production, configurez un reverse proxy Nginx/Traefik avec HTTPS Let's Encrypt devant les 3 services.

---

## 10. Sauvegarde et restauration (PostgreSQL)

La base de données contient la structure (users, projects, files, etc.). Les fichiers binaires sont dans MinIO (voir section 13.5).

Sauvegarde manuelle

```bash
docker compose exec db pg_dump -U ebeno -Fc ebeno > backup-$(date +%F).dump
```

Sauvegarde automatique (cron quotidien)

```bash
# /usr/local/bin/pg-backup.sh
#!/bin/bash
set -euo pipefail
BACKUP_DIR="/backup/postgres"
mkdir -p "$BACKUP_DIR"
docker compose -f /opt/ebeno/docker-compose.yml exec -T db \
  pg_dump -U ebeno -Fc ebeno > "$BACKUP_DIR/ebeno-$(date +%F_%H-%M).dump"
find "$BACKUP_DIR" -name "ebeno-*.dump" -mtime +30 -delete
```

Restauration

```bash
docker compose stop backend
docker compose exec -T db pg_restore -U ebeno -d ebeno --clean --if-exists < backup-YYYY-MM-DD.dump
docker compose start backend
```

---

## 11. Mise à jour

```bash
# 1. Récupérer la nouvelle version
git pull origin main

# 2. Rebuild des images
docker compose build backend frontend

# 3. Redémarrer
docker compose up -d

# 4. Vérifier les migrations (sync auto dans server.ts)
docker compose logs backend | grep -i migration
```

⚠️ Sauvegardez la DB et MinIO avant toute mise à jour (sections 10 et 13.5).

---

## 12. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Backend 502 | Backend pas prêt au boot | Attendre 30s, puis `docker compose ps` |
| Ollama très lent | CPU/RAM insuffisants | Réduire modèle : `llama3.2:3b` |
| MinIO 403 sur les URLs | `MINIO_PUBLIC_URL` absent derrière proxy | Section 13.6 point 5 |
| Migration directory is corrupt | Sync `.ts ↔ .js` désactivée | Vérifier `server.ts` (section 13.6 point 4) |
| ECONNREFUSED ollama:11434 | `ollama-init` pas fini | `docker compose logs -f ollama-init` |
| Cannot find module 'knex' | Build backend incomplet | `docker compose build --no-cache backend` |
| Frontend blank | Build Vite échoué | `docker compose logs frontend` |

Pour tout autre problème :

```bash
docker compose logs --tail=200 <service>
docker compose exec <service> sh   # pour explorer
```

---

## 13. Stockage local (MinIO)

Par défaut, Ebeno stocke les fichiers (PDF, DOCX, audio, exports) chez Cloudinary (service cloud US). Pour une souveraineté totale, activez MinIO (S3-compatible, open source, auto-hébergé).

### 13.1 Pourquoi MinIO ?

| Critère | Cloudinary (SaaS) | MinIO (self-hosted) |
|---|---|---|
| Localisation données | US (par défaut) | Votre serveur |
| Coût récurrent | Payant au-delà du free tier | Gratuit (juste le disque) |
| RGPD / souveraineté | ⚠️ Transfert hors UE | ✅ Aucun transfert |
| Compatibilité code | ✅ | ✅ (abstraction `storageService`) |

### 13.2 Activation (déjà configurée dans docker-compose.yml)

MinIO est inclus par défaut dans docker-compose.yml (services minio + minio-init). Pour l'activer :

```bash
# 1. Éditer backend/.env
nano backend/.env

# 2. Changer STORAGE_PROVIDER
STORAGE_PROVIDER=minio

# 3. Personnaliser les credentials (⚠️ OBLIGATOIRE en production)
MINIO_ACCESS_KEY=<openssl rand -hex 32>
MINIO_SECRET_KEY=<openssl rand -hex 64>
MINIO_BUCKET=ebeno-files

# 4. (Optionnel) URL publique si vous avez un domaine dédié
# MINIO_PUBLIC_URL=https://files.mon-universite.fr

# 5. Redémarrer le backend
docker compose up -d --force-recreate backend
```

### 13.3 Console d'administration MinIO

MinIO expose une console web sur http://localhost:9001 :

1. Se connecter avec MINIO_ACCESS_KEY / MINIO_SECRET_KEY
2. Aller dans Buckets → ebeno-files
3. Vous pouvez y voir tous les fichiers uploadés (avatars, projets, exports)
4. Créer un utilisateur dédié (Settings → Users) plutôt que d'utiliser le compte root

⚠️ Ne jamais exposer le port 9001 directement sur Internet sans HTTPS. En production, mettez la console derrière un VPN ou un reverse proxy authentifié.

### 13.4 Vérification

Une fois MinIO démarré, validez les 3 niveaux suivants.

1. Health check API

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000/minio/health/live
# Attendu : 200
```

2. Bucket créé automatiquement (minio-init)

Installez le client officiel mc :

```bash
# Linux x86_64
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# macOS
brew install minio/stable/mc

# Vérification
mc --version
```

Configurez l'alias et listez le bucket :

```bash
mc alias set ebeno http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
mc ls ebeno/
# Attendu : [date]     0B ebeno-files/
```

3. Upload de bout en bout (via l'application)

1. Connectez-vous sur http://localhost:3000
2. Créez un projet → uploadez un fichier (PDF, DOCX, etc.)
3. Vérifiez que l'objet apparaît dans MinIO :

```bash
mc ls --recursive ebeno/ebeno-files/
# Attendu : [date]  1.2MiB STANDARD avatars/user-xxx/xxxx.png
#           [date]  340KiB STANDARD projects/project-xxx/yyyy.pdf
```

4. Vérifiez que le téléchargement fonctionne depuis l'UI → le fichier doit s'ouvrir.

4. Health check backend

```bash
curl -s http://localhost:5001/api/health/ready | jq
# Attendu : { "status": "ok", "storage": true, ... }
```

Si storage: false → consulter les logs : docker compose logs backend | grep -i minio.

### 13.5 Sauvegarde et restauration

Le volume minio_data contient tous les fichiers uploadés. En cas de sinistre (disque HS, erreur de manipulation), sans sauvegarde, les fichiers sont perdus.

1. Sauvegarde manuelle (test)

```bash
# Créer un dossier de backup sur un disque séparé (⚠️ jamais dans le volume Docker)
sudo mkdir -p /backup/minio/ebeno-files
sudo chown $USER:$USER /backup/minio -R

# Mirror complet (idempotent, ne re-télécharge que les nouveaux/changed files)
mc mirror --overwrite --preserve ebeno/ebeno-files /backup/minio/ebeno-files

# Vérifier
du -sh /backup/minio/ebeno-files
mc du ebeno/ebeno-files
# Les deux tailles doivent être proches
```

2. Sauvegarde automatique (cron quotidien)

```bash
sudo nano /usr/local/bin/minio-backup.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_ROOT="/backup/minio"
LOG_FILE="/var/log/minio-backup.log"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# 1. Mirror incrémental vers la cible principale
mc mirror --overwrite --preserve ebeno/ebeno-files "$BACKUP_ROOT/ebeno-files" \
  >> "$LOG_FILE" 2>&1

# 2. Snapshot hebdomadaire (dimanche) — conserve 4 semaines
if [ "$(date +%u)" = "7" ]; then
  mc mirror --overwrite ebeno/ebeno-files "$BACKUP_ROOT/snapshots/$DATE" \
    >> "$LOG_FILE" 2>&1
  # Purge des snapshots > 28 jours
  find "$BACKUP_ROOT/snapshots" -maxdepth 1 -type d -mtime +28 -exec rm -rf {} \;
fi

# 3. Rotation log (garde 30 jours)
find /var/log -name "minio-backup.log.*" -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/minio-backup.sh

# Ajouter au cron (tous les jours à 02:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/minio-backup.sh") | crontab -

# Vérifier
crontab -l
```

3. Restauration

Trois scénarios selon la gravité :

a) Fichier isolé supprimé par erreur

```bash
mc cp /backup/minio/ebeno-files/projects/project-xxx/file.pdf ebeno/ebeno-files/projects/project-xxx/file.pdf
```

b) Volume Docker corrompu (repartir de zéro)

```bash
docker compose stop backend
docker compose stop minio
docker volume rm ebeno-research-platform_minio_data  # ⚠️ vérifier le nom exact : docker volume ls
docker compose up -d minio minio-init
mc mirror /backup/minio/ebeno-files ebeno/ebeno-files
docker compose up -d backend
```

c) Sinistre total (nouveau serveur)

```bash
mc alias set ebeno http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
mc mirror /chemin/vers/backup/ebeno-files ebeno/ebeno-files
pg_restore -d ebeno /chemin/vers/backup-postgres.dump
```

4. Test de restauration trimestriel (recommandé)

Une sauvegarde jamais testée n'est pas une sauvegarde. Tous les 3 mois :

1. Créez un MinIO temporaire (docker run -d -p 9010:9000 minio/minio server /data)
2. Restaurez depuis /backup/minio/ebeno-files
3. Vérifiez l'intégrité avec mc ls --recursive --summarize
4. Documentez la procédure et le temps de restauration

### 13.6 Limitations et points d'attention

1. Single-node — pas de réplication
MinIO en mode standalone (config actuelle docker-compose.yml) n'offre pas de réplication. Si le disque hôte tombe, le service tombe avec lui. Pour la haute disponibilité, il faudrait un cluster MinIO 4+ nœuds (hors scope université standard).

2. Quotas disque
Estimation : 100 projets × 500 Mo = 50 Go ; 1000 projets × 500 Mo = 500 Go. Prévoir 3× la taille estimée pour les snapshots de sauvegarde.

```bash
df -h /var/lib/docker/volumes/
mc admin info ebeno
```

3. Nom de colonne hérité : project_files.cloudinaryPublicId
Malgré le nom, cette colonne stocke la clé générique (projects/xxx/file.pdf), valable aussi pour MinIO. Fonctionnel, mais trompeur — renommage en storagePublicId prévu en v2.6. Ne pas renommer manuellement en DB.

4. Sync migrations .ts ↔ .js (règle #3)

backend/src/server.ts synchronise automatiquement l'extension des migrations selon NODE_ENV :

```ts
if (isProd) {
  UPDATE knex_migrations SET name = REPLACE(name, '.ts', '.js');
} else {
  UPDATE knex_migrations SET name = REPLACE(name, '.js', '.ts');
}
```

En self-hosted NODE_ENV=production (cas normal), les migrations doivent être compilées en .js :

```bash
cd backend && npm run build   # tsc → dist/
```

5. MINIO_PUBLIC_URL et reverse proxy

Si MinIO est derrière un reverse proxy (Nginx, Traefik), configurez MINIO_PUBLIC_URL pour que les URLs renvoyées à l'UI pointent vers le domaine public :

```bash
# backend/.env
MINIO_PUBLIC_URL=https://files.mon-universite.fr
```

Sans cela, les URLs (user.avatar, file.url) pointeront vers http://minio:9000/... — inaccessible depuis le navigateur de l'utilisateur.

6. Bonnes pratiques production

| ✅ À faire | ❌ À éviter |
|---|---|
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` forts (`openssl rand -hex 32/64`) | Garder `minioadmin` |
| Sauvegarde cron quotidienne (section 13.5) | Aucune sauvegarde |
| HTTPS via reverse proxy + Let's Encrypt | HTTP en clair sur Internet |
| `STORAGE_PROVIDER=minio` + `MINIO_PUBLIC_URL` configurés | Oubli du provider |
| Test de restauration trimestriel | Confiance aveugle dans les backups |

---

## 14. Désactiver Ollama (repasser en mode cloud)

Si vous souhaitez revenir à un mode hybride (IA cloud pour de meilleures performances) tout en gardant la souveraineté sur les fichiers :

```bash
# 1. Éditer backend/.env
nano backend/.env

# 2. Vider OLLAMA_URL (désactive la cascade Ollama)
OLLAMA_URL=

# 3. Vérifier que les fallbacks cloud sont configurés
DEEPSEEK_API_KEY=<votre clé>
# OPENAI_API_KEY=<votre clé>  # fallback secondaire

# 4. Redémarrer
docker compose up -d --force-recreate backend

# 5. (Optionnel) Arrêter Ollama pour libérer la RAM
docker compose stop ollama
```

Le code chatService.ts et streamService.ts gèrent automatiquement l'absence d'OLLAMA_URL : la cascade passe directement à DeepSeek → OpenAI.

⚠️ Attention : en mode cloud, les données envoyées à l'IA sortent de votre infrastructure. Pour une souveraineté totale, gardez OLLAMA_URL configuré.

---

Fin du guide — Pour toute question : contact@ebenoresearch.com
