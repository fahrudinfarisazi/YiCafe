import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to ensure user is an ADMIN
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forsaken! Only admins can perform this action.' });
  }
  next();
};

// GET all employees (ADMIN and CASHIER)
router.get('/employees', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'CASHIER']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        jobTitle: true,
        CreatedDate: true
      },
      orderBy: { CreatedDate: 'desc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST add a new employee
router.post('/employees', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, name, role, jobTitle } = req.body; 

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    
    if (role !== 'ADMIN' && role !== 'CASHIER') {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.role === 'CUSTOMER') {
        // Upgrade them
        const updated = await prisma.user.update({
          where: { email },
          data: { role, name: name || existingUser.name, jobTitle }
        });
        return res.json(updated);
      } else {
        return res.status(400).json({ error: 'Employee with this email already exists' });
      }
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        role,
        jobTitle,
        password: '', // Blank since we intend to use Google Auth primarily for them
      }
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add employee' });
  }
});

// DELETE remove an employee role (downgrade to CUSTOMER or delete)
router.delete('/employees/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Instead of deleting the record (which could break transaction foreign keys), downgrade them to CUSTOMER
    await prisma.user.update({
      where: { id },
      data: { role: 'CUSTOMER' }
    });

    res.json({ message: 'Employee successfully removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove employee' });
  }
});

export default router;
