import { Response } from 'express';
import { ApiResponse } from '../types/api';

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  error?: string
) => {
  const response: ApiResponse<T> = {
    success,
    message,
    ...(data && { data }),
    ...(error && { error })
  };
  
  return res.status(statusCode).json(response);
};

export const sendSuccess = <T>(res: Response, message: string, data?: T, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (res: Response, message: string, statusCode = 400, error?: string) => {
  return sendResponse(res, statusCode, false, message, undefined, error);
};