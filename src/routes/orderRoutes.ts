import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} from '../controllers/orderController';
import {
  createOrderValidation,
  updateOrderStatusValidation,
  validateRequest,
  validateId
} from '../middleware/cartValidation';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Customer routes (authentication required)
router.post('/',
  authenticate,
  createOrderValidation,
  validateRequest,
  createOrder
);

router.get('/my-orders',
  authenticate,
  getUserOrders
);

router.get('/:id',
  authenticate,
  validateId,
  validateRequest,
  getOrderById
);

router.patch('/:id/cancel',
  authenticate,
  validateId,
  validateRequest,
  cancelOrder
);

// Admin routes
router.get('/',
  authenticate,
  authorize('ADMIN'),
  getAllOrders
);

router.patch('/:id/status',
  authenticate,
  authorize('ADMIN'),
  validateId,
  updateOrderStatusValidation,
  validateRequest,
  updateOrderStatus
);

export default router;