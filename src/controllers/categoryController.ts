import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../types/category';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types/api';

const prisma = new PrismaClient();

export const createCategory = async (req: Request<{}, {}, CreateCategoryRequest>, res: Response) => {
  try {
    const { name, description } = req.body;

    // Check if category already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return sendError(res, 'Category with this name already exists', 409);
    }

    const category = await prisma.category.create({
      data: {
        name,
        description
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    sendSuccess(res, 'Category created successfully', { category }, 201);

  } catch (error) {
    console.error('Create category error:', error);
    sendError(res, 'Failed to create category', 500);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { isActive = 'true' } = req.query;
    
    const categories = await prisma.category.findMany({
      where: {
        ...(isActive !== 'all' && { isActive: isActive === 'true' })
      },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    sendSuccess(res, 'Categories retrieved successfully', { categories });

  } catch (error) {
    console.error('Get categories error:', error);
    sendError(res, 'Failed to retrieve categories', 500);
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    sendSuccess(res, 'Category retrieved successfully', { category });

  } catch (error) {
    console.error('Get category error:', error);
    sendError(res, 'Failed to retrieve category', 500);
  }
};

export const updateCategory = async (req: Request<{ id: string }, {}, UpdateCategoryRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return sendError(res, 'Category not found', 404);
    }

    // Check if name is taken by another category
    if (name && name !== existingCategory.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name }
      });

      if (nameExists) {
        return sendError(res, 'Category name already exists', 409);
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    sendSuccess(res, 'Category updated successfully', { category: updatedCategory });

  } catch (error) {
    console.error('Update category error:', error);
    sendError(res, 'Failed to update category', 500);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists and has products
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    if (category._count.products > 0) {
      return sendError(res, 'Cannot delete category with existing products', 400);
    }

    await prisma.category.delete({
      where: { id }
    });

    sendSuccess(res, 'Category deleted successfully');

  } catch (error) {
    console.error('Delete category error:', error);
    sendError(res, 'Failed to delete category', 500);
  }
};