# Installation Ebeno Research Platform — Self-Hosted

**Guide pour institutions académiques**  
Version : 2.3.0+ — Dernière mise à jour : Novembre 2026

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
10. [Sauvegarde et restauration](#10-sauvegarde-et-restauration)
11. [Mise à jour](#11-mise-à-jour)
12. [Dépannage](#12-dépannage)
## 13. Stockage local (MinIO)

Par défaut, Ebeno stocke les fichiers (PDF, DOCX, audio, exports) chez **Cloudinary** (service cloud US). Pour une **souveraineté totale**, activez **MinIO** (S3-compatible, open source, auto-hébergé).

### Pourquoi MinIO ?

| Critère | Cloudinary (SaaS) | MinIO (self-hosted) |
|---|---|---|
| Localisation données | US (par défaut) | **Votre serveur** |
| Coût récurrent | Payant au-delà du free tier | **Gratuit** (juste le disque) |
| RGPD / souveraineté | ⚠️ Transfert hors UE | ✅ Aucun transfert |
| Compatibilité code | ✅ | ✅ (abstraction `storageService`) |

### Activation (déjà configurée dans docker-compose.yml)

MinIO est **inclus par défaut** dans `docker-compose.yml` (services `minio` + `minio-init`). Pour l'activer :

```bash
# 1. Éditer backend/.env
nano backend/.env

# 2. Changer STORAGE_PROVIDER
STORAGE_PROVIDER=minio

# 3. Personnaliser les credentials (⚠️ OBLIGATOIRE en production)
MINIO_ACCESS_KEY=votre-cle-forte-aleatoire   # ex: openssl rand -hex 32
MINIO_SECRET_KEY=votre-secret-fort-aleatoire  # ex: openssl rand -hex 64
MINIO_BUCKET=ebeno-files

# 4. (Optionnel) URL publique si vous avez un domaine dédié
# MINIO_PUBLIC_URL=https://files.mon-universite.fr

# 5. Redémarrer le backend
docker compose up -d --force-recreate backend
14. [Désactiver Ollama (repasser en mode cloud)](#13-désactiver-ollama-repasser-en-mode-cloud)

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
