import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';

type StringValue = `${number}${'d' | 'h' | 'm' | 's'}`;

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'icbwiyvcYHVYI5dRCT767-secret';
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN as StringValue) || '7d';

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};