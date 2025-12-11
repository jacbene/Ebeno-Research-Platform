// frontend/src/services/streamService.ts
export const streamChatWithDeepSeek = async (
    messages: ChatMessage[], 
    onChunk: (chunk: string) => void
  ) => {
    const eventSource = new EventSource(
      `http://localhost:5000/api/deepseek/chat/stream?messages=${encodeURIComponent(JSON.stringify(messages))}`
    );
  
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.content) {
        onChunk(data.content);
      }
    };
  
    eventSource.onerror = () => {
      eventSource.close();
    };
  
    return () => eventSource.close();
  };
