import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types/api';
import { AddToCartRequest, UpdateCartItemRequest } from '../types/cart';

const prisma = new PrismaClient();

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { productId, quantity }: AddToCartRequest = req.body;

    // Validate input
    if (!productId || !quantity || quantity <= 0) {
      return sendError(res, 'Product ID and valid quantity are required', 400);
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { 
        id: productId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true
      }
    });

    if (!product) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    // Check if requested quantity is available
    if (quantity > product.stock) {
      return sendError(res, `Only ${product.stock} items available in stock`, 400);
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingCartItem) {
      // Update existing item
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return sendError(res, `Cannot add ${quantity} more. Only ${product.stock - existingCartItem.quantity} more available`, 400);
      }

      const updatedCartItem = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId
          }
        },
        data: {
          quantity: newQuantity
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      const subtotal = updatedCartItem.quantity * Number(updatedCartItem.product.price);

      return sendSuccess(res, 'Cart item updated successfully', {
        item: {
          ...updatedCartItem,
          subtotal
        }
      });
    } else {
      // Create new cart item
      const cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      const subtotal = cartItem.quantity * Number(cartItem.product.price);

      return sendSuccess(res, 'Item added to cart successfully', {
        item: {
          ...cartItem,
          subtotal
        }
      }, 201);
    }

  } catch (error) {
    console.error('Add to cart error:', error);
    return sendError(res, 'Failed to add item to cart', 500);
  }
};

// Get user's cart
export const getCart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const items = cartItems.map(item => ({
      ...item,
      subtotal: item.quantity * Number(item.product.price)
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = items.length;

    return sendSuccess(res, 'Cart retrieved successfully', {
      cart: {
        items,
        totalItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        itemCount
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    return sendError(res, 'Failed to retrieve cart', 500);
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { id } = req.params;
    const { quantity }: UpdateCartItemRequest = req.body;

    // Validate input
    if (!quantity || quantity <= 0) {
      return sendError(res, 'Valid quantity is required', 400);
    }

    // Check if cart item exists and belongs to user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            stock: true,
            price: true,
            name: true
          }
        }
      }
    });

    if (!cartItem || cartItem.userId !== userId) {
      return sendError(res, 'Cart item not found', 404);
    }

    // Check stock availability
    if (quantity > cartItem.product.stock) {
      return sendError(res, `Only ${cartItem.product.stock} items available in stock`, 400);
    }

    const updatedCartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const subtotal = updatedCartItem.quantity * Number(updatedCartItem.product.price);

    return sendSuccess(res, 'Cart item updated successfully', {
      item: {
        ...updatedCartItem,
        subtotal
      }
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    return sendError(res, 'Failed to update cart item', 500);
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { id } = req.params;

    // Check if cart item exists and belongs to user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (!cartItem || cartItem.userId !== userId) {
      return sendError(res, 'Cart item not found', 404);
    }

    await prisma.cartItem.delete({
      where: { id }
    });

    return sendSuccess(res, `${cartItem.product.name} removed from cart successfully`);

  } catch (error) {
    console.error('Remove from cart error:', error);
    return sendError(res, 'Failed to remove item from cart', 500);
  }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    // Get count of items before deletion
    const itemCount = await prisma.cartItem.count({
      where: { userId }
    });

    if (itemCount === 0) {
      return sendError(res, 'Cart is already empty', 400);
    }

    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    return sendSuccess(res, `Cart cleared successfully. ${itemCount} items removed.`);

  } catch (error) {
    console.error('Clear cart error:', error);
    return sendError(res, 'Failed to clear cart', 500);
  }
};

// Get cart count (for UI badges)
export const getCartCount = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const totalItems = await prisma.cartItem.aggregate({
      where: { userId },
      _sum: {
        quantity: true
      }
    });

    const itemCount = await prisma.cartItem.count({
      where: { userId }
    });

    return sendSuccess(res, 'Cart count retrieved successfully', {
      totalItems: totalItems._sum.quantity || 0,
      itemCount
    });

  } catch (error) {
    console.error('Get cart count error:', error);
    return sendError(res, 'Failed to get cart count', 500);
  }
};