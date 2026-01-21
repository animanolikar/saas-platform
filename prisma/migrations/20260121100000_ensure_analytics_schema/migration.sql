-- CreateTable
CREATE TABLE IF NOT EXISTS "StudentAnalyticsReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "StudentAnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentAnalyticsReport_userId_idx" ON "StudentAnalyticsReport"("userId");

-- AddForeignKey
ALTER TABLE "StudentAnalyticsReport" ADD CONSTRAINT "StudentAnalyticsReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExamAssignment" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "teamId" TEXT,
    "userId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "ExamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExamAssignment_examId_idx" ON "ExamAssignment"("examId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExamAssignment_teamId_idx" ON "ExamAssignment"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExamAssignment_userId_idx" ON "ExamAssignment"("userId");

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
