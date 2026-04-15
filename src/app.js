import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import logsRoutes from './modules/logs/logs.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigin.length === 0 || env.corsOrigin.includes(origin)) return callback(null, true);
    return callback(new Error('CORS engellendi.'));
  }
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true, message: 'MGULER STOCK API alive' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/products', requireAuth, productsRoutes);
app.use('/api/warehouses', requireAuth, warehousesRoutes);
app.use('/api/stock', requireAuth, stockRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/logs', requireAuth, logsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
