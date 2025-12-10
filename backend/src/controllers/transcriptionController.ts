import { Request, Response } from 'express';
import { transcriptionService } from '../services/transcriptionService';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export class TranscriptionController {
  async uploadTranscription(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 400, 'No file uploaded');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return ApiResponse.error(res, 401, 'Authentication required');
      }

      const { projectId } = req.body;
      const transcription = await transcriptionService.uploadAudioFile(req.file, userId, projectId);

      // Démarrer le traitement en arrière-plan
      transcriptionService.processTranscription(transcription.id)
        .catch(error => {
          logger.error('Background transcription failed:', error);
        });

      return ApiResponse.created(res, {
        transcriptionId: transcription.id,
        message: 'Transcription started successfully',
        status: 'PENDING',
      });
    } catch (error) {
      logger.error('Upload transcription error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.statusCode, error.message);
      }
      
      return ApiResponse.error(res, 500, 'Internal server error');
    }
  }

  async getTranscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const transcription = await transcriptionService.getTranscription(id);

      // Vérifier les permissions
      if (transcription.userId !== userId) {
        return ApiResponse.error(res, 403, 'Not authorized to view this transcription');
      }

      return ApiResponse.success(res, transcription);
    } catch (error) {
      logger.error('Get transcription error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.statusCode, error.message);
      }
      
      return ApiResponse.error(res, 500, 'Internal server error');
    }
  }

  async getUserTranscriptions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return ApiResponse.error(res, 401, 'Authentication required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await transcriptionService.getUserTranscriptions(userId, page, limit);

      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Get user transcriptions error:', error);
      return ApiResponse.error(res, 500, 'Internal server error');
    }
  }

  async deleteTranscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      await transcriptionService.deleteTranscription(id, userId);

      return ApiResponse.success(res, null, 'Transcription deleted successfully');
    } catch (error) {
      logger.error('Delete transcription error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.statusCode, error.message);
      }
      
      return ApiResponse.error(res, 500, 'Internal server error');
    }
  }

  async getTranscriptionProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const transcription = await transcriptionService.getTranscription(id);

      if (transcription.userId !== userId) {
        return ApiResponse.error(res, 403, 'Not authorized');
      }

      return ApiResponse.success(res, {
        id: transcription.id,
        status: transcription.status,
        progress: transcription.status === 'PROCESSING' ? 50 : 
                 transcription.status === 'COMPLETED' ? 100 : 0,
        errorMessage: transcription.errorMessage,
      });
    } catch (error) {
      logger.error('Get transcription progress error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.statusCode, error.message);
      }
      
      return ApiResponse.error(res, 500, 'Internal server error');
    }
  }
}

export const transcriptionController = new TranscriptionController();
