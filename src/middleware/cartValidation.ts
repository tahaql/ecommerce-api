import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

// Middleware to check validation results
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return sendError(res, `Validation error: ${firstError.msg}`, 400);
  }
  next();
};

// Validation for adding items to cart
export const addToCartValidation = [
  body('productId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Product ID is required and must be a valid string'),
    
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be an integer between 1 and 100'),
];

// Validation for updating cart items
export const updateCartItemValidation = [
  param('id')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Cart item ID is required'),
    
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be an integer between 1 and 100'),
];

// Validation for cart item ID parameter
export const cartItemIdValidation = [
  param('id')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Cart item ID is required'),
];

// Custom validation to check if quantity doesn't exceed stock
export const validateStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return next();
    }

    // This would typically check against your database
    // For now, we'll let the controller handle stock validation
    next();
    
  } catch (error) {
    return sendError(res, 'Error validating stock', 500);
  }
};