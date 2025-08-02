import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateOrderRequest, OrderQuery } from '../types/order';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types/api';
import { generateOrderNumber, validateStockAvailability } from '../utils/orderUtils';

const prisma = new PrismaClient();

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { shippingAddressId, shippingAddress, paymentMethod, notes } = req.body;

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId! },
      include: {
        product: true
      }
    });

    if (cartItems.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    // Validate stock availability
    const stockValidation = await validateStockAvailability(
      prisma,
      cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    );

    if (!stockValidation.valid) {
      return sendError(res, stockValidation.message!, 400);
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => {
      return total + (item.quantity * item.product.price.toNumber());
    }, 0);

    // Handle shipping address
    let addressId = shippingAddressId;
    if (!addressId && shippingAddress) {
      // Create new address
      const newAddress = await prisma.address.create({
        data: {
          userId: userId!,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
          isDefault: false
        }
      });
      addressId = newAddress.id;
    }

    // Create order using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId: userId!,
          orderNumber: generateOrderNumber(),
          status: 'PENDING',
          totalAmount: totalAmount
        }
      });

      // Create order items and update stock
      for (const cartItem of cartItems) {
        // Create order item
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.product.price
          }
        });

        // Update product stock
        await tx.product.update({
          where: { id: cartItem.productId },
          data: {
            stock: {
              decrement: cartItem.quantity
            }
          }
        });
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          method: paymentMethod,
          status: 'PENDING'
        }
      });

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: userId! }
      });

      return { order, payment };
    });

    // Fetch complete order data
    const completeOrder = await prisma.order.findUnique({
      where: { id: result.order.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
        payments: true
      }
    });

    sendSuccess(res, 'Order created successfully', { order: completeOrder }, 201);

  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Failed to create order', 500);
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status
    } = req.query;

    const rawSortBy = req.query.sortBy;
    const rawSortOrder = req.query.sortOrder;

    const sortBy = typeof rawSortBy === 'string' ? rawSortBy : 'createdAt';
    const sortOrder = rawSortOrder === 'asc' ? 'asc' : 'desc';

    const validSortFields = ['createdAt', 'updatedAt', 'status'] as const;
    type SortField = typeof validSortFields[number];
    type SortOrder = 'asc' | 'desc';

    const sortField = (validSortFields.includes(sortBy as SortField) ? sortBy : 'createdAt') as SortField;
    const sortDirection = (sortOrder === 'asc' ? 'asc' : 'desc') as SortOrder;

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user?.id! };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true,
              transactionId: true,
              createdAt: true
            }
          }
        },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum
      }),
      prisma.order.count({ where })
    ]);

    const formattedOrders = orders.map(order => ({
      ...order,
      totalAmount: order.totalAmount.toNumber(),
      orderItems: order.orderItems.map(item => ({
        ...item,
        price: item.price.toNumber(),
        subtotal: item.quantity * item.price.toNumber()
      })),
      payments: order.payments.map(payment => ({
        ...payment,
        amount: payment.amount.toNumber()
      }))
    }));

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 'Orders retrieved successfully', {
      orders: formattedOrders,
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
    console.error('Get user orders error:', error);
    sendError(res, 'Failed to retrieve orders', 500);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: userId! // Ensure user can only access their own orders
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        payments: true
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const formattedOrder = {
      ...order,
      totalAmount: order.totalAmount.toNumber(),
      orderItems: order.orderItems.map(item => ({
        ...item,
        price: item.price.toNumber(),
        subtotal: item.quantity * item.price.toNumber()
      })),
      payments: order.payments.map(payment => ({
        ...payment,
        amount: payment.amount.toNumber()
      }))
    };

    sendSuccess(res, 'Order retrieved successfully', { order: formattedOrder });

  } catch (error) {
    console.error('Get order error:', error);
    sendError(res, 'Failed to retrieve order', 500);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Find order
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: userId!
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    // Check if order can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return sendError(res, 'Order cannot be cancelled at this stage', 400);
    }

    // Cancel order and restore stock using transaction
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      // Restore product stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
      }

      // Update payment status
      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: 'REFUNDED' }
      });
    });

    sendSuccess(res, 'Order cancelled successfully');

  } catch (error) {
    console.error('Cancel order error:', error);
    sendError(res, 'Failed to cancel order', 500);
  }
};

// Admin functions
export const getAllOrders = async (req: Request<{}, {}, {}, OrderQuery>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const validSortFields = ['createdAt', 'updatedAt', 'status'] as const;
    type SortField = typeof validSortFields[number];
    type SortOrder = 'asc' | 'desc';

    const sortField = (validSortFields.includes(sortBy as SortField) ? sortBy : 'createdAt') as SortField;
    const sortDirection = (sortOrder === 'asc' ? 'asc' : 'desc') as SortOrder;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
          payments: true
        },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum
      }),
      prisma.order.count({ where })
    ]);

    const formattedOrders = orders.map(order => ({
      ...order,
      totalAmount: order.totalAmount.toNumber(),
      orderItems: order.orderItems.map(item => ({
        ...item,
        price: item.price.toNumber(),
        subtotal: item.quantity * item.price.toNumber()
      })),
      payments: order.payments.map(payment => ({
        ...payment,
        amount: payment.amount.toNumber()
      }))
    }));

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 'All orders retrieved successfully', {
      orders: formattedOrders,
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
    console.error('Get all orders error:', error);
    sendError(res, 'Failed to retrieve orders', 500);
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
        payments: true
      }
    });

    sendSuccess(res, 'Order status updated successfully', { order: updatedOrder });

  } catch (error) {
    console.error('Update order status error:', error);
    sendError(res, 'Failed to update order status', 500);
  }
};