# Ebeno Research Platform — Vision "Self-Hosted" (On-Premise)

## Contexte & Enjeu
De nombreux chercheurs (santé, droit, sciences politiques) font face à des exigences strictes de confidentialité (RGPD, comités d'éthique, données sensibles). Les solutions SaaS classiques (Cloud US) sont souvent bloquées par les institutions. 

L'objectif de ce chantier est de proposer une version **entièrement autonome** d'Ebeno, déployable sur les serveurs de l'institution, garantissant que **les données ne quittent jamais le réseau local**.

## Les 3 Niveaux d'Autonomie

### Niveau 1 — Self-Hosted pour les Institutions (Docker)
**Cible :** Clients plan "Institution".
**Principe :** L'université déploie Ebeno sur son propre serveur (via Docker Compose). 
**Stack :**
- Base de données : PostgreSQL local.
- IA : Ollama (modèles Llama 3.1 / Mistral) + Whisper.cpp pour l'audio.
- Pas de dépendance aux APIs Cloud (DeepSeek/OpenAI/Paddle).
**Argument commercial :** "Vos données ne quittent jamais votre université." (Facturation de la licence d'usage).

### Niveau 2 — Mode Hybride "Confidentialité" (Desktop App)
**Cible :** Clients plan "Pro" sensibles.
**Principe :** Application desktop (Tauri/Electron) embarquant un modèle quantifié via Ollama. L'utilisateur bascule entre "IA Cloud" (rapide) et "IA Locale" (100% privé).

### Niveau 3 — 100% Local sur Mobile (Prototypage)
**Cible :** Chercheurs sur le terrain sans connexion.
**Principe :** Modèles ultra-légers (ex: Phi-3 quantifié) tournant directement sur le smartphone. À réserver pour des tâches basiques.

## Préparation technique (déjà en place)
- `chatService.ts` utilise une cascade de fournisseurs. Il suffit d'ajouter un 3ème fournisseur `ollama` en fonction de la variable d'environnement `OLLAMA_URL`.
- `summaryService.ts` et `translationService.ts` sont déjà abstraits via des fonctions de fallback.

## Roadmap
- [ ] V1 (Actuelle) : SaaS Cloud avec DeepSeek/OpenAI.
- [ ] V2 (Dans 6-12 mois) : Offre Docker Compose pour les Institutions (Ollama).
- [ ] V3 (Plus tard) : Application desktop hybride.
