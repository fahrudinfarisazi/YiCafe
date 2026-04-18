import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import paymentsRouter from './routes/payments';
import usersRouter from './routes/users';
import settingsRoutes from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Auto-cancel PENDING orders older than 30 minutes
setInterval(async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Find orders that are PENDING (0), QRIS, and older than 30 mins
    const expiredOrders = await prisma.transaction.findMany({
      where: {
        Status: 0,
        paymentMethod: 'QRIS',
        createdAt: { lt: thirtyMinutesAgo }
      }
    });

    if (expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        await prisma.transaction.update({
          where: { id: order.id },
          data: { Status: 7 } // CANCELLED
        });
        console.log(`Auto-cancelled expired order: ${order.orderId}`);
      }
    }
  } catch (error) {
    console.error('Error in auto-cancel job:', error);
  }
}, 60 * 1000); // Check every minute
