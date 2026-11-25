# Réévaluation de sécurité

**Projet :** Ebeno Research Platform
**Date :** 25 novembre 2026
**Révision examinée :** worktree local (non commité)
**Périmètre :** revue statique des modifications récupérées et vérification des constats du précédent audit
**Statut :** les constats de contrôle d'accès sont corrigés localement et validés; les audits npm et pnpm rapportent 0 vulnérabilité. Le checkout CamPay est temporairement suspendu.

## Synthèse

La réévaluation du code a confirmé trois problèmes de contrôle d'accès. Les protections pour l'édition collaborative, le téléversement et la création de mémos sont maintenant présentes localement et couvertes par des tests. Les constats précédents sur Dodo, la création de conversations, l'accès socket à la jointure/lecture, le SSRF et la publication des ports Docker sont résolus ou atténués dans le worktree examiné. CamPay exige une signature configurée; le checkout mobile est suspendu, car le webhook ne vérifie pas encore le statut auprès du fournisseur et n'active pas d'abonnement. Les audits npm des dépendances racine, frontend et backend, ainsi que les audits pnpm complet et production, rapportent tous 0 vulnérabilité.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | ✅ CORRIGÉ | `backend/src/sockets/collaborationSocket.ts` | 259-295, 386-398 | Un membre authentifié pouvait tenter de modifier un document d'un autre projet; vérification de l'appartenance et de la jointure au document ajoutée localement et testée. | 9/10 |
| 2 | ✅ CORRIGÉ | `backend/src/routes/uploadRoutes.ts`; `backend/src/controllers/uploadController.ts` | 7; 87-101, 127 | Le téléversement acceptait un `projectId` arbitraire; vérification de l'appartenance avant stockage distant ajoutée localement et testée. | 9/10 |
| 3 | ✅ CORRIGÉ | `backend/src/routes/memoRoutes.ts`; `backend/src/controllers/memoController.ts` | 11; 97-112 | Appartenance au projet vérifiée avant l'insertion et l'émission d'événement; test d'intégration non-membre ajouté. | 9/10 |
| 4 | ✅ CORRIGÉ | `backend/package.json`; `backend/package-lock.json` | Dépendances de développement backend | Suppression de Drizzle Kit inutilisé et remplacement de `glob`/`minimatch`; les audits backend complet et production rapportent 0 vulnérabilité. | 10/10 |
| 5 | ✅ CORRIGÉ | `package-lock.json`; `backend/package-lock.json`; `frontend/package-lock.json`; `pnpm-lock.yaml` | Dépendances racine, backend et frontend | Audits npm complet et production des trois projets, ainsi que pnpm complet et production : 0 vulnérabilité. | 10/10 |

## Vérification des corrections

- **Édition collaborative :** le gestionnaire vérifie l'appartenance courante de l'utilisateur au projet du document et exige qu'il ait rejoint la salle du document avant diffusion et sauvegarde.
- **Téléversement :** le contrôleur vérifie l'appartenance après le décodage multipart et avant tout stockage distant; le fichier temporaire est nettoyé en cas de refus.
- **Mémos :** l'appartenance est vérifiée avant toute écriture ou émission d'événement; le test d'intégration confirme qu'un non-membre ne crée ni mémo ni activité.
- **CamPay :** le checkout mobile répond `503` et n'appelle pas le fournisseur tant que le rapprochement de paiement n'est pas implémenté.
- **Validation :** 12 suites et 68 tests passent; les builds backend et frontend réussissent.
- **Dépendances :** `npm audit` et `npm audit --omit=dev` rapportent 0 vulnérabilité à la racine, dans le backend et dans le frontend; `pnpm audit` et `pnpm audit --prod` rapportent aussi 0 vulnérabilité.

## Audit des dépendances

Les mises à jour ont éliminé les avis précédemment signalés dans chaque arbre de dépendances. Drizzle Kit, inutilisé et seul introduisant l'ancien `esbuild` vulnérable, ainsi que Prisma (CLI, client, moteurs et commandes de maintenance obsolètes), ont été retirés; des overrides garantissent des versions corrigées de `glob`, `minimatch` et `immutable`. Les audits npm complet/production sont propres pour les trois projets et les audits pnpm complet/production sont propres pour le lockfile racine.

## État des constats du précédent audit

- **Dodo (critique) : résolu.** Le webhook exige un secret et vérifie le HMAC sur le corps brut.
- **CamPay (élevé) : atténué et checkout suspendu.** Les requêtes sans secret/signature sont rejetées; aucun abonnement n'est activé.
- **Création de conversation (élevé) : résolue.** La route vérifie l'appartenance au projet.
- **Sockets de collaboration (élevé) : corrigé dans le worktree.** Authentification et contrôle d'appartenance/jointure avant édition; voir constat 1.
- **Téléversement (élevé) : corrigé dans le worktree.** Voir constat 2.
- **SSRF (élevé) : atténué.** Garde contre les destinations privées et redirections désactivées.
- **Docker (élevé) : atténué.** Les ports sensibles ne sont plus publiés; MinIO est lié à localhost.
- **Création de mémos (moyen) : corrigée dans le worktree.** Voir constat 3.

## Limites

Il s'agit d'une revue statique, pas d'une preuve d'exploitation ni d'une vérification de la configuration de production. L'exposition dépend notamment des règles réseau, des secrets et des contrôles de déploiement. Les corrections sont locales et n'ont pas été commitées. Le checkout CamPay restera suspendu jusqu'à l'ajout d'une vérification serveur du statut de paiement et d'un rapprochement avec une transaction enregistrée.

---

## Audit initial du 24 novembre 2026

**Projet :** Ebeno Research Platform
**Date :** 24 novembre 2026
**Périmètre :** revue statique ciblée du dépôt
**Statut :** constats à confirmer et corriger — aucune correction n'a été appliquée dans le cadre de cet audit.

## Synthèse exécutive

La revue a relevé **8 constats** : **1 critique**, **6 élevés** et **1 moyen**. Les risques les plus importants concernent l'absence de vérification de l'authenticité de notifications de paiement, des contrôles d'accès manquants sur des ressources de projet et des sockets de collaboration, ainsi qu'un risque de SSRF dans les webhooks sortants.

Si les comportements décrits sont confirmés dans la version déployée, un attaquant pourrait notamment obtenir des privilèges payants sans paiement, accéder à des contenus de projets ou les modifier, ou tenter d'atteindre des services internes depuis le serveur. L'exposition effective dépend aussi de la configuration de production, des secrets, des règles réseau et des protections du fournisseur de paiement.

### Priorités recommandées

1. **Critique — Dodo :** authentifier les webhooks avant toute attribution d'abonnement.
2. **Élevé — contrôles d'accès :** vérifier l'appartenance au projet dans le chat, les sockets, les téléversements et les mémos.
3. **Élevé — CamPay :** rendre la vérification de signature obligatoire et confirmer les paiements auprès du fournisseur.
4. **Élevé — SSRF :** sécuriser la résolution et la connexion des webhooks sortants, y compris les redirections.
5. **Élevé — déploiement :** supprimer les identifiants par défaut et limiter l'exposition réseau des services Docker.

## Détail des constats

### 1. Webhook Dodo sans vérification d'authenticité

- **Sévérité :** critique
- **Confiance :** 10/10
- **Emplacement :** `backend/src/controllers/dodoController.ts`, lignes 35-48
- **Catégorie :** authentification de webhook / attribution de privilèges

Le gestionnaire semble traiter l'événement `payment.succeeded` et utiliser les champs `user_id` et `plan_id` des métadonnées pour activer un abonnement sans vérifier la signature du fournisseur. Le fait que la route utilise un parseur JSON brut ne suffit pas à authentifier l'émetteur.

**Impact potentiel :** un appelant non authentifié pourrait fabriquer une notification de paiement et tenter d'activer des fonctionnalités payantes ou institutionnelles pour un compte choisi, sans paiement réel.

**Mesures recommandées :**

- Vérifier la signature selon le mécanisme officiel Dodo, avec le secret de webhook configuré et le corps brut exact de la requête.
- Refuser la requête si le secret est absent, si la signature est invalide ou si l'événement n'est pas cohérent.
- Accorder les droits à partir de données de paiement authentifiées; valider le montant, la devise, le plan et l'identité client.
- Rendre le traitement idempotent et protéger contre le rejeu des événements.

### 2. Vérification CamPay conditionnelle

- **Sévérité :** élevée
- **Confiance :** 9/10
- **Emplacement :** `backend/src/controllers/paymentWebhookController.ts`, lignes 61-91
- **Catégorie :** authentification de webhook / attribution de privilèges

La vérification de signature semble n'être effectuée que si le secret **et** la signature entrante sont présents. Le traitement peut ensuite accepter un statut `SUCCESSFUL` et une référence externe fournis par la requête.

**Impact potentiel :** si la configuration du secret est absente, ou si la route accepte une requête sans signature, un attaquant pourrait tenter de faire enregistrer un paiement comme réussi et d'activer un abonnement.

**Mesures recommandées :**

- Exiger une signature valide pour chaque notification et échouer de manière fermée si le secret n'est pas configuré.
- Vérifier le format signé conformément à la documentation CamPay et valider la notification sur le corps reçu.
- Confirmer côté serveur le statut du paiement, le montant, la devise, la référence et le plan auprès du fournisseur.
- Rejeter les événements déjà traités ou expirés.

### 3. Création de conversation sans contrôle d'appartenance au projet

- **Sévérité :** élevée
- **Confiance :** 10/10
- **Emplacement :** `backend/src/controllers/chatController.ts`, lignes 83-103
- **Catégorie :** contrôle d'accès / accès inter-comptes

La création d'une conversation semble vérifier que le projet existe, sans vérifier que l'utilisateur authentifié en est membre. Le contexte de projet est ensuite utilisé pour générer des réponses de chat.

**Impact potentiel :** un utilisateur authentifié pourrait tenter de créer une conversation liée à un projet tiers et d'obtenir des informations issues de son titre, de ses résumés ou de ses transcriptions par l'intermédiaire du chat.

**Mesures recommandées :**

- Vérifier l'appartenance de l'utilisateur au projet avant de créer une conversation.
- Répéter ce contrôle lors de chaque lecture ou génération utilisant le projet, sans se fier uniquement à l'accès lors de la création de la conversation.
- Utiliser une requête de base de données qui associe l'identifiant du projet à l'utilisateur autorisé.

### 4. Socket de collaboration sans authentification ni autorisation

- **Sévérité :** élevée
- **Confiance :** 10/10
- **Emplacement :** `backend/src/sockets/collaborationSocket.ts`, lignes 123-198 et 240-263
- **Catégorie :** contrôle d'accès / exposition et modification de données

Les événements de socket semblent accepter des identifiants de projet et de document fournis par le client pour rejoindre des salles, lire un document et modifier son contenu. Aucun contrôle d'identité ou d'appartenance n'a été identifié dans les événements signalés.

**Impact potentiel :** un client non authentifié, ou un utilisateur sans droits suffisants, pourrait tenter de lire ou d'écraser des documents en connaissant ou en devinant leurs identifiants.

**Mesures recommandées :**

- Ajouter une authentification Socket.IO qui vérifie le jeton et établit l'identité côté serveur.
- Vérifier les droits sur le projet et le document à chaque événement sensible, notamment lors de la jointure d'une salle, de la lecture et de l'édition.
- Ne jamais traiter les identifiants envoyés par le client comme preuve d'autorisation.
- Appliquer également des limites de taille, de fréquence et de validation aux messages d'édition.

### 5. Téléversement dans un projet sans contrôle d'appartenance

- **Sévérité :** élevée
- **Confiance :** 9/10
- **Emplacement :** `backend/src/controllers/uploadController.ts`, lignes 79-121
- **Catégorie :** contrôle d'accès / intégrité des données

La route semble authentifier l'utilisateur mais accepter un `projectId` fourni par celui-ci sans vérifier son appartenance au projet avant le téléversement et l'enregistrement du fichier.

**Impact potentiel :** un utilisateur authentifié pourrait tenter d'ajouter des fichiers dans le projet d'un autre utilisateur, polluer ses données ou consommer son espace de stockage.

**Mesures recommandées :**

- Vérifier l'appartenance au projet avant toute opération de stockage ou d'insertion en base.
- Appliquer une limite de taille et les validations de type déjà prévues par l'application.
- Conserver l'autorisation au niveau serveur, même si l'interface ne propose que les projets accessibles.

### 6. Risque de SSRF dans le service de webhooks sortants

- **Sévérité :** élevée
- **Confiance :** 8/10
- **Emplacement :** `backend/src/services/webhookService.ts`, lignes 13-43
- **Catégorie :** requêtes serveur vers des destinations contrôlées

La validation décrite semble reposer sur une liste noire incomplète de noms ou formes d'adresses. Elle ne paraît pas couvrir toutes les adresses IPv4/IPv6 non publiques, la résolution DNS au moment de la connexion ou les redirections HTTP suivies par défaut.

**Impact potentiel :** un utilisateur autorisé à configurer un webhook pourrait tenter de faire émettre des requêtes depuis le serveur vers des adresses internes ou des services de métadonnées. Une validation initiale par nom ne suffit pas à empêcher le rebinding DNS ou une redirection vers une destination interdite.

**Mesures recommandées :**

- Résoudre les noms et refuser toutes les adresses non publiques, y compris loopback, link-local, privées, IPv6 et adresses de métadonnées.
- Appliquer le contrôle à la destination réellement contactée et protéger la connexion contre les changements de résolution DNS.
- Désactiver les redirections ou revalider chaque destination de redirection avant de la contacter.
- Ajouter des délais, limites de réponse et restrictions de protocoles (HTTPS uniquement si compatible avec le besoin).

### 7. Ports de services Docker publiés et identifiants par défaut

- **Sévérité :** élevée
- **Confiance :** 9/10
- **Emplacement :** `docker-compose.yml`, lignes 2-13
- **Catégorie :** configuration de déploiement

La configuration signalée publie des ports PostgreSQL, MinIO et de services IA sur l'hôte. Elle contient également un mot de passe PostgreSQL statique et un repli vers des identifiants MinIO par défaut. La disponibilité depuis Internet dépend de l'interface d'écoute et du pare-feu de l'hôte; la publication d'un port augmente néanmoins le risque d'exposition accidentelle.

**Impact potentiel :** si les ports sont joignables depuis un réseau non fiable, un tiers pourrait tenter d'accéder à la base, à l'interface de stockage ou aux services IA, notamment en utilisant des identifiants connus publiquement.

**Mesures recommandées :**

- Ne pas publier les ports nécessaires uniquement aux communications internes entre conteneurs.
- Si un accès hôte est nécessaire en développement, limiter explicitement l'écoute à `127.0.0.1`.
- Exiger des secrets propres à l'environnement et empêcher le démarrage de production avec des valeurs par défaut.
- Vérifier les règles de pare-feu, les interfaces d'écoute et les paramètres de déploiement réels.

### 8. Création de mémos sans contrôle d'appartenance au projet

- **Sévérité :** moyenne
- **Confiance :** 9/10
- **Emplacement :** `backend/src/controllers/memoController.ts`, lignes 77-103
- **Catégorie :** contrôle d'accès / intégrité des données

La création de mémo semble accepter un `projectId` arbitraire sans vérifier que l'utilisateur authentifié est membre du projet. Le traitement peut également émettre un événement associé à ce projet.

**Impact potentiel :** un utilisateur authentifié pourrait injecter des mémos et événements dans un projet auquel il n'a pas accès, ce qui compromettrait l'intégrité de l'espace de travail et de son historique d'activité.

**Mesures recommandées :**

- Vérifier l'appartenance au projet avant l'insertion et avant toute émission d'événement.
- Ajouter des tests d'autorisation couvrant utilisateur membre, non-membre et projet inexistant.

## Limites et suites de vérification

Ce document restitue les constats de la revue statique effectuée sur le dépôt. Il ne constitue pas une preuve d'exploitation ni une certification de sécurité. L'audit n'a pas vérifié les environnements de production, les valeurs réellement configurées dans les secrets, les règles de pare-feu, les versions déployées, ni le comportement des fournisseurs de paiement en conditions réelles. Les conclusions doivent donc être confirmées dans le contexte de déploiement avant de mesurer l'exposition effective.

Avant de corriger, il est recommandé de :

1. Confirmer que la version examinée correspond à la version déployée.
2. Vérifier la configuration des webhooks, secrets, ports et pare-feu sans exposer de secrets dans le rapport.
3. Ajouter des tests négatifs d'autorisation pour chaque ressource de projet et des tests de signature/rejeu pour les webhooks.
4. Prioriser la fermeture des webhooks de paiement non authentifiés et des accès inter-projets.

**Aucune correction n'a été effectuée.** Ce rapport sert de base à la décision et à la planification des corrections.
