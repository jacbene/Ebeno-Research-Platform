import { Request, Response } from 'express';
import { db } from '../db/knex';

// Récupérer tous les utilisateurs
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await db('users').select('id', 'email', 'name', 'role', 'created_at', 'updated_at');
    res.json(users);
  } catch (error) {
    console.error('Erreur getUsers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

// Récupérer un utilisateur par ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await db('users')
      .select('id', 'email', 'name', 'role', 'created_at', 'updated_at')
      .where({ id })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
};

// Mettre à jour un utilisateur
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, email } = req.body;

    const existing = await db('users').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    await db('users')
      .where({ id })
      .update({
        name: name || existing.name,
        role: role || existing.role,
        email: email || existing.email,
        updated_at: Date.now()
      });

    const updated = await db('users')
      .select('id', 'email', 'name', 'role', 'created_at', 'updated_at')
      .where({ id })
      .first();

    res.json(updated);
  } catch (error) {
    console.error('Erreur updateUser:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un utilisateur
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db('users').where({ id }).delete();

    if (!deleted) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteUser:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// Créer un utilisateur (admin)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();

    await db('users').insert({
      id,
      email,
      password: hashedPassword,
      name,
      role: role || 'RESEARCHER',
      created_at: Date.now(),
      updated_at: Date.now()
    });

    res.status(201).json({ 
      message: 'Utilisateur créé avec succès',
      user: { id, email, name, role: role || 'RESEARCHER' }
    });
  } catch (error) {
    console.error('Erreur createUser:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
};
