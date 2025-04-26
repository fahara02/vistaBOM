// Data types for DB models
//src/lib/server/db/types.ts
export interface User {
  id: string;
  age: number | null;
  username: string | null;
  email: string;
  fullName: string | null;
  passwordHash: string | null;
  googleId: string | null;
  avatarUrl: string | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface Project {
  id: string;
  projectName: string;
  createdAt: Date;
  userId: string;
}
