// backend/src/controllers/projectController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';

// Types pour les rôles
const ProjectRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
  MEMBER: 'MEMBER'
};

// Utilitaires
const generateRandomColor = (): string => {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#E76F51', '#F4A261', '#2A9D8F', '#9B5DE5', '#F15BB5'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Créer un projet
export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { title, description, tags } = req.body;
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Le titre est requis (3 caractères min)' });
    }

    const id = Date.now().toString();
    
    // Insérer le projet avec userId
    await db('projects').insert({
      id,
      title: title.trim(),
      description: description?.trim() || '',
      userId: userId,
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    });

    // Ajouter le membre (OWNER)
    await db('project_members').insert({
      id: Date.now().toString() + '_owner',
      projectId: id,
      userId: userId,
      role: ProjectRole.OWNER,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    });

    // Ajouter les tags si présents
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagId = Date.now().toString() + '_' + Math.random().toString(36).substring(7);
        await db('tags').insert({
          id: tagId,
          name: tagName.trim(),
          color: generateRandomColor(),
          category: 'user',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        });

        await db('project_tags').insert({
          projectId: id,
          tagId: tagId,
          createdAt: Math.floor(Date.now() / 1000)
        });
      }
    }

    const project = await db('projects')
      .where({ id })
      .first();

    return res.status(201).json({ success: true, data: project, message: 'Projet créé' });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer tous les projets
export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query = db('projects')
      .select('projects.*')
      .join('project_members', 'projects.id', 'project_members.projectId')
      .where('project_members.userId', userId);

    if (search) {
      query = query.andWhere(function() {
        this.where('projects.title', 'like', `%${search}%`)
            .orWhere('projects.description', 'like', `%${search}%`);
      });
    }

    const countQuery = db('projects')
      .join('project_members', 'projects.id', 'project_members.projectId')
      .where('project_members.userId', userId);

    const [projects, totalResult] = await Promise.all([
      query.orderBy('projects.updatedAt', 'desc')
        .limit(Number(limit))
        .offset(skip),
      countQuery.count('projects.id as count')
    ]);

    const total = Number(totalResult[0]?.count || 0);

    return res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer un projet par ID
export const getProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const project = await db('projects')
      .where({ id })
      .first();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    }

    const member = await db('project_members')
      .where({ projectId: id, userId: userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const members = await db('project_members')
      .join('users', 'project_members.userId', 'users.id')
      .where('project_members.projectId', id)
      .select('project_members.*', 'users.email', 'users.name');

    const tags = await db('project_tags')
      .join('tags', 'project_tags.tagId', 'tags.id')
      .where('project_tags.projectId', id)
      .select('tags.*');

    return res.status(200).json({
      success: true,
      data: { ...project, members, tags }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Mettre à jour un projet
export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { title, description } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const member = await db('project_members')
      .where({ projectId: id, userId: userId })
      .whereIn('role', [ProjectRole.OWNER, ProjectRole.EDITOR])
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    await db('projects')
      .where({ id })
      .update({
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        updatedAt: Math.floor(Date.now() / 1000)
      });

    const project = await db('projects')
      .where({ id })
      .first();

    return res.status(200).json({ success: true, data: project, message: 'Projet mis à jour' });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer un projet
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const member = await db('project_members')
      .where({ projectId: id, userId: userId, role: ProjectRole.OWNER })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Seul le propriétaire peut supprimer ce projet' });
    }

    await db('project_tags').where({ projectId: id }).delete();
    await db('project_members').where({ projectId: id }).delete();
    await db('projects').where({ id }).delete();

    return res.status(200).json({ success: true, message: 'Projet supprimé' });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Ajouter un tag
export const addTag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id: projectId } = req.params;
    const { name, color } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const member = await db('project_members')
      .where({ projectId: projectId, userId: userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    let tag = await db('tags')
      .where({ name: name.trim(), category: 'user' })
      .first();

    if (!tag) {
      const tagId = Date.now().toString() + '_' + Math.random().toString(36).substring(7);
      await db('tags').insert({
        id: tagId,
        name: name.trim(),
        color: color || generateRandomColor(),
        category: 'user',
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000)
      });
      tag = await db('tags').where({ id: tagId }).first();
    }

    const existing = await db('project_tags')
      .where({ projectId: projectId, tagId: tag.id })
      .first();

    if (existing) {
      return res.status(409).json({ success: false, message: 'Ce tag est déjà associé au projet' });
    }

    await db('project_tags').insert({
      projectId: projectId,
      tagId: tag.id,
      createdAt: Math.floor(Date.now() / 1000)
    });

    return res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer un tag
export const removeTag = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id: projectId, tagId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const member = await db('project_members')
      .where({ projectId: projectId, userId: userId })
      .whereIn('role', [ProjectRole.OWNER, ProjectRole.EDITOR])
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    await db('project_tags')
      .where({ projectId: projectId, tagId: tagId })
      .delete();

    return res.status(200).json({ success: true, message: 'Tag retiré du projet' });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
