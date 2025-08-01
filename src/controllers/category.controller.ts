import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createCategory = async (req: Request, res: Response) => {
  const { name, description } = req.body;
  try {
    const category = await prisma.category.create({ data: { name, description } });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: 'Category already exists.' });
  }
};

export const getCategories = async (_: Request, res: Response) => {
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  res.json(categories);
};