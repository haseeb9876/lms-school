const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding complete institutional classes (PG to Class 10)...");

  const classNames = ["PG", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  const sections = ["A", "B", "C"];

  for (const className of classNames) {
    for (const section of sections) {
      await prisma.class.upsert({
        where: { name_section: { name: className, section } },
        update: {},
        create: { name: className, section },
      });
    }
  }

  // Create Default Principal
  await prisma.user.upsert({
    where: { cnic: '1111111111111' },
    update: {},
    create: {
      cnic: '1111111111111',
      name: 'Principal Office',
      password: 'password123',
      role: 'PRINCIPAL',
      phone: '03001234567',
    },
  });

  console.log("Database seeded successfully with all classes & default principal!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
