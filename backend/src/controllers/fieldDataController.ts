// backend/controllers/fieldDataController.ts
// URL: /api/field-data
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Changé de '../utils/prisma' à '../lib/prisma'
import {
  createFieldNoteSchema,
  updateFieldNoteSchema,
  syncFieldDataSchema
} from '../validators/fieldData.validator';

export class FieldDataController {
  // ==================== CRÉATION ====================
  async createFieldNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const data = createFieldNoteSchema.parse(req.body);

      const fieldNote = await prisma.fieldNote.create({
        data: {
          ...data,
          userId
        },
        include: {
          media: true
        }
      });

      res.status(201).json({
        success: true,
        data: fieldNote
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== LECTURE ====================
  async getProjectFieldNotes(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const {
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {
        projectId,
        userId
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Compter le total
      const total = await prisma.fieldNote.count({ where });

      // Obtenir les notes
      const fieldNotes = await prisma.fieldNote.findMany({
        where,
        include: {
          media: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: {
          fieldNotes,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            pages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir une note spécifique par ID
  async getFieldNoteById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;

      const fieldNote = await prisma.fieldNote.findFirst({
        where: {
          id,
          userId
        },
        include: {
          media: true,
          project: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!fieldNote) {
        return res.status(404).json({
          success: false,
          error: 'Field note not found or access denied'
        });
      }

      res.status(200).json({
        success: true,
        data: fieldNote
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== MISE À JOUR ====================
  async updateFieldNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const data = updateFieldNoteSchema.parse(req.body);

      // Vérifier que la note existe et appartient à l'utilisateur
      const existingNote = await prisma.fieldNote.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingNote) {
        return res.status(404).json({
          success: false,
          error: 'Field note not found or access denied'
        });
      }

      const fieldNote = await prisma.fieldNote.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          media: true
        }
      });

      res.status(200).json({
        success: true,
        data: fieldNote
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== SUPPRESSION ====================
  async deleteFieldNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;

      // Vérifier que la note existe et appartient à l'utilisateur
      const existingNote = await prisma.fieldNote.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingNote) {
        return res.status(404).json({
          success: false,
          error: 'Field note not found or access denied'
        });
      }

      // Supprimer d'abord les médias associés
      await prisma.fieldMedia.deleteMany({
        where: { fieldNoteId: id }
      });

      // Supprimer la note
      await prisma.fieldNote.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Field note deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== SYNCHRONISATION MOBILE ====================
  async syncFieldData(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { fieldNotes, lastSync } = syncFieldDataSchema.parse(req.body);

      // Récupérer les modifications côté serveur
      const serverChanges = await prisma.fieldNote.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gt: new Date(lastSync) } },
            { updatedAt: { gt: new Date(lastSync) } }
          ]
        }
      });

      // Traiter les modifications du client
      const processedNotes = [];
      for (const note of fieldNotes) {
        if (note.id && note.id.startsWith('local-')) {
          // Nouvelle note à créer
          const created = await prisma.fieldNote.create({
            data: {
              ...note,
              id: undefined, // Laisser générer un nouvel ID
              userId
            }
          });
          processedNotes.push(created);
        } else if (note.id) {
          // Mettre à jour une note existante
          const existing = await prisma.fieldNote.findUnique({
            where: { id: note.id }
          });

          if (existing) {
            // Résolution de conflit: prendre la version la plus récente
            const clientUpdatedAt = new Date(note.updatedAt);
            if (clientUpdatedAt > existing.updatedAt) {
              // Le client a une version plus récente
              const updated = await prisma.fieldNote.update({
                where: { id: note.id },
                data: {
                  ...note
                }
              });
              processedNotes.push(updated);
            } else {
              // Le serveur a une version plus récente
              processedNotes.push(existing);
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          serverChanges,
          processedNotes,
          syncTimestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== TÉLÉCHARGEMENT DE MÉDIA ====================
  async uploadMedia(req: Request, res: Response) {
    try {
      if (!req.file) {
        throw new Error('Aucun fichier fourni');
      }
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { fieldNoteId } = req.body;

      // Stocker le fichier (exemple avec Firebase Storage)
      const fileUrl = await this.storeFile(req.file);

      // Créer l'enregistrement média
      const media = await prisma.fieldMedia.create({
        data: {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          fieldNoteId
        }
      });

      res.status(201).json({
        success: true,
        data: media
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== DONNÉES GÉOGRAPHIQUES ====================
  async getGeospatialData(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;

      const fieldNotes = await prisma.fieldNote.findMany({
        where: {
          projectId,
          userId,
          location: { not: null }
        },
        select: {
          id: true,
          title: true,
          location: true,
          createdAt: true,
        }
      });

      // Formater pour Mapbox/Leaflet
      const geojson = {
        type: 'FeatureCollection',
        features: fieldNotes
          .filter((note: any) => note.location && note.location.lat && note.location.lng)
          .map((note: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [note.location.lng, note.location.lat]
            },
            properties: {
              id: note.id,
              title: note.title,
              date: note.createdAt.toISOString(),
            }
          }))
      };

      res.status(200).json({
        success: true,
        data: geojson
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== MÉTHODES PRIVÉES ====================
  private async storeFile(file: Express.Multer.File): Promise<string> {
    // Implémentation de stockage de fichier
    // À adapter selon votre solution (Firebase Storage, AWS S3, etc.)
    
    // Exemple avec Firebase Storage
    // const bucket = admin.storage().bucket();
    // const filename = `${Date.now()}-${file.originalname}`;
    // const fileUpload = bucket.file(filename);
    // await fileUpload.save(file.buffer, {
    //   metadata: {
    //     contentType: file.mimetype
    //   }
    // });
    // return `https://storage.googleapis.com/${bucket.name}/${filename}`;
    
    // Pour l'instant, retourner une URL factice
    return `https://example.com/uploads/${Date.now()}-${file.originalname}`;
  }
}

export default new FieldDataController();
