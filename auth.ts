import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function authenticateUser(cnic: string) {
  if (!cnic) return null;
  const cleanCnic = cnic.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { cnic: cleanCnic },
        { studentProfile: { fatherCnic: cleanCnic } },
      ],
    },
    include: {
      studentProfile: true,
    },
  });

  return user;
}
