# Installation Ebeno Research Platform — Self-Hosted

**Guide pour institutions académiques**
Version visée : **2.6.0** — Révision du 16 novembre 2026

> 🎯 **Objectif** : déployer Ebeno Research sur vos propres serveurs, avec une souveraineté
> totale sur les données de recherche. Aucune donnée n'est envoyée à un service cloud tiers
> pour l'IA lorsque le fallback optionnel n'est pas activé.

> ⚠️ **Note de révision** : ce document répare la structure du guide précédent (section 13
> insérée avant la section 1, sections 3 à 12 absentes). Les sections 3 à 12 ont été
> reconstruites à partir de `docker-compose.yml` et du code (`storageService`, `minioService`,
> `uploadController`) : à relire avant publication.

---

## Table des matières

1. [Prérequis matériels](#1-prérequis-matériels)
2. [Prérequis logiciels](#2-prérequis-logiciels)
3. [Installation rapide (5 minutes)](#3-installation-rapide-5-minutes)
4. [Configuration (.env)](#4-configuration-env)
5. [Démarrage des services](#5-démarrage-des-services)
6. [Téléchargement du modèle IA local](#6-téléchargement-du-modèle-ia-local)
7. [Création du compte administrateur](#7-création-du-compte-administrateur)
8. [Vérifications post-installation](#8-vérifications-post-installation)
9. [Accès à la plateforme](#9-accès-à-la-plateforme)
10. [Sauvegarde et restauration](#10-sauvegarde-et-restauration)
11. [Mise à jour](#11-mise-à-jour)
12. [Dépannage](#12-dépannage)
13. [Stockage local (MinIO)](#13-stockage-local-minio)

---

## 1. Prérequis matériels

| Configuration | Utilisateurs simultanés | RAM | CPU | Disque |
|---|---|---|---|---|
| **Minimale** (test/dev) | 1-5 | 8 GB | 4 cœurs | 30 GB |
| **Recommandée** (département) | 5-20 | 16 GB | 8 cœurs | 60 GB |
| **Production** (faculté) | 20-50 | 32 GB | 16 cœurs | 120 GB |
| **Grande échelle** | 50+ | 64 GB+ | 32 cœurs+ | 250 GB+ |

> ⚠️ **Le CPU est le facteur limitant pour Ollama**, pas la RAM. Un modèle `llama3.1` (8B)
> sur CPU met **5-30 secondes** par réponse (contre 1-3 s pour le cloud).

### Matériel GPU (optionnel mais recommandé)

- Installer `nvidia-container-toolkit` :
  <https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html>
- Décommenter le bloc `deploy.resources` du service `ollama-init` dans `docker-compose.yml`
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

---

## 3. Installation rapide (5 minutes)

```bash
git clone https://github.com/jacbene/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform

cp .env.example .env
openssl rand -hex 32        # → coller dans JWT_SECRET
openssl rand -hex 16        # → coller dans MINIO_ACCESS_KEY
openssl rand -hex 32        # → coller dans MINIO_SECRET_KEY
nano .env

docker compose up -d
```

> ⏳ Le premier démarrage télécharge les images (~2 Go) **et** le modèle `llama3.1` (~4,7 Go) :
> comptez 10 à 30 minutes selon la connexion. Les démarrages suivants prennent < 30 s.

---

## 4. Configuration (.env)

### Deux fichiers, deux rôles — ne pas les confondre

| Fichier | Lu par | Rôle |
|---|---|---|
| **`.env`** (racine du dépôt) | `docker compose` (interpolation `${VAR}`) | Credentials MinIO, `JWT_SECRET`, `STORAGE_PROVIDER`, URL publique |
| `backend/.env` | L'application Node elle-même | Développement local uniquement (`npm run dev` hors Docker) |

⚠️ **Piège classique** : éditer `backend/.env` en croyant configurer les conteneurs. Docker
Compose n'y lit rien ; les `${MINIO_ACCESS_KEY}` retombent alors sur `minioadmin` et MinIO
répond `SignatureDoesNotMatch`.

### Variables de `.env` (racine)

| Variable | Obligatoire | Exemple | Rôle |
|---|---|---|---|
| `JWT_SECRET` | ✅ | `openssl rand -hex 32` | Signature des jetons. Compose refuse de démarrer si absent. |
| `STORAGE_PROVIDER` | ✅ | `minio` ou `cloudinary` | Backend de stockage. |
| `MINIO_ACCESS_KEY` | ✅ (si minio) | `openssl rand -hex 16` | Compte root MinIO + credentials backend. |
| `MINIO_SECRET_KEY` | ✅ (si minio) | `openssl rand -hex 32` | Mot de passe root MinIO. |
| `MINIO_BUCKET` | — | `ebeno-files` | Bucket créé par `minio-init`. |
| `MINIO_PUBLIC_URL` | — | `http://192.168.1.50:9000` | Base des URL stockées en base. **Ne pas laisser `localhost` en production.** |
| `DATABASE_URL` | — | `postgres://ebeno:ebeno_secret@db:5432/ebeno_db` | Connexion Knex. |
| `POSTGRES_PASSWORD` | — | `ebeno_secret` | Doit rester cohérent avec `DATABASE_URL` et le service `db`. |

### Variables en lecture seule (fixées par le compose)

`PORT=5001`, `OLLAMA_URL=http://ollama:11434`, `OLLAMA_MODEL=llama3.1`,
`MINIO_ENDPOINT=http://minio:9000` (réseau interne Docker).

---

## 5. Démarrage des services

```bash
docker compose up -d
docker compose ps
```

État attendu :

| Service | État attendu | Rôle |
|---|---|---|
| `db` | `running (healthy)` | PostgreSQL 15 |
| `ollama` | `running (healthy)` | Serveur d'inférence |
| `ollama-init` | `exited (0)` | A téléchargé le modèle puis s'est arrêté — **normal** |
| `minio` | `running (healthy)` | Stockage S3 |
| `minio-init` | `exited (0)` | A créé le bucket — **normal** |
| `backend` | `running` | API Node (port 5001) |
| `frontend` | `running` | Nginx (port 80) |

Suivre les logs : `docker compose logs -f backend`

---

## 6. Téléchargement du modèle IA local

Le service `ollama-init` exécute `ollama pull llama3.1` une seule fois, puis s'arrête.
Il **n'affiche pas** de message `success` : la fin du téléchargement se voit dans ses logs
(`pulling manifest` → `success` variable selon les versions) **et** se vérifie ainsi :

```bash
docker compose exec ollama ollama list
# → llama3.1:latest    <taille>    <date>
```

Si la liste est vide :

```bash
docker compose run --rm ollama-init
```

Pour un autre modèle : modifier `OLLAMA_MODEL` (service `backend`) **et** l'entrypoint de
`ollama-init` (`ollama pull <modèle>`), puis `docker compose up -d --force-recreate backend`.

---

## 7. Création du compte administrateur

Aucun script de seed n'existe dans le dépôt : créer l'admin manuellement.

```bash
# 1. Créer le compte via l'interface (http://<serveur>/register)

# 2. Promouvoir en administrateur
docker compose exec db psql -U ebeno -d ebeno_db \
  -c "UPDATE users SET role='ADMIN' WHERE email='vous@universite.fr';"

# 3. Vérifier
docker compose exec db psql -U ebeno -d ebeno_db \
  -c "SELECT id, email, role FROM users;"
```

Les rôles applicatifs sont en majuscules (`ADMIN`, `RESEARCHER`, …) — cf. `userController.ts`.

---

## 8. Vérifications post-installation

| # | Vérification | Commande / action | Attendu |
|---|---|---|---|
| 1 | 7 services | `docker compose ps` | cf. tableau §5 |
| 2 | Santé API | `curl -s http://localhost:5001/api/health` | `{"status":"ok"...}` |
| 3 | Frontend | `curl -sI http://localhost/` | `HTTP/1.1 200` |
| 4 | IA locale | `docker compose exec ollama ollama list` | `llama3.1` présent |
| 5 | MinIO | `curl -s http://localhost:9000/minio/health/live` | `200 OK` (corps vide) |
| 6 | Bucket | `docker compose run --rm minio-init` (idempotent) | `✅ MinIO bucket ready` |
| 7 | Upload | via l'UI : projet → fichier | fichier visible dans le bucket (§13.2) |
| 8 | Chat | via l'UI : question simple | réponse sans clé cloud configurée |

> ℹ️ Le endpoint exact du health check peut varier (`/api/health`, `/health`) : cf.
> `backend/src/routes/healthRoutes.ts` et le montage dans `app.ts`.

---

## 9. Accès à la plateforme

| Interface | URL |
|---|---|
| Application | `http://<ip-du-serveur>/` |
| API | `http://<ip-du-serveur>:5001/` |
| Console MinIO | `http://<ip-du-serveur>:9001/` |
| Ollama (API brute) | `http://<ip-du-serveur>:11434/` |

Pour un accès HTTPS, placer un reverse-proxy (Caddy, Nginx, Traefik) devant le port 80 et
le port 5001, et définir `MINIO_PUBLIC_URL` avec l'URL HTTPS publique.

⚠️ En l'état, les ports 5432 / 9000 / 9001 / 11434 sont exposés par le compose : à restreindre
(firewall ou suppression des `ports:` pour `db` et `minio`) sur un serveur accessible depuis
Internet.

---

## 10. Sauvegarde et restauration

### Sauvegarder

```bash
mkdir -p ~/backups/ebeno/$(date +%F)
cd ~/backups/ebeno/$(date +%F)

# Base de données
docker compose -f /opt/Ebeno-Research-Platform/docker-compose.yml \
  exec -T db pg_dump -U ebeno -d ebeno_db | gzip > db.sql.gz

# Fichiers MinIO (miroir du bucket vers le disque hôte)
docker run --rm --network host -v "$PWD":/backup \
  minio/mc sh -c "
    mc alias set local http://127.0.0.1:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY &&
    mc mirror local/ebeno-files /backup/minio"

# Volumes (optionnel : le modèle Ollama est re-téléchargeable)
docker run --rm -v ebeno_db_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/volumes.tar.gz -C /data .
```

### Restaurer

```bash
gunzip -c db.sql.gz | docker compose exec -T db psql -U ebeno -d ebeno_db
docker run --rm --network host -v "$PWD/minio":/backup minio/mc sh -c "
  mc alias set local http://127.0.0.1:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY &&
  mc mirror /backup local/ebeno-files"
```

Fréquence recommandée : quotidienne (cron à 02:00), rétention 30 jours, copie hors site.

---

## 11. Mise à jour

```bash
cd /opt/Ebeno-Research-Platform
git pull
docker compose up -d --build          # reconstruit backend + frontend
docker compose ps                     # vérifier les 7 services
```

- Les migrations Knex sont appliquées au démarrage du backend *(à confirmer selon `server.ts`)* ;
  sinon : `docker compose exec backend npm run migrate`.
- `docker compose up -d --build` sans `--force-recreate` conserve les volumes (données intactes).
- Conserver une sauvegarde avant toute montée de version majeure.

---

## 12. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `JWT_SECRET manquant` au `up` | `.env` racine absent/vide | `cp .env.example .env`, renseigner `JWT_SECRET` |
| `SignatureDoesNotMatch` | Credentials MinIO différents entre `minio` et `backend` | Une seule source : `.env` racine ; `docker compose up -d --force-recreate` |
| Upload OK mais absent du bucket | L'UI appelle `POST /projects/:id/files` (écrit en local) au lieu de `POST /upload` | À vérifier côté frontend (voir §13.5) |
| Liens fichiers en `localhost:9000` | `MINIO_PUBLIC_URL` non défini | Renseigner l'IP/domaine public, redémarrer backend |
| `minio-init` en `exited (1)` | MinIO pas encore healthy | `docker compose logs minio-init`, relancer `docker compose up -d minio-init` |
| `ollama-init` en boucle | Réseau sortant bloqué (proxy université) | Télécharger le modèle hors ligne (`ollama pull` sur un poste, copier `ollama_data`) |
| Backend en `Restarting` | Migration en échec ou `DATABASE_URL` invalide | `docker compose logs backend` |
| 502 sur le frontend | Backend pas prêt | `depends_on` est souple ; attendre ou ajouter un healthcheck |
| Port 80 occupé | Apache/Nginx déjà installé sur l'hôte | `sudo systemctl stop nginx` ou changer le mapping `ports:` |

---

## 13. Stockage local (MinIO)

Par défaut, Ebeno peut stocker les fichiers chez **Cloudinary** (SaaS). Pour une souveraineté
totale, activer **MinIO** (S3-compatible, open source, auto-hébergé).

### 13.1 Activation

MinIO est déjà inclus dans `docker-compose.yml` (services `minio` + `minio-init`, volume
`minio_data`). Il suffit de configurer `.env` (racine) :

```dotenv
STORAGE_PROVIDER=minio
MINIO_ACCESS_KEY=<openssl rand -hex 16>
MINIO_SECRET_KEY=<openssl rand -hex 32>
MINIO_BUCKET=ebeno-files
MINIO_PUBLIC_URL=http://<ip-ou-domaine>:9000   # ou https://files.universite.fr
```

```bash
docker compose up -d --force-recreate backend minio minio-init
```

Le code bascule automatiquement via `storageService.ts` (`STORAGE_PROVIDER`), sans changement
de contrôleur. `minioService` force `forcePathStyle: true` (obligatoire pour MinIO).

### 13.2 Vérification

```bash
# 1. Le bucket existe
docker run --rm --network host \
  -e MC_ACCESS=$MINIO_ACCESS_KEY -e MC_SECRET=$MINIO_SECRET_KEY \
  minio/mc sh -c 'mc alias set local http://127.0.0.1:9000 $MC_ACCESS $MC_SECRET && mc ls local'

# 2. Console web
#    http://<serveur>:9001  → login MINIO_ACCESS_KEY / MINIO_SECRET_KEY

# 3. Après un upload depuis l'UI
docker run --rm --network host \
  -e MC_ACCESS=$MINIO_ACCESS_KEY -e MC_SECRET=$MINIO_SECRET_KEY \
  minio/mc sh -c 'mc alias set local http://127.0.0.1:9000 $MC_ACCESS $MC_SECRET && mc ls -r local/ebeno-files'
# → doit lister projects/<projectId>/<timestamp>-<rand>.<ext>
```

Côté application, vérifier en base que `project_files.filePath` contient bien l'URL MinIO et
`cloudinaryPublicId` la **clé d'objet** (ex. `projects/123/1731-abc.pdf`).

### 13.3 Sauvegarde et restauration du stockage

```bash
# Sauvegarde incrémentale du bucket vers un disque/NAS
docker run --rm --network host -v /mnt/backup:/backup \
  minio/mc sh -c '
    mc alias set local http://127.0.0.1:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY &&
    mc mirror --overwrite local/ebeno-files /backup/ebeno-files'

# Restauration
docker run --rm --network host -v /mnt/backup:/backup \
  minio/mc sh -c '
    mc alias set local http://127.0.0.1:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY &&
    mc mirror --overwrite /backup/ebeno-files local/ebeno-files'
```

- Sauvegarder **ensemble** `db.sql.gz` et le miroir MinIO : la base contient les clés, le
  bucket contient les octets. Une restauration partielle donne des 404.
- Alternative « snapshot » : arrêter `minio`, archiver le volume `minio_data`, redémarrer.
- Fréquence : quotidienne, alignée sur la sauvegarde PostgreSQL.

### 13.4 Migration Cloudinary → MinIO

Un script dédié reste à écrire (dette v2.x). Procédure cible :

1. Exporter la liste des assets : `SELECT id, filePath, cloudinaryPublicId FROM project_files;`
2. Pour chaque asset : télécharger depuis `filePath` (URL Cloudinary), ré-uploader via
   `storageService.uploadBuffer(buffer, 'projects/<projectId>', mimeType)`.
3. Mettre à jour la ligne : `filePath = secureUrl`, `cloudinaryPublicId = publicId` (clé MinIO).
4. Vérifier par échantillon que les fichiers sont ouvrables depuis l'UI.
5. Basculer `STORAGE_PROVIDER=minio` et conserver les anciennes URL en lecture seule jusqu'à
   validation.

Le patch `deleteFileByUrl()` (v2.6.0) rend la suppression indifférente au provider d'origine,
ce qui permet de supprimer les anciens assets Cloudinary après migration sans casser la base.

### 13.5 Limitations connues

| Limitation | Détail | Contournement |
|---|---|---|
| URL non signées | `minioService` renvoie `MINIO_PUBLIC_URL/<bucket>/<clé>` : le bucket doit être lisible par les utilisateurs, sinon 403 | Activer des policies de lecture par bucket, ou servir via `getDownloadUrl()` (URL signée 1 h) |
| `MINIO_PUBLIC_URL` = `localhost` | Valeur par défaut du compose : inutilisable à distance | Renseigner IP/domaine |
| Deux chemins d'upload | `/upload` passe par MinIO ; `/projects/:id/files` écrit en local sur le conteneur | Unifier sur `uploadController` (dette) |
| Mono-nœud | Pas de réplication ni d'érasure coding | Utiliser MinIO en mode distribué (4+ nœuds) pour la production |
| Pas de chiffrement au repos | Le volume n'est pas chiffré par défaut | LUKS sur le disque hôte, ou SSE-S3 MinIO |
| Quotas | Pas de quota par organisation | Bucket dédié par institution, ou quotas MinIO (`mc admin bucket quota`) |

### 13.6 Revenir à Cloudinary

```dotenv
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

```bash
docker compose up -d --force-recreate backend
```

Les fichiers déjà stockés dans MinIO restent accessibles via leur URL stockée en base ; seuls
les nouveaux uploads repartent vers Cloudinary. Un provider ne « migre » pas l'existant.

---

## Annexe — Fichiers concernés

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | 7 services, volumes, interpolation `.env` |
| `.env` (racine) | Credentials + `JWT_SECRET` lus par compose |
| `backend/.env` | Développement local hors Docker |
| `backend/src/services/storageService.ts` | Abstraction Cloudinary/MinIO |
| `backend/src/services/minioService.ts` | Client S3 (`forcePathStyle`) |
| `backend/src/services/accountDeletionService.ts` | Suppression RGPD (fichiers + avatar) |
| `backend/src/controllers/uploadController.ts` | Upload passant par l'abstraction |
| `backend/src/controllers/fileController.ts` | Upload historique (local) — à unifier |
