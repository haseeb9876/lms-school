const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding complete institutional classes & default users into Neon...");

  const classNames = ["PG", "Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  const sections = ["A", "B"];

  for (const className of classNames) {
    for (const section of sections) {
      const existingClass = await prisma.class.findFirst({
        where: { name: className, section },
      });

      if (!existingClass) {
        await prisma.class.create({
          data: { name: className, section },
        });
      }
    }
  }

  // Seed Principal User
  await prisma.user.upsert({
    where: { cnic: "61101-1111111-1" },
    update: {},
    create: {
      cnic: "61101-1111111-1",
      name: "Dr. Aslam Khan (Principal)",
      role: "PRINCIPAL",
      phone: "+92 300 1234567",
    },
  });

  // Seed Teacher User
  await prisma.user.upsert({
    where: { cnic: "61101-2222222-2" },
    update: {},
    create: {
      cnic: "61101-2222222-2",
      name: "Prof. Sarah Ahmed",
      role: "TEACHER",
      phone: "+92 300 7654321",
    },
  });

  // Seed Student User with StudentProfile
  const studentUser = await prisma.user.upsert({
    where: { cnic: "61101-3333333-3" },
    update: {},
    create: {
      cnic: "61101-3333333-3",
      name: "Ali Haseeb",
      role: "STUDENT",
      phone: "+92 312 9876543",
    },
  });

  const firstClass = await prisma.class.findFirst();

  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      fatherCnic: "61101-3333333-3",
      classId: firstClass ? firstClass.id : null,
    },
  });

  // Seed Fee Invoice for Demo
  await prisma.feeInvoice.create({
    data: {
      studentId: studentProfile.id,
      title: "Monthly Tuition Fee - August 2026",
      amount: 15000,
      status: "PENDING",
      dueDate: new Date("2026-08-31"),
    },
  });

  console.log("Database seeded successfully with all classes & default users!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
