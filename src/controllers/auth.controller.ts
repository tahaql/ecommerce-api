import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already in use.' });

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName }
  });

  const token = generateToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = generateToken({ id: user.id, role: user.role });
  res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
};