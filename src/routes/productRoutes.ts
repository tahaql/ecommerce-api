import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/productController';
import {
  createProductValidation,
  updateProductValidation,
  productQueryValidation,
  validateRequest,
  validateId
} from '../middleware/productValidation';
import { authenticate, authorize } from '../middleware/auth';
import { uploadProductImages, handleUploadError } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/',
  productQueryValidation,
  validateRequest,
  getProducts
);

router.get('/:id',
  validateId,
  validateRequest,
  getProductById
);

// Admin only routes
router.post('/',
  authenticate,
  authorize('ADMIN'),
  uploadProductImages.array('images', 5),
  handleUploadError,
  createProductValidation,
  validateRequest,
  createProduct
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  validateId,
  uploadProductImages.array('images', 5),
  handleUploadError,
  updateProductValidation,
  validateRequest,
  updateProduct
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  validateId,
  validateRequest,
  deleteProduct
);

export default router;