# 📋 RAPPORT DE REPRISE — EBENO RESEARCH PLATFORM

Date de reprise : 16 Novembre 2026
Version courante : **v2.5.0-minio-storage**
État global : 🟢 Self-Hosted Phase 2 terminé (95% souveraineté) | 🟡 Test end-to-end à faire | 🔴 Paiement en attente

---

## 🏗️ 1. Infrastructure actuelle

### SaaS Cloud (Render) — Production
| Composant | Technologie | URL |
|---|---|---|
| Frontend | React 18 + Vite + TS | https://ebenoresearch.com |
| Backend | Node.js + Express + Knex + Socket.IO | https://ebeno-backend.onrender.com |
| Base de données | PostgreSQL (Neon) | Connectée |
| Domaine | Hostinger → Render | ebenoresearch.com + www |
| SSL | Render (auto) | ✅ |
| Emails | Brevo | API OK |
| Stockage | Cloudinary | Opérationnel |
| IA Texte | DeepSeek + OpenAI | ✅ |
| IA Audio | Deepgram + Whisper | ✅ |
| Monitoring | Sentry | ✅ |
| PWA | Workbox | ✅ |

### Self-Hosted (Docker) — Prêt pour universités
| Service | Technologie | Souveraineté |
|---|---|---|
| IA | Ollama (llama3.1) | ✅ Local |
| Stockage | MinIO (S3-compatible) | ✅ Local |
| Base de données | PostgreSQL 15 | ✅ Local |
| Frontend | Nginx | ✅ Local |
| Emails | Brevo | ⚠️ Cloud |
| Transcription | Deepgram | ⚠️ Cloud |
| Monitoring | Sentry | ⚠️ Cloud (optionnel) |

---

## ✅ 2. Chantiers terminés

### v2.0.0-ollama-chat (commit 123fe38)
- Cascade Ollama → DeepSeek → OpenAI dans `chatService.ts` + `streamService.ts`
- Streaming NDJSON Ollama natif (Socket.IO préservé)
- Zero régression SaaS si `OLLAMA_URL` vide

### v2.2.0-cleanup (commit 2505f3c)
- Suppression cluster "fake AI" (`deepseekRoutes` + knowledgeBase hardcodée)
- Suppression `DeepSeekChat.tsx`, `useDeepSeekChat`, `deepseekApi`, `types/deepseek`
- `.gitignore` étendu `*.before-*`

### v2.3.0-ollama-caqdas (commit 23f5182)
- `thematicAnalysisService.ts` : Ollama (JSON mode) → DeepSeek
- `translationService.ts` : Ollama → DeepSeek → OpenAI avec circuit breaker
- `OLLAMA_TRANSLATION_MAX_CHARS=20000` (seuil de bascule)

### v2.4.0-selfhosted-docs (commit 0803f8c)
- `INSTALL_SELF_HOSTED.md` : guide 13 sections
- `README_SELF_HOSTED.md` : pitch universités

### v2.5.0-minio-storage (commit 3b00aa7)
- `minioService.ts` : client S3 complet (upload, delete, signed URLs, health)
- `storageService.ts` : abstraction `STORAGE_PROVIDER` (cloudinary | minio)
- 8 fichiers migrés vers l'abstraction
- `docker-compose.yml` : services `minio` + `minio-init` + volume `minio_data`
- Fix YAML indentation pré-existant (ollama, ollama-init)
- `backend/.env.example` : variables MinIO documentées
- `INSTALL_SELF_HOSTED.md` : section 13 (stockage local)

---

## 🚧 3. Ce qui RESTE à faire

### 🔴 Priorité haute — Test end-to-end
- [ ] `docker compose up -d` sur serveur Linux réel (Ubuntu 24.04+)
- [ ] Vérifier les 7 services démarrent (`db, ollama, ollama-init, minio, minio-init, backend, frontend`)
- [ ] Vérifier l'upload d'un fichier → apparaît dans le bucket MinIO
- [ ] Vérifier le chat IA → réponse générée localement par Ollama
- [ ] Vérifier le CAQDAS (codage, analyse thématique, traduction)
- [ ] Vérifier l'UI MinIO `http://localhost:9001`

### 🟠 Priorité moyenne — Dettes techniques v2.x
- [ ] `accountDeletionService.ts` : `avatar.includes('cloudinary')` → détecter aussi URLs MinIO
- [ ] Compléter `INSTALL_SELF_HOSTED.md` section 13 (vérification, sauvegarde, limitations)
- [ ] Script migration Cloudinary → MinIO (pour universités qui basculent)

### 🟡 Priorité normale — V3 (souveraineté totale)
- [ ] **Whisper local** (remplacer Deepgram)
- [ ] **SMTP auto-hébergé** (remplacer Brevo — Postfix ou Mailu)
- [ ] **GlitchTip auto-hébergé** (remplacer Sentry)

### 🟢 En attente externe — Paiement
- [ ] Startbutton : dossier en étude
- [ ] CamPay : docs impôts à fournir
- [ ] Paddle : ❌ définitivement rejeté
- [ ] Alternative possible : CinetPay / Flutterwave

---

## 👤 4. Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin / Pro | jacquesbene301@gmail.com | Berny752901 |
| Free | test@test.com | 123456 |
| Organisation | Université de Test (owner: jacquesbene301) | — |

**IDs utiles (Neon)** :
- User admin : `1790108972430-r97bi2o3`
- Projet de test : `project-1790284937983-9utsdpkc`

---

## 🚨 5. Règles d'or (à ne pas oublier)

1. **Termux** : Pas de `/tmp`, utiliser `~/tmp`. `export NODE_OPTIONS="--max-old-space-size=2048"`.
2. **Knex** : Toujours `hasTable()` et `hasColumn()` avant migrations.
3. **Migration directory corrupt** : `UPDATE knex_migrations SET name = REPLACE(name, '.js', '.ts')` (dev) ou l'inverse (Render).
4. **React / i18n** : Jamais `t` dans `.map()`. Utiliser `startTransition()` pour lourds.
5. **Cloudinary/MinIO** : Jamais stockage local sur Render (filesystem éphémère).
6. **Ordre des routes Express** : routes spécifiques AVANT génériques (`/memos`, `/segments`, `/project` avant `/:id`, `/:projectId`). ⚠️ Bug critique déjà rencontré.
7. **Git Token** : Expire tous les 90j. Régénérer sur https://github.com/settings/tokens si push échoue.
8. **Cache HTTP** : `Cache-Control: no-store` sur routes dynamiques (sinon 304 + liste vide).
9. **Alias à l'import** : `deleteFile` de `storageService` doit être importé en alias (`deleteFileFromStorage`) si le fichier exporte déjà `deleteFile` (collision possible dans `fileController.ts`).
10. **MinIO `forcePathStyle: true`** : obligatoire dans le `S3Client`, sinon URLs cassées.

---

## 🎯 6. Priorités immédiates (prochaine session)

### Option A — Test end-to-end Docker (recommandé)
Dès que tu as accès à un serveur Linux (VPS, WSL2, machine perso) :
```bash
git clone https://github.com/<org>/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform
cp backend/.env.example backend/.env
# Éditer JWT_SECRET + STORAGE_PROVIDER=minio
docker compose up -d
docker compose logs -f ollama-init   # attendre "success"
