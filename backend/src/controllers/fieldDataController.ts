// backend/controllers/fieldDataController.ts
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  createFieldNoteSchema,
  updateFieldNoteSchema,
  syncFieldDataSchema
} from '../validators/fieldData.validator';

export class FieldDataController {
  async createFieldNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { title, content, projectId } = createFieldNoteSchema.parse(req.body);

      const fieldNote = await prisma.fieldNote.create({
        data: {
          title,
          content,
          projectId,
          userId: userId,
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

  async getProjectFieldNotes(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { startDate, endDate, page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: Prisma.FieldNoteWhereInput = {
        projectId,
        userId
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const total = await prisma.fieldNote.count({ where });
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
      res.status(400).json({ success: false, error: error.message });
    }
  }

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
        return res.status(404).json({ success: false, error: 'Field note not found or access denied' });
      }

      res.status(200).json({ success: true, data: fieldNote });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateFieldNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const data = updateFieldNoteSchema.parse(req.body);

      const existingNote = await prisma.fieldNote.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingNote) {
        return res.status(404).json({ success: false, error: 'Field note not found or access denied' });
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

      res.status(200).json({ success: true, data: fieldNote });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteFieldNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;

      const existingNote = await prisma.fieldNote.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingNote) {
        return res.status(404).json({ success: false, error: 'Field note not found or access denied' });
      }

      await prisma.fieldMedia.deleteMany({ where: { fieldNoteId: id } });
      await prisma.fieldNote.delete({ where: { id } });

      res.status(200).json({ success: true, message: 'Field note deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async syncFieldData(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const { fieldNotes, lastSync } = syncFieldDataSchema.parse(req.body);

      const serverChanges = await prisma.fieldNote.findMany({
        where: {
          userId,
          updatedAt: { gt: new Date(lastSync) }
        }
      });

      const processedNotes = [];
      for (const note of fieldNotes) {
        const { id, ...noteData } = note;
        if (id && id.startsWith('local-')) {
          const created = await prisma.fieldNote.create({
            data: {
              ...(noteData as any),
              userId
            }
          });
          processedNotes.push(created);
        } else if (id) {
          const existing = await prisma.fieldNote.findUnique({ where: { id } });
          if (existing && new Date(note.updatedAt) > existing.updatedAt) {
            const updated = await prisma.fieldNote.update({
              where: { id: note.id },
              data: noteData
            });
            processedNotes.push(updated);
          } else if (existing) {
            processedNotes.push(existing);
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
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async uploadMedia(req: Request, res: Response) {
    try {
      if (!req.file || !req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { fieldNoteId } = req.body;
      const fileUrl = await this.storeFile(req.file);

      const media = await prisma.fieldMedia.create({
        data: {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          fieldNote: { connect: { id: fieldNoteId } }
        }
      });

      res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

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
          location: {
            not: Prisma.JsonNull
          }
        },
        select: {
          id: true,
          title: true,
          location: true,
          createdAt: true
        }
      });

      const geojson = {
        type: 'FeatureCollection',
        features: fieldNotes
          .filter((note: any) => note.location && (note.location as any).lat && (note.location as any).lng)
          .map((note: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [(note.location as any).lng, (note.location as any).lat]
            },
            properties: {
              id: note.id,
              title: note.title,
              date: note.createdAt.toISOString(),
            }
          }))
      };

      res.status(200).json({ success: true, data: geojson });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async storeFile(file: Express.Multer.File): Promise<string> {
    return `https://example.com/uploads/${Date.now()}-${file.originalname}`;
  }
}

export default new FieldDataController();
