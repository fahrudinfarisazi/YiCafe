import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'fahrudinfarisazi@gmail.com';
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  if (existingUser) {
    if (existingUser.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      });
      console.log(`Updated existing user ${email} to ADMIN.`);
    } else {
      console.log(`User ${email} is already an ADMIN.`);
    }
  } else {
    await prisma.user.create({
      data: {
        email: email,
        name: 'Manager',
        role: 'ADMIN',
        password: '',
      }
    });
    console.log(`Created new Super Admin ${email}.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
