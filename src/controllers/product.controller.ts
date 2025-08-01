import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, stock, categoryId } = req.body;
  const images = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];

  const product = await prisma.product.create({
    data: { name, description, price: parseFloat(price), stock: parseInt(stock), categoryId, images }
  });

  res.status(201).json(product);
};

export const getAllProducts = async (_: Request, res: Response) => {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  res.json(products);
};