export interface IUser {
  email: string;
  passwordHash: string;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Raw row shape returned by PostgreSQL queries on the `users` table.
 */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  api_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface UserDocument extends IUser {
  id: string;
}
