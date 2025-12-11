import OpenAI from 'openai';

class DeepSeekService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY manquante dans les variables d\'environnement');
    }

    console.log('✅ Service DeepSeek initialisé');
    
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }

  async chatCompletion(messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>) {
    try {
      console.log('📤 Envoi à DeepSeek:', { 
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
      });

      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      });

      const duration = Date.now() - startTime;
      
      console.log('✅ Réponse DeepSeek reçue:', {
        duration: `${duration}ms`,
        tokens: response.usage?.total_tokens,
        model: response.model
      });

      return {
        success: true,
        data: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
      };
    } catch (error: any) {
      console.error('❌ Erreur DeepSeek:', {
        message: error.message,
        code: error.code,
        status: error.status
      });

      let errorMessage = 'Erreur lors de la communication avec DeepSeek';
      
      if (error.code === 'insufficient_quota') {
        errorMessage = 'Quota API épuisé. Veuillez vérifier votre compte DeepSeek.';
      } else if (error.code === 'invalid_api_key') {
        errorMessage = 'Clé API invalide. Veuillez vérifier votre configuration.';
      } else if (error.code === 'rate_limit_exceeded') {
        errorMessage = 'Limite de requêtes dépassée. Veuillez réessayer plus tard.';
      }

      return {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  async chatCompletionStream(messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>) {
    try {
      const stream = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      });

      return stream;
    } catch (error: any) {
      console.error('Erreur DeepSeek Stream:', error);
      throw error;
    }
  }

  async checkAPIKey() {
    try {
      const response = await this.client.models.list();
      
      return {
        valid: true,
        models: response.data.map(model => model.id),
        provider: 'DeepSeek'
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
        provider: 'DeepSeek'
      };
    }
  }
}

export default new DeepSeekService();
