import { Router, Request, Response } from 'express';
import deepseekService from '../services/deepseekService';

// Define a type for the chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class DeepSeekController {
  async chat(req: Request, res: Response) {
    try {
      const { messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 2000 } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Le champ "messages" est requis et doit être un tableau non vide',
        });
      }

      // Validation des messages
      for (const msg of messages) {
        if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
          return res.status(400).json({
            success: false,
            error: 'Chaque message doit avoir un rôle valide (user, assistant, system)',
          });
        }
        if (!msg.content || typeof msg.content !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Chaque message doit avoir un contenu de type string',
          });
        }
      }

      const result = await deepseekService.chatCompletion(messages as ChatMessage[]);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          details: result.details
        });
      }

      res.json({
        success: true,
        message: result.data,
        usage: result.usage,
        model: result.model,
      });
    } catch (error: any) {
      console.error('Chat controller error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erreur lors du traitement de la requête',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async streamChat(req: Request, res: Response) {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Messages invalides' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await deepseekService.chatCompletionStream(messages as ChatMessage[]);
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur de streaming' });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Erreur de streaming' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  }

  async checkHealth(req: Request, res: Response) {
    try {
      const result = await deepseekService.checkAPIKey();
      
      res.json({
        success: result.valid,
        provider: 'DeepSeek',
        status: result.valid ? 'connecté' : 'déconnecté',
        models: result.models,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        provider: 'DeepSeek'
      });
    }
  }

  async analyzeResearch(req: Request, res: Response) {
    try {
      const { researchText, analysisType = 'summary' } = req.body;

      if (!researchText) {
        return res.status(400).json({
          success: false,
          error: 'Le texte de recherche est requis',
        });
      }

      const systemPrompt = `Tu es un expert en analyse de recherche scientifique. 
      Analyse le texte suivant de manière approfondie et fournis une réponse structurée.`;

      const userPrompt = `Texte de recherche à analyser:
      ${researchText}

      Type d'analyse demandé: ${analysisType}
      
      Fournis une analyse complète et détaillée.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const result = await deepseekService.chatCompletion(messages);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        analysis: result.data,
        type: analysisType,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Analyze error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'analyse',
      });
    }
  }
}

const router = Router();
const deepSeekController = new DeepSeekController();

router.post('/chat', deepSeekController.chat);
router.post('/chat-stream', deepSeekController.streamChat);
router.get('/health', deepSeekController.checkHealth);
router.post('/analyze', deepSeekController.analyzeResearch);

export default router;
