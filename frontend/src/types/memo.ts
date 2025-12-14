export interface Memo {
    id: string;
    title: string;
    content: string;
    projectId: string;
    project?: {
      id: string;
      title: string;
    };
    codeId?: string;
    code?: {
      id: string;
      name: string;
      color: string;
      description?: string;
    };
    documentId?: string;
    document?: {
      id: string;
      title: string;
      type: string;
    };
    transcriptId?: string;
    transcript?: {
      id: string;
      content: string;
    };
    annotationId?: string;
    annotation?: {
      id: string;
      selectedText: string;
      code?: {
        name: string;
        color: string;
      };
    };
    userId: string;
    user: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
        discipline?: string;
        affiliation?: string;
      };
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateMemoInput {
    title: string;
    content: string;
    projectId: string;
    codeId?: string;
    documentId?: string;
    transcriptId?: string;
    annotationId?: string;
  }
  
  export interface UpdateMemoInput {
    title?: string;
    content?: string;
    codeId?: string;
    documentId?: string;
    transcriptId?: string;
    annotationId?: string;
  }
  
  export interface MemoStatistics {
    totalMemos: number;
    memosByUser: Array<{
      userId: string;
      name: string;
      count: number;
    }>;
    memosByType: {
      linkedToCode: number;
      linkedToDocument: number;
      linkedToTranscript: number;
      linkedToAnnotation: number;
      standalone: number;
    };
    recentMemos: Memo[];
  }
  
  export interface MemoFilter {
    projectId?: string;
    codeId?: string;
    documentId?: string;
    transcriptId?: string;
    annotationId?: string;
    userId?: string;
    search?: string;
  }
