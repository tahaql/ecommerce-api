import { AuthUser } from './auth';
import { Request } from 'express';
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}