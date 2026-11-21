# 🎓 Guide de Déploiement Ebeno Research Platform
## Pour les Universités et Institutions de Recherche

> **Document destiné aux** : Directions des Systèmes d'Information (DSI), Vice-Présidences Recherche, Responsables de laboratoires SHS.
>
> **Objectif** : Permettre à votre institution de déployer la plateforme de recherche Ebeno **sur ses propres serveurs**, garantissant la **souveraineté totale** sur les données de recherche, avec un coût maîtrisé et une conformité RGPD stricte.

---

## 1. Résumé Exécutif

Ebeno est une plateforme collaborative d'analyse qualitative et de gestion de projets pour les **Sciences Humaines et Sociales (SHS)**.

En choisissant le déploiement **Self-Hosted (sur vos serveurs)**, votre institution bénéficie de :

- 🔒 **Souveraineté totale des données** : aucune donnée de recherche (textes, audios, transcriptions) ne quitte votre infrastructure. Idéal pour les projets sensibles (santé, sciences politiques, données personnelles).
- 📜 **Conformité RGPD native** : plus de transferts hors UE vers des clouds américains (OpenAI, Deepgram, Cloudinary, Sentry).
- 💰 **Coût maîtrisé** : pas d'abonnement par utilisateur ou par requête IA. Vous ne payez que l'infrastructure physique (serveur) et la maintenance.
- 🧠 **IA 100% Locale** : transcriptions audio (Whisper), analyse de texte (Ollama), sans appel à des API externes.

---

## 2. Architecture & Composants (100% Souverain)

L'infrastructure auto-hébergée repose sur **11 services conteneurisés (Docker)** :

| Composant | Technologie | Rôle |
|---|---|---|
| **Frontend** | React / Nginx | Interface utilisateur web |
| **Backend** | Node.js / Express | API REST & WebSockets (temps réel) |
| **Base de données** | PostgreSQL 15 | Données applicatives (comptes, projets, textes) |
| **Stockage** | MinIO (S3-compatible) | Stockage des fichiers (PDF, audios, avatars) |
| **IA Texte** | Ollama (llama3.1) | Résumés, analyse thématique, traduction |
| **IA Audio** | Whisper Local | Transcription des entretiens et réunions |
| **Emails** | Mailpit / Mailu / Postfix | Envoi des notifications (vérification, alertes) |
| **Monitoring** | GlitchTip (clone Sentry) | Suivi des erreurs et performances |

> 💡 **Note importante** : L'ensemble de ces services est piloté par un seul fichier `docker-compose.yml`. L'installation technique détaillée est disponible dans le fichier `INSTALL_SELF_HOSTED.md`.

---

## 3. Prérequis

### 3.1. Prérequis matériels

| Configuration | Utilisateurs simultanés | RAM | CPU | Disque (SSD) |
| :--- | :--- | :--- | :--- | :--- |
| **Minimale** (pilote) | 1-5 | 8 Go | 4 cœurs | 50 Go |
| **Recommandée** (département) | 5-20 | 16 Go | 8 cœurs | 100 Go |
| **Production** (faculté) | 20-50 | 32 Go | 16 cœurs | 250 Go |

> ⚠️ L'IA locale (Ollama) est gourmande en CPU/RAM. L'ajout d'un GPU NVIDIA (ex: RTX 3090) est optionnel mais accélère considérablement les temps de réponse de l'IA.

### 3.2. Prérequis réseau et système
- **Système d'exploitation** : Ubuntu Server 22.04 LTS ou 24.04 LTS (recommandé).
- **Docker Engine** (v24+) et **Docker Compose** (v2.20+).
- **Nom de domaine** : un sous-domaine dédié (ex: `recherche.mon-universite.fr`).
- **Certificat SSL** : Let's Encrypt (gratuit) via un reverse proxy (Nginx/Traefik).
- **Reverse Proxy** : recommandé pour gérer le HTTPS et les ports (80/443).

### 3.3. Prérequis humains (Rôles)
- **Administrateur Système (DSI)** : installation Docker, configuration réseau, sauvegardes.
- **Référent Recherche** : création des comptes, gestion des projets, formation des chercheurs.
- **Support Niveau 1** : assistance aux utilisateurs (mot de passe oublié, upload).

---

## 4. Estimation des Coûts (TCO)

Le modèle self-hosted transforme un coût récurrent (SaaS) en un investissement maîtrisé.

### 4.1. Coût d'acquisition (Matériel)
- **Serveur physique** (16 cœurs, 32 Go RAM, 2 To SSD) : ~2 500 € à 4 000 €.
- **Hébergement VPS** (équivalent) : ~50 € à 100 € / mois.
- *(Optionnel)* **GPU NVIDIA** pour l'IA : +1 500 € à 2 500 €.

### 4.2. Coût de maintenance annuel (Estimation)
- **Maintenance serveur & mises à jour** : ~1 à 2 jours-homme / an (interne).
- **Sauvegardes** : coût du stockage secondaire (NAS, disque externe).
- **Certificat SSL** : 0 € (Let's Encrypt).

### 4.3. Comparaison avec le SaaS (Modèle économique)
| Poste de coût | SaaS (Cloud) | Self-Hosted (Interne) |
| :--- | :--- | :--- |
| Abonnement | 10€ - 30€ / utilisateur / mois | 0 € |
| Requêtes IA | Facturées au token / minute | 0 € (limité par CPU/RAM) |
| Stockage | Facturé au Go | Inclus (disque serveur) |
| Souveraineté RGPD | ❌ Transferts hors UE | ✅ 100% Interne |
| **Coût sur 3 ans (50 utilisateurs)** | **~36 000 €** | **~3 000 € (serveur unique)** |

---

## 5. Plan de Déploiement (3 à 4 semaines)

### Phase 0 — Préparation (Semaine 0)
- [ ] Valider le choix du serveur (physique ou VPS).
- [ ] Réserver le nom de domaine et les accès DNS.
- [ ] Désigner les administrateurs système et les référents recherche.
- [ ] Lire `INSTALL_SELF_HOSTED.md` (guide technique).

### Phase 1 — Installation de l'infrastructure (Semaine 1)
- [ ] Installer Ubuntu Server 24.04 LTS.
- [ ] Installer Docker et Docker Compose.
- [ ] Cloner le dépôt Ebeno.
- [ ] Configurer le fichier `backend/.env` (secrets, SMTP, MinIO).
- [ ] Lancer `docker compose up -d` (les 11 services démarrent).
- [ ] Vérifier le bon fonctionnement via `docker compose ps` et les tests de santé (`/api/health`).

### Phase 2 — Configuration réseau et TLS (Semaine 2)
- [ ] Mettre en place le reverse proxy (Nginx/Traefik).
- [ ] Configurer les enregistrements DNS (A, CNAME) vers l'IP du serveur.
- [ ] Générer et installer les certificats Let's Encrypt.
- [ ] Configurer les en-têtes de sécurité (HSTS, CSP).
- [ ] Tester l'accès via `https://recherche.mon-universite.fr`.

### Phase 3 — Migration & Tests (Semaine 3)
- [ ] Si vous migrez depuis le SaaS : exporter/importer la base de données PostgreSQL.
- [ ] Si vous utilisez MinIO : transférer les fichiers depuis l'ancien stockage.
- [ ] Lancer le **Smoke Test** complet (création projet, upload, transcription, analyse IA).
- [ ] Valider les sauvegardes automatiques (voir section 6).

### Phase 4 — Formation & Go-Live (Semaine 4)
- [ ] Former les référents recherche (2 heures).
- [ ] Former les chercheurs (1 heure : login, upload, CAQDAS).
- [ ] Distribuer la documentation utilisateur.
- [ ] Activer le support (ticket, email).
- [ ] **Go-Live officiel** 🎉

---

## 6. Stratégie de Sauvegarde (CRUCIAL)

La perte des données de recherche serait catastrophique. **3 sauvegardes sont obligatoires** :

1. **Base de données (PostgreSQL)**
   ```bash
   docker compose exec db pg_dump -U ebeno -Fc ebeno_db > backup-db-$(date +%F).dump
   Fréquence : quotidienne (cron).

2. Stockage Fichiers (MinIO)
   ```bash
   mc mirror --overwrite ebeno/ebeno-files /backup/minio/ebeno-files
   ```
   Fréquence : quotidienne (cron).
3. Configuration serveur
   · Sauvegarder le fichier backend/.env et le dossier /etc/nginx (ou équivalent).

⚠️ Test de restauration : une sauvegarde non testée n'existe pas. Restaurez sur un environnement de test tous les 3 mois.

---

7. Checklist Finale (Go / No-Go)

Avant d'ouvrir la plateforme aux chercheurs, validez ces points :

☐ Le nom de domaine répond en HTTPS (cadenas vert).
☐ Un utilisateur peut s'inscrire, se connecter et recevoir l'email de vérification.
☐ L'upload d'un fichier PDF ou audio fonctionne (stocké dans MinIO).
☐ La transcription audio utilise bien Whisper Local (pas de fuite vers Deepgram).
☐ L'IA de chat utilise bien Ollama (pas de fuite vers OpenAI/DeepSeek).
☐ L'envoi d'emails passe bien par le SMTP local (pas de fuite vers Brevo).
☐ Les erreurs remontent bien dans GlitchTip (pas de fuite vers Sentry).
☐ Les sauvegardes PostgreSQL et MinIO ont été testées avec succès.
☐ Le support technique est joignable.

---

8. Conclusion

En déployant Ebeno en self-hosted, votre université ne fait pas qu'économiser sur les coûts d'abonnement : elle reprend le contrôle total de ses données de recherche, un enjeu stratégique et éthique majeur pour les Sciences Humaines et Sociales.

Pour toute question technique, se référer à INSTALL_SELF_HOSTED.md.
Pour toute question commerciale ou de partenariat : contact@ebenoresearch.com.
