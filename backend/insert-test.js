const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findFirst();
  const tx = await prisma.transaction.create({
    data: {
      orderId: 'ORDER-ACTIVE-TEST-' + Date.now(),
      subtotal: p.price,
      tax: 0,
      total: p.price,
      customerName: 'Test Active Order',
      orderType: 'DINE_IN',
      paymentMethod: 'CASH',
      Status: 2, // PREPARING
      items: {
        create: [
          { productId: p.id, quantity: 1, priceAtTime: p.price }
        ]
      }
    }
  });
  console.log('Created active tx:', tx);
}
main().catch(console.error).finally(() => prisma.$disconnect());
