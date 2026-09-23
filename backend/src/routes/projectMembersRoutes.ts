// backend/src/routes/projectMembersRoutes.ts
import { Router } from 'express';
import { db } from '../db/knex';
import { authenticate } from '../middleware/auth';
import { logActivity } from '../services/activityService';
import { emitGlobal } from '../socketManager';
import { decrypt, hashEmail } from '../services/encryptionService';
import { logger } from '../utils/logger';
import { canSendEmail } from '../services/emailPreferencesService';
import { sendProjectMemberAddedEmail } from '../services/emailService';

const router = Router();

// ✅ Helper : récupérer l'email en clair d'un user (chiffré ou legacy)
const getUserEmail = (user: any): string => {
  if (user?.emailEncrypted) {
    const decrypted = decrypt(user.emailEncrypted);
    if (decrypted) return decrypted;
  }
  return user?.email || '';
};

// ============================================================
// AJOUTER UN MEMBRE
// ============================================================
router.post('/:projectId/members', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId } = req.params;
    const { email, role = 'MEMBER' } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!email) return res.status(400).json({ error: 'Email requis' });

    // Vérifier que l'utilisateur est OWNER ou EDITOR
    const requester = await db('project_members')
      .where({ projectId, userId })
      .whereIn('role', ['OWNER', 'EDITOR'])
      .first();

    if (!requester) {
      return res.status(403).json({ error: 'Seul le propriétaire ou un éditeur peut ajouter des membres' });
    }

    // ✅ FIX : Rechercher par emailHash OU email legacy (comptes chiffrés)
    const emailLower = email.toLowerCase().trim();
    const emailHash = hashEmail(emailLower);

    const userToAdd = await db('users')
      .where({ emailHash })
      .orWhere({ email: emailLower })
      .first();

    if (!userToAdd) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé avec cet email' });
    }

    // Vérifier s'il est déjà membre
    const existing = await db('project_members')
      .where({ projectId, userId: userToAdd.id })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Cet utilisateur est déjà membre du projet' });
    }

    // ✅ Insérer
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await db('project_members').insert({
      id,
      projectId,
      userId: userToAdd.id,
      role: role.toUpperCase(),
      createdAt: now,
      updatedAt: now,
    });

    const member = await db('project_members').where({ id }).first();

    // 📡 Émettre l'événement Socket.IO
    emitGlobal('member-added', {
      projectId,
      member: {
        ...member,
        email: getUserEmail(userToAdd),
        name: userToAdd.name,
        avatar: userToAdd.avatar,
      },
    });

    // 📋 Activité
    await logActivity({
      projectId,
      userId,
      userName,
      action: 'member-added',
      targetType: 'member',
      targetId: userToAdd.id,
      targetName: userToAdd.name || getUserEmail(userToAdd),
    });

    // ============================================================
    // ✅ NOUVEAU : Email de notification (non bloquant)
    // ============================================================
    (async () => {
      try {
        // 1. Vérifier les préférences email du destinataire
        const wantsEmail = await canSendEmail(userToAdd.id, 'projectMemberAdded');
        if (!wantsEmail) {
          logger.info(`ℹ️  [email] ${userToAdd.id} a désactivé les notifs "membre ajouté"`);
          return;
        }

        // 2. Récupérer le nom du projet
        const project = await db('projects').where({ id: projectId }).first();
        if (!project) return;

        // 3. Récupérer le nom de l'owner qui ajoute
        const ownerName = user?.name || getUserEmail(user) || 'Un utilisateur';

        // 4. Envoyer l'email
        const to = getUserEmail(userToAdd);
        if (!to) {
          logger.warn(`⚠️ [email] Pas d'email pour ${userToAdd.id}`);
          return;
        }

        await sendProjectMemberAddedEmail({
          to,
          name: userToAdd.name || 'chercheur',
          projectName: project.title || 'Projet',
          ownerName,
          projectId,
          lang: userToAdd.language || 'fr',
        });
      } catch (err: any) {
        logger.warn(`⚠️ [email] Échec notif "membre ajouté": ${err.message}`);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Membre ajouté avec succès',
      member: {
        ...member,
        email: getUserEmail(userToAdd),
        name: userToAdd.name,
        avatar: userToAdd.avatar,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur addMember:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ============================================================
// LISTER LES MEMBRES
// ============================================================
router.get('/:projectId/members', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const members = await db('project_members')
      .join('users', 'project_members.userId', 'users.id')
      .where('project_members.projectId', projectId)
      .select(
        'project_members.id',
        'project_members.userId',
        'project_members.role',
        'project_members.createdAt',
        'users.email',
        'users.emailEncrypted',
        'users.name',
        'users.avatar'
      );

    // ✅ Déchiffrer les emails avant retour
    const sanitized = members.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      email: getUserEmail(m),
      name: m.name,
      avatar: m.avatar,
    }));

    res.json(sanitized);
  } catch (error: any) {
    console.error('❌ Erreur getMembers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// RETIRER UN MEMBRE
// ============================================================
router.delete('/:projectId/members/:memberId', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId, memberId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const requester = await db('project_members')
      .where({ projectId, userId })
      .whereIn('role', ['OWNER', 'EDITOR'])
      .first();

    if (!requester) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Empêcher de retirer le OWNER
    const targetMember = await db('project_members')
      .where({ projectId, userId: memberId })
      .first();

    if (targetMember?.role === 'OWNER') {
      return res.status(403).json({ error: 'Impossible de retirer le propriétaire' });
    }

    await db('project_members').where({ projectId, userId: memberId }).delete();

    emitGlobal('member-removed', { projectId, memberId });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'member-removed',
      targetType: 'member',
      targetId: memberId,
    });

    res.json({ success: true, message: 'Membre retiré' });
  } catch (error: any) {
    console.error('❌ Erreur removeMember:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
