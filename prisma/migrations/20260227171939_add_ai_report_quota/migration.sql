-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiReportQuota" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "PaymentIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntegration_organizationId_provider_key" ON "PaymentIntegration"("organizationId", "provider");

-- AddForeignKey
ALTER TABLE "PaymentIntegration" ADD CONSTRAINT "PaymentIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
