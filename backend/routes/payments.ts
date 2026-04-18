import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

// @ts-ignore
import midtransClient from 'midtrans-client';

const router = Router();
const prisma = new PrismaClient();

const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-DUMMY',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-DUMMY'
});

router.post('/qris/:transactionId', async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.transactionId as string;
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { items: { include: { product: true } } }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.Status === 1) return res.status(400).json({ error: 'Already paid' });

    const parameter = {
      payment_type: 'gopay',
      transaction_details: {
        order_id: transaction.orderId,
        gross_amount: Math.round(transaction.total)
      },
      custom_expiry: {
        expiry_duration: 15,
        unit: 'minute'
      }
    };

    const chargeResponse = await coreApi.charge(parameter);
    
    const qrisUrl = chargeResponse.actions?.find((action: any) => action.name === 'generate-qr-code')?.url;

    res.json({
      orderId: transaction.orderId,
      qrisUrl,
      rawResponse: chargeResponse
    });

  } catch (error: any) {
    console.error('Midtrans Error:', error.message);
    res.status(500).json({ error: 'Failed to generate payment QR', details: error.message });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const notification = await coreApi.transaction.notification(req.body);
    
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let numericStatus = 0; // PENDING

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') numericStatus = 0;
      else if (fraudStatus === 'accept') numericStatus = 1; // PAID
    } else if (transactionStatus === 'settlement') {
      numericStatus = 1;
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      numericStatus = 6; // EXPIRED
    } else if (transactionStatus === 'pending') {
      numericStatus = 0;
    }

    const transaction = await prisma.transaction.update({
      where: { orderId },
      data: { Status: numericStatus },
      include: { items: true }
    });

    if (numericStatus === 1) {
      for (const item of transaction.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed', error);
    res.status(500).send('Error');
  } // eslint-disable-line
});

router.get('/status/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: { Status: true, id: true, orderId: true }
    });
    if (!transaction) return res.status(404).json({ error: 'Not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/qris/public/:transactionId', async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.transactionId as string;
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { items: { include: { product: true } } }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.Status === 1) return res.status(400).json({ error: 'Already paid' });

    const parameter = {
      payment_type: 'gopay',
      transaction_details: {
        order_id: transaction.orderId,
        gross_amount: Math.round(transaction.total)
      },
      custom_expiry: {
        expiry_duration: 15,
        unit: 'minute'
      }
    };

    const chargeResponse = await coreApi.charge(parameter);
    const qrisUrl = chargeResponse.actions?.find((action: any) => action.name === 'generate-qr-code')?.url;

    res.json({ orderId: transaction.orderId, qrisUrl });
  } catch (error: any) {
    console.error('Midtrans Error:', error.message);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/status/public/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: { Status: true, id: true, orderId: true }
    });
    if (!transaction) return res.status(404).json({ error: 'Not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
