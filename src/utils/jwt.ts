import jwt, { Secret, SignOptions } from 'jsonwebtoken';

type StringValue = `${number}${'d' | 'h' | 'm' | 's'}`;
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'default_secret';

export const generateToken = (payload: object, expiresIn: StringValue = '7d') => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};