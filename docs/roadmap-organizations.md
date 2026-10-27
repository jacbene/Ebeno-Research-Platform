# Roadmap : Fonctionnalité Organisations (Plan Institution)

## Phase 1 (En cours)
- [x] Création des tables `organizations`, `organization_members`, `organization_invitations`, `organization_usage`.
- [x] Modification du service `aiQuotaService.ts` pour le pool partagé (10 000 messages).
- [ ] Adapter le webhook Paddle pour créer une organisation à l'achat du plan Institution.
- [ ] Créer la page "Mon Organisation" dans les Paramètres (liste des membres).
- [ ] API d'invitation (génération de token + envoi d'email Brevo).
- [ ] Route pour accepter l'invitation.

## Phase 2 (Plus tard)
- [ ] **Achat de sièges supplémentaires** (Add-on Paddle).
    - Prix : 10€/mois ou 100€/an par siège.
    - Le webhook Paddle `transaction.completed` doit incrémenter `max_seats` dans la table `organizations`.
    - Ajouter un sélecteur de quantité dans le modal Paddle.
- [ ] Suppression/retrait d'un membre par l'owner.
- [ ] Transfert de propriété de l'organisation.
