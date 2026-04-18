import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const whereClause = req.user?.role === 'CASHIER' ? { cashierId: req.user.id } : {};

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, cashier: { select: { name: true } } }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Transaction logic helper
const calculateOrder = async (items: any[]) => {
  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.active) throw new Error(`Product ${item.productId} invalid or inactive`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

    subtotal += product.price * item.quantity;
    processedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      priceAtTime: product.price
    });
  }

  const ppnSetting = await prisma.setting.findUnique({ where: { key: 'PPN' } });
  const ppnRate = ppnSetting ? Number(ppnSetting.value) / 100 : 0.11;
  const tax = subtotal * ppnRate;
  const total = subtotal + tax;

  return { subtotal, tax, total, processedItems };
};

// Cashier creates an order (Cash or QRIS)
router.post('/cashier', authenticate, async (req: AuthRequest, res) => {
  try {
    const cashierId = req.user?.id;
    if (!cashierId) return res.status(401).json({ error: 'Unauthorized' });

    const { items, orderType = 'DINE_IN', paymentMethod = 'CASH', customerName } = req.body; 
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items cannot be empty' });
    }

    const { subtotal, tax, total, processedItems } = await calculateOrder(items);
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `ORD-${shortId}`;

    const transaction = await prisma.$transaction(async (tx: any) => {
      // Create transaction
      const newTx = await tx.transaction.create({
        data: {
          orderId, subtotal, tax, total, cashierId, customerName, orderType, paymentMethod,
          Status: paymentMethod === 'CASH' ? 1 : 0, // Using int for PAID/PENDING temporarily, assuming Status is Int 1=PAID, 0=PENDING etc. Or keeping string if you switch schema back. Wait, schema says Int?. I will map PAID=1, PENDING=0.
          items: { create: processedItems }
        },
        include: { items: true }
      });

      // If Paid with Cash immediately deduct stock
      if (paymentMethod === 'CASH') {
        for (const item of processedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }

      return newTx;
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(400).json({ error: error.message || 'Failed to create transaction' });
  }
});

// Customer creates self-order (QRIS strictly)
router.post('/customer', authenticate, async (req: AuthRequest, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const { items, orderType = 'DINE_IN', customerName } = req.body; 

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items cannot be empty' });
    }

    // Must be QRIS
    const paymentMethod = 'QRIS';

    const { subtotal, tax, total, processedItems } = await calculateOrder(items);
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `SLF-${shortId}`;

    const transaction = await prisma.transaction.create({
      data: {
        orderId, subtotal, tax, total, customerName, orderType, paymentMethod,
        customerId,
        Status: 0, // 0 for PENDING
        items: { create: processedItems }
      },
      include: { items: true }
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create self-order' });
  }
});

// Get logged-in customer's orders
router.get('/customer/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const transactions = await prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } }
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Fetch customer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch customer orders' });
  }
});

router.get('/track/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const transaction = await prisma.transaction.findUnique({
       where: { id },
       include: { items: { include: { product: true } } }
    });

    if (!transaction) return res.status(404).json({ error: 'Order not found' });
    
    res.json({
       id: transaction.id,
       orderId: transaction.orderId,
       Status: transaction.Status,
       total: transaction.total,
       paymentMethod: transaction.paymentMethod,
       items: transaction.items,
       customerName: transaction.customerName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Cashier/Admin updates transaction status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    
    let numericStatus = 0;
    if (typeof status === 'number') {
      numericStatus = status;
    } else if (typeof status === 'string') {
      switch (status) {
        case 'PENDING': numericStatus = 0; break;
        case 'PAID': numericStatus = 1; break;
        case 'PREPARING': numericStatus = 2; break;
        case 'READY': numericStatus = 3; break;
        case 'COMPLETED': numericStatus = 4; break;
        case 'FAILED': numericStatus = 5; break;
        case 'EXPIRED': numericStatus = 6; break;
        case 'CANCELLED': numericStatus = 7; break;
        default: return res.status(400).json({ error: 'Invalid status string' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid status format' });
    }

    const validStatuses = [0, 1, 2, 3, 4, 5, 6, 7];
    if (!validStatuses.includes(numericStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { Status: numericStatus }
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Cancel transaction
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const transaction = await prisma.transaction.findUnique({ where: { id }, include: { items: true } });
    if (!transaction) return res.status(404).json({ error: 'Order not found' });
    
    // Check if already cancelled or completed
    if (transaction.Status === 4 || transaction.Status === 5 || transaction.Status === 6 || transaction.Status === 7) {
      return res.status(400).json({ error: `Cannot cancel an order with status ${transaction.Status}` });
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark as cancelled (7)
      await tx.transaction.update({ where: { id }, data: { Status: 7 } });
      
      // 2. Return stock IF paymentMethod was CASH 
      if (transaction.paymentMethod === 'CASH') {
        for (const item of transaction.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }
    });

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Mark as printed
router.patch('/:id/print', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { isPrinted: true }
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update print status' });
  }
});

export default router;
