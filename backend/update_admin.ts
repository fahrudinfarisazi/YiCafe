import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'fahrudinfarisazi@gmail.com';
  
  await prisma.user.update({
    where: { email },
    data: { name: 'FARIS' }
  });
  console.log(`Updated user ${email} name to FARIS.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
