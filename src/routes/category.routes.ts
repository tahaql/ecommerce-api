import { Router } from 'express';
import { createCategory, getCategories } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createCategory);
router.get('/', getCategories);

export default router;