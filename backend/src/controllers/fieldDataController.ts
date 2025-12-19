// backend/controllers/fieldDataController.ts
// URL: /api/field-data
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  createFieldNoteSchema, 
  updateFieldNoteSchema,
  syncFieldDataSchema 
} from '../validators/fieldData.validator';

export class FieldDataController {
  
  // Créer une note de terrain
  async createFieldNote(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const data = createFieldNoteSchema.parse(req.body);
      
      const fieldNote = await prisma.fieldNote.create({
        data: {
          ...data,
          userId,
          deviceId: req.headers['x-device-id'] as string || null
        },
        include: {
          media: true,
          tags: true
        }
      });
      
      res.status(201).json({
        success: true,
        data: fieldNote
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir les notes de terrain d'un projet
  async getProjectFieldNotes(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { 
        type,
        startDate,
        endDate,
        tags,
        page = 1,
        limit = 20
      } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const where: any = {
        projectId,
        userId
      };
      
      // Filtres
      if (type) where.type = type;
      if (tags) {
        where.tags = {
          some: {
            id: { in: (tags as string).split(',') }
          }
        };
      }
      
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
          media: true,
          tags: true
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
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Synchroniser les données mobiles
  async syncFieldData(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { deviceId, fieldNotes, lastSync } = syncFieldDataSchema.parse(req.body);
      
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
              userId,
              deviceId,
              syncVersion: 1,
              isSynced: true
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
            const serverVersion = existing.syncVersion || 0;
            const clientVersion = note.syncVersion || 0;
            
            if (clientVersion > serverVersion) {
              // Le client a une version plus récente
              const updated = await prisma.fieldNote.update({
                where: { id: note.id },
                data: {
                  ...note,
                  syncVersion: clientVersion + 1,
                  isSynced: true,
                  updatedAt: new Date()
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
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Télécharger un média
  async uploadMedia(req: Request, res: Response) {
    try {
      if (!req.file) {
        throw new Error('Aucun fichier fourni');
      }
      
      const userId = req.user.id;
      const { fieldNoteId, description } = req.body;
      
      // Stocker le fichier (exemple avec Firebase Storage)
      const fileUrl = await this.storeFile(req.file);
      
      // Créer l'enregistrement média
      const media = await prisma.fieldMedia.create({
        data: {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          fieldNoteId,
          userId,
          description
        }
      });
      
      res.status(201).json({
        success: true,
        data: media
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtenir les données géographiques
  async getGeospatialData(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
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
          type: true,
          location: true,
          createdAt: true,
          tags: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      });
      
      // Formater pour Mapbox/Leaflet
      const geojson = {
        type: 'FeatureCollection',
        features: fieldNotes
          .filter(note => note.location && note.location.lat && note.location.lng)
          .map(note => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [note.location.lng, note.location.lat]
            },
            properties: {
              id: note.id,
              title: note.title,
              type: note.type,
              date: note.createdAt.toISOString(),
              tags: note.tags
            }
          }))
      };
      
      res.status(200).json({
        success: true,
        data: geojson
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Méthodes privées
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
