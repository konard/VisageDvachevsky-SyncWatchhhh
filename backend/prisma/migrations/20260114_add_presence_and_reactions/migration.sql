-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "invisibleMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showRichPresence" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowFriendJoin" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "VideoReaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "emoji" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "mediaTimeMs" INTEGER NOT NULL,
    "animation" TEXT NOT NULL DEFAULT 'float',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoReaction_roomId_mediaTimeMs_idx" ON "VideoReaction"("roomId", "mediaTimeMs");

-- CreateIndex
CREATE INDEX "VideoReaction_roomId_createdAt_idx" ON "VideoReaction"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoReaction_userId_idx" ON "VideoReaction"("userId");

-- AddForeignKey
ALTER TABLE "VideoReaction" ADD CONSTRAINT "VideoReaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoReaction" ADD CONSTRAINT "VideoReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
