import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';
import {
  createCategoryValidation,
  validateRequest,
  validateId
} from '../middleware/productValidation';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', validateId, validateRequest, getCategoryById);

// Admin only routes
router.post('/',
  authenticate,
  authorize('ADMIN'),
  createCategoryValidation,
  validateRequest,
  createCategory
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  validateId,
  validateRequest,
  updateCategory
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  validateId,
  validateRequest,
  deleteCategory
);

export default router;