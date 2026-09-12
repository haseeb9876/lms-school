-- CreateEnum
CREATE TYPE "DatesheetStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ExamDatesheet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "sectionId" TEXT,
    "startsOn" TIMESTAMP(3),
    "notes" TEXT,
    "status" "DatesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamDatesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDatesheetPage" (
    "id" TEXT NOT NULL,
    "datesheetId" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamDatesheetPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDatesheetEntry" (
    "id" TEXT NOT NULL,
    "datesheetId" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectName" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamDatesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamDatesheet_status_publishedAt_idx" ON "ExamDatesheet"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ExamDatesheet_academicYearId_idx" ON "ExamDatesheet"("academicYearId");

-- CreateIndex
CREATE INDEX "ExamDatesheetPage_datesheetId_idx" ON "ExamDatesheetPage"("datesheetId");

-- CreateIndex
CREATE INDEX "ExamDatesheetEntry_datesheetId_examDate_idx" ON "ExamDatesheetEntry"("datesheetId", "examDate");

-- AddForeignKey
ALTER TABLE "ExamDatesheet" ADD CONSTRAINT "ExamDatesheet_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheet" ADD CONSTRAINT "ExamDatesheet_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheet" ADD CONSTRAINT "ExamDatesheet_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheet" ADD CONSTRAINT "ExamDatesheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheetPage" ADD CONSTRAINT "ExamDatesheetPage_datesheetId_fkey" FOREIGN KEY ("datesheetId") REFERENCES "ExamDatesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheetEntry" ADD CONSTRAINT "ExamDatesheetEntry_datesheetId_fkey" FOREIGN KEY ("datesheetId") REFERENCES "ExamDatesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDatesheetEntry" ADD CONSTRAINT "ExamDatesheetEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
