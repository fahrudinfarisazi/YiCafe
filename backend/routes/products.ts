import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all products (Public access so customers can view menu)
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter: any = categoryId ? { categoryId: String(categoryId) } : {};
    
    filter.OR = [
      { IsDeleted: null },
      { IsDeleted: 0 }
    ];
    
    const products = await prisma.product.findMany({
      where: filter,
      include: { category: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create product (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, stock, image, categoryId, active } = req.body;
    const product = await prisma.product.create({
      data: { name, price: Number(price), stock: stock ? Number(stock) : 0, image, categoryId, active: active !== undefined ? active : true }
    });
    res.status(201).json(product);
  } catch (error: any) {
    console.error('[Create Product Error]:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message || String(error) });
  }
});

// Update product
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { name, price, stock, image, active, categoryId } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = Number(price);
    if (stock !== undefined) updateData.stock = Number(stock);
    if (image !== undefined) updateData.image = image;
    if (active !== undefined) updateData.active = active;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });
    res.json(product);
  } catch (error: any) {
    console.error('[Update Product Error]:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message || String(error) });
  }
});

// Delete product
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    await prisma.product.update({ 
      where: { id },
      data: { active: false, IsDeleted: 1 }
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('[Delete Product Error]:', error);
    res.status(500).json({ error: 'Failed to delete product', details: error.message || String(error) });
  }
});

export default router;
