```markdown
# 🏗️ Architecture technique — Ebeno Research Platform

Ce document décrit les choix techniques structurants du projet, leur justification et les patterns utilisés.

---

## 1. Vue d'ensemble

```

┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR (Navigateur)                  │
│                  React + TypeScript (SPA)                        │
└────────────────────────┬────────────────────────────────────────┘
│
│ HTTP (REST) + WebSocket
│
┌────────────────────────▼────────────────────────────────────────┐
│                     BACKEND (Node.js / Express)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Middlewares :                                            │   │
│  │  • Auth JWT    • Rate Limiting    • Logger    • Sanitize │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  REST API    │  │  Socket.IO   │  │  Services externes    │  │
│  │  (Express)   │  │  (temps réel)│  │  • Cloudinary         │  │
│  └──────────────┘  └──────────────┘  │  • OpenAI / DeepSeek  │  │
│                                       │  • Deepgram           │  │
│                                       └──────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Knex.js (query builder + migrations)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
│
┌────────────▼────────────┐
│   PostgreSQL (Render)   │
└─────────────────────────┘

```

---

## 2. Backend

### 2.1 Structure

```

backend/src/
├── config/
│   └── knexfile.ts              # Config DB (Postgres prod / SQLite dev)
├── controllers/                  # Logique métier par domaine
├── db/
│   ├── knex.ts                   # Instance DB partagée
│   └── migrations/               # Migrations versionnées
├── middleware/
│   ├── auth.ts                   # Vérification JWT
│   ├── rateLimiter.ts            # express-rate-limit (4 profils)
│   ├── requestLogger.ts          # Logs HTTP (filtre health checks)
│   ├── sanitize.ts               # Protection XSS basique
│   └── invalidateStatsCache.ts   # Invalidation cache après écriture
├── routes/                       # Déclaration des routes
├── services/
│   ├── circuitBreaker.ts         # Protection services IA
│   ├── presenceService.ts        # Présence Socket.IO (TTL)
│   ├── statsCache.ts             # Cache stats 30s
│   └── cleanupService.ts         # Cron de purge corbeille
├── sockets/
│   └── collaborationSocket.ts    # Handler Socket.IO + debounce
├── utils/
│   ├── logger.ts                 # Winston
│   └── generateId.ts             # IDs uniques (prefix-ts-random)
└── server.ts                     # Point d'entrée

```

### 2.2 Base de données

**Choix** : **Knex.js** (migration depuis Prisma)

**Raisons** :
- Requêtes SQL explicites et lisibles
- Migrations versionnées (rollback possible)
- Compatible PostgreSQL (prod) et SQLite (dev/test)
- Pas de génération de client lourd

**Convention d'ID** :
```

Format : {prefix}-{timestamp}-{random}
Exemple : project-1789635931540-jaij4cuf

```

**Avantages** :
- Tri chronologique naturel
- Pas de collision (timestamp + random)
- Lisible dans les logs
- Compatible URL-safe

### 2.3 Migrations Knex

- **Automigrations au démarrage** : `db.migrate.latest()` dans `server.ts`
- **Idempotentes** : testent l'existence avant de modifier
- **Nommage** : `YYYYMMDDHHMMSS_description.ts`
- **Règle d'or** : une migration appliquée est **immuable** (créer une nouvelle pour corriger)

### 2.4 Authentification

- **JWT** signé avec `JWT_SECRET`
- **Payload** : `{ id, email, role, iat, exp }`
- **Durée** : 7 jours
- **Mot de passe** : bcrypt (10 rounds)
- **Middleware** : `authMiddleware` monte sur toutes les routes `/api/*` sauf `/auth/*`

### 2.5 Rate Limiting

4 profils via `express-rate-limit` :

| Profil | Limite | Usage |
|--------|--------|-------|
| `globalLimiter` | 100 req / min | Toutes les routes API |
| `authLimiter` | 5 tentatives / 15 min | `/auth/login`, `/auth/register` |
| `uploadLimiter` | 20 uploads / heure | `/upload`, `/files` |
| `aiLimiter` | 30 requêtes / heure | `/summaries`, `/analysis`, IA |

**Derrière Cloudflare** : utilise `request-ip` + `ipKeyGenerator` pour normaliser les IPv6.

### 2.6 Circuit Breakers

**Problème** : si OpenAI ou Deepgram est HS, chaque requête attend 30s avant timeout.

**Solution** : pattern Circuit Breaker en mémoire.

**États** :
- **Closed** : service dispo, les requêtes passent
- **Open** : service HS, requêtes annulées immédiatement (pendant 15 min)
- **Half-Open** : tentative après cooldown

**Déclencheurs** : 401, 403, quota, clé invalide → désactivation automatique

**Visibilité** : `GET /api/health/breakers`

### 2.7 Cache Stats

**Problème** : dashboard = ~12 requêtes SQL → lenteur si appelé souvent.

**Solution** : cache mémoire 30s par `userId:projectId`.

**Invalidation** : middleware `invalidateStatsOnWrite` sur POST/PUT/PATCH/DELETE.

**Impact** : temps de réponse dashboard **500ms → 15ms** sur cache hit.

### 2.8 Socket.IO — Collaboration temps réel

**Debounce des sauvegardes** :
- Client envoie `edit-document` à chaque frappe
- Serveur **bufferise** (500ms) et fait 1 seul `UPDATE` DB
- Broadcast temps réel immédiat (indépendant du debounce)

**TTL Présence** :
- Chaque user a un `lastSeen`
- Cleanup auto toutes les 30s → retire les users inactifs > 2 min
- Empêche les fuites mémoire si clients crash sans `disconnect`

**Flush à la sortie** :
- Quand le dernier user quitte un document → save immédiate

### 2.9 Sécurité

- **JWT** : expiration 7j, secret long en `.env`
- **Sanitize XSS** : middleware sur `/auth`, `/projects`, `/users`, `/comments` (pas sur contenu éditorial)
- **Rate limiting** : par IP normalisée (Cloudflare-aware)
- **CORS** : ouvert (à restreindre en prod si frontend séparé)
- **Passwords** : bcrypt 10 rounds

---

## 3. Frontend

### 3.1 Stack

- **React 18** + **TypeScript**
- **Create React App** (react-scripts)
- **React Router 6** (lazy routes)
- **Axios** (client API)
- **Context API** (Theme, Toast, Auth)

### 3.2 Structure

```

frontend/src/
├── components/          # UI réutilisable (Button, Card, Modal…)
├── context/
│   ├── ThemeContext.tsx # Light/Dark/System
│   └── ToastContext.tsx # Notifications
├── hooks/
│   └── useProjectSocket.ts # Socket.IO (présence + doc)
├── pages/
│   ├── Dashboard.tsx          # Vue globale
│   ├── ProjectDetail.tsx      # 8 onglets (audio, analysis, trash…)
│   ├── CollaborationPage.tsx  # Éditeur temps réel
│   └── ...
├── services/
│   └── api.ts                 # Axios instance + interceptors
└── App.tsx                    # Router + lazy routes

```

### 3.3 Code splitting

**Stratégie** : `React.lazy()` + `Suspense`

**Routes lazy-loaded** :
- Toutes les pages sauf `Login` (1ère page vue)

**Composants lazy-loaded** :
- `html2pdf.js` (~150 KB) — chargé au 1er clic PDF
- `WordCloud` (~80 KB) — chargé à l'ouverture de l'onglet Analyse

**Résultat** :
- Bundle initial : **405 KB → 80 KB** gzipped
- Premier chargement 5× plus rapide

### 3.4 Gestion du thème

**ThemeContext** expose `{ theme, setTheme, colors }`.

**Options** : Light / Dark / System
- `System` utilise `prefers-color-scheme`
- Persisté dans `localStorage`

---

## 4. Déploiement

### Backend (Render)

- **Build** : `npm install --include=dev && npm run build`
- **Start** : `npm start` (→ `node dist/server.js`)
- **Health Check** : `/api/health/ready`
- **Variables** : `DATABASE_URL`, `JWT_SECRET`, clés API
- **DB** : PostgreSQL managée (Render)
- **Migrations** : automatiques au démarrage

### Frontend (Render Static / Vercel)

- **Build** : `npm run build` → dossier `build/`
- **Publish** : `build/`

---

## 5. Patterns & conventions

### Convention ID

```ts
import { generateId } from '../utils/generateId';
const id = generateId('project'); // project-1789635931540-jaij4cuf
```

Contrôleur type

```ts
export const createX = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });
    
    // Logique...
    
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('❌ Erreur createX:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
```

Réponse API standard

```json
{
  "success": true,
  "data": { ... },
  "message": "Optionnel"
}
```

Ou en cas d'erreur :

```json
{
  "success": false,
  "message": "Description",
  "error": "Détails techniques (dev uniquement)"
}
```

Commits Git

Format Conventional Commits :

```
<type>(<scope>): <description>

Types : feat, fix, perf, chore, docs, refactor, test, style
Scopes : projects, stats, socket, security, frontend, ...
```

Exemples :

· feat(socket): TTL presence + debounce edit-document
· fix(projects): use proper ID format + migrate legacy ISO ids
· perf(frontend): lazy-load html2pdf + routes

---

6. Roadmap technique (idées)

☐ Cache Redis (multi-instance)
☐ Websocket adapter Redis (scaling horizontal)
☐ Tests E2E (Playwright / Cypress)
☐ Documentation API (Swagger / OpenAPI)
☐ Retry IA automatique sur circuit half-open
☐ Compression Brotli sur les réponses API
☐ Index DB supplémentaires selon usage réel

```

---
