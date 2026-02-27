import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'ani'
      }
    }
  });

  console.log("Found users:", users.map(u => u.email));

  if (users.length > 0) {
    const targetUserId = users[0].id;
    const newPassword = 'password123';
    const hash = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: hash }
    });

    console.log(`Password for user ${users[0].email} has been reset to: ${newPassword}`);
  } else {
    console.log("No user found containing 'ani'");
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
