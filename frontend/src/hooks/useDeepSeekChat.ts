import { useState, useCallback } from 'react';
import { ChatMessage } from '../types/deepseek';
import { deepseekApi } from '../services/api/deepseekApi';

export const useDeepSeekChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant DeepSeek. Comment puis-je vous aider dans vos recherches aujourd\'hui ?',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user') => {
    const userMessage: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    // Ajouter le message de l'utilisateur
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Appeler l'API
      const response = await deepseekApi.chat([
        {
          role: 'system',
          content: 'Tu es un assistant de recherche scientifique spécialisé. Réponds en français de manière claire et structurée.'
        },
        ...messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content })),
        userMessage
      ]);

      if (response.success && response.message) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'Bonjour ! Je suis votre assistant DeepSeek. Comment puis-je vous aider dans vos recherches aujourd\'hui ?',
        timestamp: new Date(),
      }
    ]);
    setError(null);
  }, []);

  const sendStreamMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Créer un message d'assistant vide pour le streaming
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Préparer les messages pour l'API
    const apiMessages = [
      {
        role: 'system' as const,
        content: 'Tu es un assistant de recherche scientifique spécialisé. Réponds en français de manière claire et structurée.'
      },
      ...messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content })),
      userMessage
    ];

    let accumulatedContent = '';

    await deepseekApi.chatStream(
      apiMessages,
      (chunk) => {
        accumulatedContent += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = accumulatedContent;
          }
          return newMessages;
        });
      },
      (streamError) => {
        setError(streamError);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendStreamMessage,
    clearChat,
  };
};
