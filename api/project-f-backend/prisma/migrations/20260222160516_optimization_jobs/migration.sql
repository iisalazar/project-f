-- CreateTable
CREATE TABLE "OptimizationJob" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "result" JSONB,
    "resultVersion" TEXT,
    "errorMessage" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationJobLog" (
    "id" UUID NOT NULL,
    "optimizationJobId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptimizationJob_ownerUserId_status_idx" ON "OptimizationJob"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "OptimizationJob_createdAt_idx" ON "OptimizationJob"("createdAt");

-- CreateIndex
CREATE INDEX "OptimizationJobLog_optimizationJobId_idx" ON "OptimizationJobLog"("optimizationJobId");

-- AddForeignKey
ALTER TABLE "OptimizationJob" ADD CONSTRAINT "OptimizationJob_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationJobLog" ADD CONSTRAINT "OptimizationJobLog_optimizationJobId_fkey" FOREIGN KEY ("optimizationJobId") REFERENCES "OptimizationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
