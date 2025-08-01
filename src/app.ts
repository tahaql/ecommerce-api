import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';


config();

const app: Application = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/uploads', express.static('uploads'));

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'E-commerce API Server',
    version: '1.0.0',
    status: 'active'
  });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

//Auth Rout
app.use('/api/auth', authRoutes);

//Products Rout
app.use('/api/products', productRoutes);

//Categories Rout
app.use('/api/categories', categoryRoutes);


export default app;