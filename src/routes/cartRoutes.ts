import { Router } from 'express';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} from '../controllers/cartController';
import { authenticate } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Validation for cart item ID
const validateCartItemId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid cart item ID is required')
];

// Validation for adding to cart
const addToCartValidation = [
  body('productId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Product ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

// Validation for updating cart item
const updateCartValidation = [
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

// Get user's cart
router.get('/', getCart);

// Get cart count (for UI badges)
router.get('/count', getCartCount);

// Add item to cart
router.post('/',
  addToCartValidation,
  validateRequest,
  addToCart
);

// Update cart item quantity
router.put('/:id',
  validateCartItemId,
  updateCartValidation,
  validateRequest,
  updateCartItem
);

// Remove item from cart
router.delete('/:id',
  validateCartItemId,
  validateRequest,
  removeFromCart
);

// Clear entire cart
router.delete('/',
  clearCart
);

export default router;