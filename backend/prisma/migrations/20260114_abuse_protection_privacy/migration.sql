-- AlterTable: Add privacy settings to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "forceRelay" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "hideFromSearch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "blockNonFriends" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add privacy preset and settings to Room
ALTER TABLE "Room" ADD COLUMN "privacyPreset" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "Room" ADD COLUMN "allowAnonymous" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN "requireAuth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "showRealNames" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN "forceRelayMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: UserReport for abuse reporting
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX "UserReport_reportedUserId_idx" ON "UserReport"("reportedUserId");
CREATE INDEX "UserReport_roomId_idx" ON "UserReport"("roomId");
CREATE INDEX "UserReport_status_idx" ON "UserReport"("status");
CREATE INDEX "UserReport_createdAt_idx" ON "UserReport"("createdAt");

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
