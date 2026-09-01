import { Router } from 'express';
import { db } from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();

// Ajouter un membre à un projet
router.post('/:projectId/members', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const { email, role } = req.body;

    // Vérifier que l'utilisateur est propriétaire
    const owner = await db('project_members')
      .where({ projectId, userId, role: 'OWNER' })
      .first();
    if (!owner) {
      return res.status(403).json({ error: 'Seul le propriétaire peut ajouter des membres' });
    }

    // Trouver l'utilisateur par email
    const userToAdd = await db('users').where({ email }).first();
    if (!userToAdd) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier s'il est déjà membre
    const existing = await db('project_members')
      .where({ projectId, userId: userToAdd.id })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Cet utilisateur est déjà membre' });
    }

    // Ajouter le membre
    await db('project_members').insert({
      id: Date.now().toString(),
      projectId,
      userId: userToAdd.id,
      role: role || 'MEMBER',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    res.status(201).json({ message: 'Membre ajouté avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les membres d'un projet
router.get('/:projectId/members', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    const members = await db('project_members')
      .join('users', 'project_members.userId', 'users.id')
      .where('project_members.projectId', projectId)
      .select('users.id', 'users.email', 'users.name', 'project_members.role');

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer un membre
router.delete('/:projectId/members/:memberId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, memberId } = req.params;

    const owner = await db('project_members')
      .where({ projectId, userId, role: 'OWNER' })
      .first();
    if (!owner) {
      return res.status(403).json({ error: 'Seul le propriétaire peut retirer des membres' });
    }

    await db('project_members')
      .where({ projectId, userId: memberId })
      .delete();

    res.json({ message: 'Membre retiré' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
