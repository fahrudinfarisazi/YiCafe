import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log('Admin user created (admin / admin123)');
    console.log('Seeded User:', admin.email);
  } else {
    console.log('Admin user already exists');
  }

  // Seed default Settings
  const defaultPpn = await prisma.setting.upsert({
    where: { key: 'PPN' },
    update: {},
    create: { key: 'PPN', value: '11' }
  });
  console.log('Seeded Setting:', defaultPpn);

  // Create default categories
  const catNames = ['Coffee', 'Non-Coffee', 'Food', 'Snacks'];
  for (const name of catNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Categories seeded');

  // Create some default products
  const coffeeCat = await prisma.category.findUnique({ where: { name: 'Coffee' }});
  if (coffeeCat) {
    const products = [
      { name: 'Espresso', price: 15000, categoryId: coffeeCat.id, stock: 100 },
      { name: 'Americano', price: 20000, categoryId: coffeeCat.id, stock: 100 },
      { name: 'Cappuccino', price: 25000, categoryId: coffeeCat.id, stock: 100 },
    ];
    for (const p of products) {
      await prisma.product.upsert({
        where: { id: p.name }, // Use a unique way to identify, or just use findFirst like before
        update: { stock: 100 },
        create: p
      }).catch(async (e) => {
         // fallback if upsert fails on id matching
         const existing = await prisma.product.findFirst({ where: { name: p.name } });
         if (existing) {
             await prisma.product.update({ where: { id: existing.id }, data: { stock: 100 }});
         } else {
             await prisma.product.create({ data: p });
         }
      });
    }
    console.log('Products seeded');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
