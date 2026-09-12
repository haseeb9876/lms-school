-- CreateEnum
CREATE TYPE "DeviceClass" AS ENUM ('DESKTOP', 'MOBILE');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "absoluteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "chainId" TEXT,
ADD COLUMN     "deviceClass" "DeviceClass" NOT NULL DEFAULT 'DESKTOP',
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Session_chainId_idx" ON "Session"("chainId");
