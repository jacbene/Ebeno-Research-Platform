export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }
  
  export interface DeepSeekResponse {
    success: boolean;
    message?: string;
    error?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    model?: string;
  }
  
  export interface ChatConfig {
    model?: 'deepseek-chat' | 'deepseek-coder';
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }
