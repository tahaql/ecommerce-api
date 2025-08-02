import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateProductRequest, UpdateProductRequest, ProductQuery } from '../types/products';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types/api';

const prisma = new PrismaClient();

export const createProduct = async (req: Request<{}, {}, CreateProductRequest>, res: Response) => {
  try {
    const { name, description, price, stock, categoryId } = req.body;
    
    // Handle uploaded images
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file: Express.Multer.File) => {
        images.push(`/uploads/products/${file.filename}`);
      });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId, isActive: true }
    });

    if (!category) {
      return sendError(res, 'Category not found or inactive', 404);
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price.toString()),
        stock: parseInt(stock.toString()),
        categoryId,
        images
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      }
    });

    sendSuccess(res, 'Product created successfully', { product }, 201);

  } catch (error) {
    console.error('Create product error:', error);
    sendError(res, 'Failed to create product', 500);
  }
};

export const getProducts = async (req: Request<{}, {}, {}, ProductQuery>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = 'true'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 'Products retrieved successfully', {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    sendError(res, 'Failed to retrieve products', 500);
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      }
    });

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    sendSuccess(res, 'Product retrieved successfully', {
      product: {
        ...product,
        avgRating: Math.round(avgRating * 10) / 10 // Round to 1 decimal place
      }
    });

  } catch (error) {
    console.error('Get product error:', error);
    sendError(res, 'Failed to retrieve product', 500);
  }
};

export const updateProduct = async (req: Request<{ id: string }, {}, UpdateProductRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, categoryId, isActive } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return sendError(res, 'Product not found', 404);
    }

    // Verify category if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId, isActive: true }
      });

      if (!category) {
        return sendError(res, 'Category not found or inactive', 404);
      }
    }

    // Handle new uploaded images
    let newImages: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file: Express.Multer.File) => {
        newImages.push(`/uploads/products/${file.filename}`);
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: parseFloat(price.toString()) }),
        ...(stock !== undefined && { stock: parseInt(stock.toString()) }),
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...(newImages.length > 0 && { images: [...existingProduct.images, ...newImages] }),
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      }
    });

    sendSuccess(res, 'Product updated successfully', { product: updatedProduct });

  } catch (error) {
    console.error('Update product error:', error);
    sendError(res, 'Failed to update product', 500);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true }
        }
      }
    });

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Soft delete if product has been ordered
    if (product._count.orderItems > 0) {
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      sendSuccess(res, 'Product deactivated successfully (has order history)');
    } else {
      // Hard delete if no orders
      await prisma.product.delete({
        where: { id }
      });

      sendSuccess(res, 'Product deleted successfully');
    }

  } catch (error) {
    console.error('Delete product error:', error);
    sendError(res, 'Failed to delete product', 500);
  }
};