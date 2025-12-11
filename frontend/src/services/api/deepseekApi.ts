import { ChatMessage, DeepSeekResponse, ChatConfig } from '../../types/deepseek';

const API_BASE_URL = 'http://localhost:5000/api';

export const deepseekApi = {
  async chat(
    messages: ChatMessage[], 
    config: ChatConfig = {}
  ): Promise<DeepSeekResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/deepseek/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          ...config
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onError?: (error: string) => void,
    onComplete?: () => void
  ) {
    try {
      const response = await fetch(`${API_BASE_URL}/deepseek/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            
            if (data === '[DONE]') {
              onComplete?.();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  },

  async analyzeResearch(text: string, analysisType: string = 'summary') {
    try {
      const response = await fetch(`${API_BASE_URL}/deepseek/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
        },
        body: JSON.stringify({
          researchText: text,
          analysisType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/deepseek/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { success: false, error: 'Connection failed' };
    }
  }
};
