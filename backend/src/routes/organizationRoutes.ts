import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../db/knex';
import crypto from 'crypto';

const router = Router();

// Middleware pour vérifier si l'utilisateur est le propriétaire (Owner) de l'org
const requireOrgOwner = async (req: any, res: any, next: any) => {
  try {
    const org = await db('organizations').where({ owner_id: req.user.id }).first();
    if (!org) return res.status(403).json({ error: "Vous n'êtes pas propriétaire d'une organisation." });
    req.organization = org; // On attache l'org à la requête
    next();
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// ────────────────────────────────────────────────────────────
// 1. Obtenir les infos de mon organisation + membres
// ────────────────────────────────────────────────────────────
router.get('/me', authenticate, requireOrgOwner, async (req: any, res: any) => {
  try {
    const org = req.organization;

    // Récupérer les membres avec leurs infos utilisateur
    const members = await db('organization_members')
      .join('users', 'organization_members.user_id', 'users.id')
      .where({ organization_id: org.id })
      .select(
        'organization_members.id',
        'organization_members.user_id',
        'organization_members.role',
        'organization_members.joined_at',
        'users.name as user_name',
        'users.email as user_email',
        'users.avatar as user_avatar'
      );

    // Récupérer les invitations en attente
    const invitations = await db('organization_invitations')
      .where({ organization_id: org.id, status: 'pending' })
      .select('id', 'email', 'created_at', 'expires_at');

    res.json({
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        max_seats: org.max_seats,
        seats_used: members.length,
        seats_pending: invitations.length,
        seats_available: org.max_seats - members.length - invitations.length
      },
      members,
      invitations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la récupération de l'organisation." });
  }
});

// ────────────────────────────────────────────────────────────
// 2. Inviter un membre
// ────────────────────────────────────────────────────────────
router.post('/invite', authenticate, requireOrgOwner, async (req: any, res: any) => {
  try {
    const org = req.organization;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Email invalide." });
    }

    // Vérifier la limite de sièges (membres + invitations en attente)
    const memberCount = await db('organization_members').where({ organization_id: org.id }).count('id as count').first();
    const inviteCount = await db('organization_invitations').where({ organization_id: org.id, status: 'pending' }).count('id as count').first();
    
    const totalUsed = Number(memberCount?.count || 0) + Number(inviteCount?.count || 0);

    if (totalUsed >= org.max_seats) {
      return res.status(400).json({ 
        error: `Limite de ${org.max_seats} sièges atteinte. Ajoutez des sièges pour inviter plus de membres.` 
      });
    }

    // Vérifier si l'email est déjà invité ou membre
    const existingMember = await db('users').where({ email }).first();
    if (existingMember) {
      const alreadyInOrg = await db('organization_members').where({ user_id: existingMember.id }).first();
      if (alreadyInOrg) return res.status(400).json({ error: "Cet utilisateur fait déjà partie d'une organisation." });
    }
    const existingInvite = await db('organization_invitations').where({ organization_id: org.id, email, status: 'pending' }).first();
    if (existingInvite) return res.status(400).json({ error: "Une invitation est déjà en attente pour cet email." });

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valide 7 jours

    await db('organization_invitations').insert({
      organization_id: org.id,
      email: email.toLowerCase().trim(),
      token,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date()
    });

    // TODO: Envoyer l'email via Brevo avec le lien /join-org?token=xxx
    console.log(`📧 Invitation générée pour ${email} (Token: ${token.substring(0, 8)}...)`);

    res.json({ success: true, message: "Invitation envoyée avec succès." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'invitation." });
  }
});

// ────────────────────────────────────────────────────────────
// 3. Vérifier un token d'invitation (public, sans auth)
// ────────────────────────────────────────────────────────────
router.get('/invitations/:token', async (req: any, res: any) => {
  try {
    const { token } = req.params;

    const invitation = await db('organization_invitations')
      .where({ token, status: 'pending' })
      .first();

    if (!invitation) {
      return res.status(404).json({ error: "Invitation invalide ou expirée." });
    }

    // Vérifier si l'invitation a expiré
    if (new Date(invitation.expires_at) < new Date()) {
      await db('organization_invitations').where({ id: invitation.id }).update({ status: 'expired' });
      return res.status(400).json({ error: "Cette invitation a expiré." });
    }

    const org = await db('organizations').where({ id: invitation.organization_id }).first();

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        organization_name: org?.name || 'Organisation',
        organization_id: org?.id,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ────────────────────────────────────────────────────────────
// 4. Accepter l'invitation (authentifié)
// ────────────────────────────────────────────────────────────
router.post('/invitations/:token/accept', authenticate, async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // 1. Vérifier l'invitation
    const invitation = await db('organization_invitations')
      .where({ token, status: 'pending' })
      .first();

    if (!invitation) {
      return res.status(404).json({ error: "Invitation invalide ou expirée." });
    }

    // 2. Vérifier que l'utilisateur connecté correspond à l'email invité (sécurité)
    const user = await db('users').where({ id: userId }).first();
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({ error: "Cette invitation a été envoyée à une autre adresse email." });
    }

    // 3. Vérifier si l'utilisateur n'est pas déjà dans une organisation
    const existingMembership = await db('organization_members').where({ user_id: userId }).first();
    if (existingMembership) {
      return res.status(400).json({ error: "Vous faites déjà partie d'une organisation." });
    }

    // 4. Ajouter l'utilisateur à l'organisation
    await db('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: 'member',
      joined_at: new Date()
    });

    // 5. Marquer l'invitation comme acceptée
    await db('organization_invitations')
      .where({ id: invitation.id })
      .update({ status: 'accepted', updated_at: new Date() });

    console.log(`🤝 ${user.email} a rejoint l'organisation ${invitation.organization_id}`);

    res.json({ success: true, message: "Vous avez rejoint l'organisation avec succès !" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'acceptation de l'invitation." });
  }
});

export default router;
