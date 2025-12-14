export interface Code {
    id: string;
    name: string;
    description?: string;
    color: string;
    projectId: string;
    parentId?: string;
    parent?: {
      id: string;
      name: string;
      color: string;
    };
    children?: Code[];
    _count?: {
      annotations: number;
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Annotation {
    id: string;
    codeId: string;
    code: {
      id: string;
      name: string;
      color: string;
      description?: string;
    };
    documentId?: string;
    transcriptId?: string;
    startIndex: number;
    endIndex: number;
    selectedText: string;
    notes?: string;
    userId: string;
    user: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateCodeInput {
    name: string;
    description?: string;
    color?: string;
    parentId?: string;
  }
  
  export interface CreateAnnotationInput {
    codeId: string;
    documentId?: string;
    transcriptId?: string;
    startIndex: number;
    endIndex: number;
    selectedText: string;
    notes?: string;
  }
  
  export interface CodingStatistics {
    totalCodes: number;
    totalAnnotations: number;
    topCodes: Array<{
      id: string;
      name: string;
      color: string;
      _count: {
        annotations: number;
      };
    }>;
    topUsers: Array<{
      userId: string;
      name: string;
      count: number;
    }>;
  }
