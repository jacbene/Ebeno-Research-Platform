// types/index.ts
export interface User {
    id: string;
    email: string;
    role: 'RESEARCHER' | 'ADMIN';
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    profile?: Profile;
  }
  
  export interface Profile {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    discipline: string;
    affiliation?: string;
    bio?: string;
    researchInterests: string[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface LoginData {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    discipline: string;
    affiliation?: string;
    researchInterests?: string[];
  }
