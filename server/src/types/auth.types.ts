import { ObjectId } from 'mongodb';

export interface IUser {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
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
  _id: ObjectId;
}
