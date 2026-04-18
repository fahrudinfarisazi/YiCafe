import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("⚠️ Cara pakai: npx ts-node set_password.ts <email_karyawan> <password_baru>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error(`❌ User dengan email "${email}" tidak ditemukan di database.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log(`✅ Berhasil! Password untuk akun ${email} telah disetel.`);
  console.log(`Karyawan tersebut sekarang bisa login lewat Pintu Internal menggunakan email dan password barunya.`);
}

main()
  .catch(e => {
    console.error("Terjadi error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
