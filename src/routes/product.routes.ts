import { Router } from 'express';
import multer from 'multer';
import { createProduct, getAllProducts } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', authenticate, upload.array('images', 5), createProduct);
router.get('/', getAllProducts);

export default router;