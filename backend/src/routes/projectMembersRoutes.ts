// backend/src/routes/projectMembersRoutes.ts
import { Router } from 'express';
import { db } from '../db/knex';
import { authenticate } from '../middleware/auth';
import { logActivity } from '../services/activityService';
import { emitGlobal } from '../socketManager';

const router = Router();

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

    // Trouver l'utilisateur par email
    const userToAdd = await db('users').where({ email: email.toLowerCase() }).first();
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

    // ✅ Insérer avec des ISO strings (pas Date.now())
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
        email: userToAdd.email,
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
      targetName: userToAdd.name || userToAdd.email,
    });

    res.status(201).json({
      success: true,
      message: 'Membre ajouté avec succès',
      member: {
        ...member,
        email: userToAdd.email,
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
        'users.name',
        'users.avatar'
      );

    res.json(members);
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
