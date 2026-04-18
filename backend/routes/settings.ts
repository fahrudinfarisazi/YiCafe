import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get setting by key (Public access allowed for PPN when getting menu config)
router.get('/:key', async (req, res) => {
  try {
    const key = req.params.key as string;
    const setting = await prisma.setting.findUnique({
      where: { key }
    });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update or create setting (Admin only)
router.put('/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    
    if (value === undefined) {
       return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
