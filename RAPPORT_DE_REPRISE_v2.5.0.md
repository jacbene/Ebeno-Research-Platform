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
```

→ Ça validera 90% des risques restants.

Option B — Release GitHub v2.5.0

Créer une release officielle sur GitHub pour marquer le jalon self-hosted :

· https://github.com/<org>/Ebeno-Research-Platform/releases/new
· Tag : v2.5.0-minio-storage
· Titre : "v2.5.0 — Self-Hosted Complete"

Option C — Dette technique v2.x

Fix accountDeletionService.ts (avatar MinIO) + compléter INSTALL_SELF_HOSTED.md.

Option D — V3 (souveraineté totale)

Whisper local, SMTP, GlitchTip.

---

📌 7. Question de reprise (à poser au nouveau chat)

Bonjour, voici le rapport de reprise pour Ebeno Research Platform v2.5.0-minio-storage.

On a terminé le chantier Self-Hosted (Ollama + MinIO + Docker). Tous les services IA sont maintenant Ollama-first avec cascade DeepSeek → OpenAI. Le stockage est abstrait entre Cloudinary (SaaS) et MinIO (self-hosted).

Il reste 3 priorités :

1. Test end-to-end docker compose up -d sur serveur Linux (bloqué car je suis sur Android/Termux)
2. Fix accountDeletionService.ts : avatar.includes('cloudinary') ne détecte pas MinIO
3. Compléter INSTALL_SELF_HOSTED.md section 13 (vérification, sauvegarde, limitations)

Question : par lequel commencer ? Peux-tu me guider étape par étape, fichier par fichier (comme on a fait pour les migrations Ollama/MinIO) ?

---

🎁 8. Bonus — modules déjà packagés

· ✅ Plan Institution : Pool partagé 10 000 messages IA/mois
· ✅ Export CSV : fonctionne
· ✅ Export PDF : fonctionne (jsPDF + html2canvas)
· ✅ Webhooks utilisateurs : retry worker 60s
· ✅ PWA : installable, push VAPID

---

## Session 17 Nov 2026 — v2.5.1-avatar-key (dette technique)

### Livré
- ✅ `users.avatarKey` : colonne persistée à l'upload, nettoyage ancien avatar auto
- ✅ `extractLegacyStorageKey()` : fallback legacy pour avatars Cloudinary pré-migration
- ✅ `accountDeletionService.ts` : suppression avatar provider-agnostique (Cloudinary + MinIO)
- ✅ `analysisService.ts:26` : typage `string[]` (débloque `auth.test.ts` compilation)
- ✅ `analysisService.test.ts` : skip propre + TODO détaillé (dette pg-mem)
- ✅ `INSTALL_SELF_HOSTED.md` : sections 13.3-13.6 complètes + structure markdown fixée

### Testé en production (Render)
- Upload avatar → `avatarKey` rempli (`avatars/USER_ID/hash`)
- Upload 2ᵉ avatar → ancien supprimé (Cloudinary + logs)
- Migration sync `.ts ↔ .js` : `🔄 49 migrations converties en .js` au boot

### Dettes reportées
1. **`tests/integration/auth.test.ts`** — 2 tests échouent en 500 (attendu 401/200)
   Cause : `tests/setup.ts` pg-mem ne connaît pas les dernières migrations
   Tables manquantes : `project_members`, `ai_usage`, `webhooks`
   → Aligner `tests/setup.ts` avec le schéma prod (~1-2h)

2. **`project_files.cloudinaryPublicId`** — Renommer en `storagePublicId` (v2.6)
   Nom hérité utilisé aussi en mode MinIO. Fonctionnel, mais trompeur.

3. **Test E2E Docker** — Bloqué sur environnement (Windows 10 1809 trop ancien)
   Options : Codespaces / VPS Oracle Free / WSL2 après upgrade

### Tests actuels
- `npm test` : **7 passed, 1 skipped, 1 failed** (failed = `auth.test.ts`, dette #1 ci-dessus)
- `npx tsc --noEmit` : ✅ clean

### Règles d'or mises à jour
- **Règle #3 (migrations `.ts/.js`)** : ✅ **automatisée** dans `backend/src/server.ts:385-397`
  (`if (isProd) .ts→.js else .js→.ts` au boot). Plus de SQL manuel.
  Documenté dans `INSTALL_SELF_HOSTED.md` section 13.6.4.

## Session 17-18 Nov 2026 — v2.5.1-avatar-key (dette technique complète)

### ✅ Chantiers livrés (5/5)

1. **Fix #2 : avatar MinIO**
   - Migration `users.avatarKey` (nullable, idempotente via `hasColumn`)
   - `uploadAvatar` persiste `publicId` + supprime l'ancien avatar (non-bloquant)
   - `accountDeletionService` provider-agnostique (Cloudinary + MinIO)
   - `extractLegacyStorageKey()` fallback pour avatars Cloudinary pré-migration
   - **Testé en prod** : upload → `avatarKey` rempli, 2ᵉ upload → ancien supprimé

2. **Dette #1 : `analysisService.ts:26` typing**
   - `words` annoté `string[]` → débloque `auth.test.ts` compilation

3. **Dette #2 : `analysisService.test.ts` obsolète**
   - Skip propre + TODO détaillé (dette pg-mem sous-jacente)

4. **Dette #3 : `INSTALL_SELF_HOSTED.md` section 13**
   - Sections 13.3-13.6 complètes (console, vérification, backup, limitations)
   - Structure markdown entièrement réparée (21 titres, blocs pairs, 4 tables)

5. **Dette #4 : `auth.test.ts` + pg-mem**
   - Schéma `users` complété (emailHash, avatarKey, 2FA, deletion, préférences)
   - Table `audit_log` ajoutée (requise par `logAuditFromReq`)
   - Coercition stricte booléens dans `authController` (`=== true || === 1`)
   - **4/4 tests passent** (avant : 2/4)

### 📊 État final des tests
Test Suites: 1 skipped, 8 passed, 0 failed
Tests:       3 skipped, 59 passed, 0 failed
npm run build : ✅ clean
npx tsc --noEmit : ✅ clean

```

### 🧠 Découvertes techniques à capitaliser

1. **pg-mem quirk** : `defaultTo(false)` retourne `"false"` (string, truthy).
   - ❌ `db.raw('false')` casse `createTable` dans pg-mem
   - ✅ Solution : coercition stricte dans le contrôleur (`=== true || === 1`)

2. **Règle d'or #3 automatisée** : `server.ts:385-397` synchronise `.ts ↔ .js`
   automatiquement au boot selon `isProd`. Plus de SQL manuel pour les migrations.
   Documenté dans `INSTALL_SELF_HOSTED.md` section 13.6.4.

3. **Pattern `publicId + secureUrl`** : `StorageUploadResult` retourne déjà les deux.
   Le pattern `avatar` (URL) + `avatarKey` (clé) est cohérent avec
   `project_files.cloudinaryPublicId` et fonctionne pour Cloudinary + MinIO.

### 🚧 Dettes restantes (reportées)

1. **`project_files.cloudinaryPublicId`** → renommer en `storagePublicId` (v2.6)
   Nom hérité utilisé aussi en mode MinIO. Fonctionnel, trompeur. Migration ~30 min.

2. **Test E2E Docker self-hosted** → bloqué sur environnement
   - Windows 10 1809 trop ancien pour WSL2/Docker Desktop
   - Options : Codespaces / VPS Oracle Free / WSL2 après upgrade

3. **Whisper local** (V3, ~1-2h)
   Remplacer Deepgram par Whisper auto-hébergé pour souveraineté totale.

### 📦 Commits de la session

- `46864de` — test(auth): strict boolean coercion + aligned pg-mem schema
- `d9ae443` — docs(self-hosted): complete MinIO section 13 + fix markdown structure
- `<sha>` — fix(storage): persist avatarKey and detect MinIO avatars on deletion
- `<sha>` — fix(analysis): type words as string[] (unblock auth.test.ts)
- `<sha>` — test(analysis): skip obsolete analysisService tests
- `<sha>` — docs(report): add session 17 Nov 2026 recap

### 🎯 Prochaine session — suggestions

- **Court (30 min)** : dette #5 (`cloudinaryPublicId` → `storagePublicId`)
- **Moyen (1-2h)** : Whisper local (V3 souveraineté)
- **Long (session dédiée)** : test E2E Docker via Codespaces

🚀 Fin du rapport
