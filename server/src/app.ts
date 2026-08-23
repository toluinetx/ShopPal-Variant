import express from 'express';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '@/shared/db/pg.data-source';
import UserRouter from '@/api/users/user.router';
import AuthRouter from '@/api/auth/auth.router';
import OrderRouter from '@/api/orders/order.router';
import CartRouter from '@/api/carts/carts.router';
import ReviewRouter from '@/api/reviews/review.router';
import ProductRouter from '@/api/products/product.router';
import { errorMiddleware } from '@/middlewares/error.middleware';
import corsMiddleware from './middlewares/cors.middleware';
import { mountApiDocs } from './docs';

// Express app setup:
const app = express();
const PORT = 3000;

// Middlewares (before routes):
app.use(
	process.env.NODE_ENV === 'production'
		? cors({ origin: process.env.CLIENT_PROD_URL, credentials: true })
		: corsMiddleware
);
app.use(express.json());
app.use(cookieParser());

// Health & readiness (referenced by container healthcheck + k8s probes):
app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'ok', service: 'server' });
});
app.get('/ready', async (_req, res) => {
	try {
		if (AppDataSource.isInitialized) {
			await AppDataSource.query('SELECT 1');
		}
		res.status(200).json({ status: 'ready' });
	} catch (err: any) {
		res.status(503).json({ status: 'not-ready', error: err?.message });
	}
});

// API docs (OpenAPI spec + Swagger UI):
mountApiDocs(app);

// Routes:
app.use('/user', UserRouter);
app.use('/auth', AuthRouter);
app.use('/order', OrderRouter);
app.use('/cart', CartRouter);
app.use('/review', ReviewRouter);
app.use('/product', ProductRouter);

// Middlewares (after routes):
app.use(errorMiddleware); // Every endpoint & middleware chain avaliable will eventually go to error middleware in case of exception thrown

//  !!!!!!!! npm run start:dev !!!!!!!!
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);

	// Initialize database connection:
	AppDataSource.initialize()
		.then(() => console.log('Database is up and running'))
		.catch((error) => console.log(`error starting database connection -> ${error.message}`));
});
