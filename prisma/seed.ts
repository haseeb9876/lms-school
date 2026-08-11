import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: 'greenhill' },
    update: {},
    create: {
      name: 'Greenhill School',
      slug: 'greenhill',
      country: 'Pakistan',
      language: 'en'
    }
  });

  const principal = await prisma.user.upsert({
    where: { email: 'principal@greenhill.edu.pk' },
    update: {},
    create: {
      name: 'Principal Ahmed',
      email: 'principal@greenhill.edu.pk',
      passwordHash: 'admin123',
      role: 'PRINCIPAL',
      schoolId: school.id
    }
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@greenhill.edu.pk' },
    update: {},
    create: {
      name: 'Ms. Sara',
      email: 'teacher@greenhill.edu.pk',
      passwordHash: 'teacher123',
      role: 'TEACHER',
      schoolId: school.id
    }
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@greenhill.edu.pk' },
    update: {},
    create: {
      name: 'Ali Khan',
      email: 'student@greenhill.edu.pk',
      passwordHash: 'student123',
      role: 'STUDENT',
      schoolId: school.id
    }
  });

  const parent = await prisma.user.upsert({
    where: { email: 'parent@greenhill.edu.pk' },
    update: {},
    create: {
      name: 'Mr. Khan',
      email: 'parent@greenhill.edu.pk',
      passwordHash: 'parent123',
      role: 'PARENT',
      schoolId: school.id
    }
  });

  console.log({ principal, teacher, student, parent, school });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
