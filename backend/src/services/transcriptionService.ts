import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export class TranscriptionService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadAudioFile(file: Express.Multer.File, userId: string, projectId?: string) {
    try {
      // Générer un nom de fichier unique
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      const filePath = path.join(this.uploadDir, uniqueName);

      // Déplacer le fichier
      await fs.rename(file.path, filePath);

      // Créer l'enregistrement dans la base de données
      const transcription = await prisma.transcription.create({
        data: {
          title: file.originalname,
          fileUrl: filePath,
          fileName: uniqueName,
          mimeType: file.mimetype,
          status: 'PENDING',
          userId,
          projectId,
          fileSize: file.size,
          language: 'fr', // Par défaut
        },
      });

      logger.info('Audio file uploaded', {
        transcriptionId: transcription.id,
        userId,
        fileSize: file.size,
      });

      return transcription;
    } catch (error) {
      logger.error('Error uploading audio file:', error);
      throw new ApiError(500, 'Failed to upload audio file');
    }
  }

  async processTranscription(transcriptionId: string) {
    try {
      // Mettre à jour le statut
      await prisma.transcription.update({
        where: { id: transcriptionId },
        data: { status: 'PROCESSING' },
      });

      logger.info('Starting transcription processing', { transcriptionId });

      // TODO: Intégrer avec DeepSeek ou Dio-to-Txt
      // Pour l'instant, simulation
      await this.simulateProcessing(transcriptionId);

      // Mettre à jour avec le résultat simulé
      const mockText = "Ceci est un texte transcrit simulé. La transcription réelle sera implémentée avec DeepSeek ou votre service Dio-to-Txt.";

      await prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          transcriptText: mockText,
          status: 'COMPLETED',
          processedAt: new Date(),
          duration: 120, // 2 minutes simulées
        },
      });

      logger.info('Transcription completed', { transcriptionId });
      
      return { text: mockText, status: 'COMPLETED' };
    } catch (error) {
      logger.error('Error processing transcription:', error);
      
      await prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  }

  private async simulateProcessing(transcriptionId: string) {
    // Simulation de traitement (5-10 secondes)
    const delay = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async getTranscription(transcriptionId: string) {
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!transcription) {
      throw new ApiError(404, 'Transcription not found');
    }

    return transcription;
  }

  async getUserTranscriptions(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [transcriptions, total] = await Promise.all([
      prisma.transcription.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.transcription.count({
        where: { userId },
      }),
    ]);

    return {
      transcriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteTranscription(transcriptionId: string, userId: string) {
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
    });

    if (!transcription) {
      throw new ApiError(404, 'Transcription not found');
    }

    if (transcription.userId !== userId) {
      throw new ApiError(403, 'Not authorized to delete this transcription');
    }

    // Supprimer le fichier physique
    try {
      await fs.unlink(transcription.fileUrl);
    } catch (error) {
      logger.warn('Could not delete file, continuing with DB deletion', { error });
    }

    // Supprimer de la base de données
    await prisma.transcription.delete({
      where: { id: transcriptionId },
    });

    logger.info('Transcription deleted', { transcriptionId, userId });
  }
}

export const transcriptionService = new TranscriptionService();
