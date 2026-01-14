# Database Migration Notes - Phase 10.2

## Overview
This document describes the database schema changes for Phase 10.2: Smart Ownership & Room Lifecycle features.

## Migration Instructions

To apply these schema changes to your database:

```bash
# From the backend directory
npm run db:push
# OR
npx prisma db push

# Then regenerate Prisma client
npm run db:generate
# OR
npx prisma generate
```

**Note:** This migration adds new tables and fields but does NOT modify or remove existing data.

## Schema Changes

### Modified Tables

#### `Room`
Added fields:
- `ownerLock` (Boolean, default: true) - Prevents room owner from being kicked
- `lastActivityAt` (DateTime, default: now()) - Tracks last activity for idle detection

New relations:
- `temporaryHosts` → TemporaryHost[]
- `playbackVotes` → PlaybackVote[]
- `participantMetrics` → ParticipantMetrics[]
- `historyEntries` → RoomHistory[]

### New Tables

#### `TemporaryHost`
Manages temporary host permissions with time limits.

Fields:
- `id` (String, CUID, PK)
- `roomId` (String, FK → Room)
- `permanentOwnerId` (String)
- `temporaryHostId` (String)
- `grantedAt` (DateTime)
- `expiresAt` (DateTime, nullable) - null means until revoked
- `permissions` (JSON) - Array of permission strings
- `revoked` (Boolean, default: false)

Indexes:
- Unique: (roomId, temporaryHostId)
- roomId
- temporaryHostId
- expiresAt

#### `PlaybackVote`
Tracks real-time voting for pause/resume actions.

Fields:
- `id` (String, CUID, PK)
- `roomId` (String, FK → Room)
- `type` (String) - 'pause' or 'resume'
- `initiatedBy` (String)
- `initiatedAt` (DateTime)
- `expiresAt` (DateTime)
- `threshold` (Int) - Number of yes votes needed
- `votes` (JSON) - Map of userId to 'yes' | 'no'
- `resolved` (Boolean, default: false)
- `passed` (Boolean, default: false)

Indexes:
- roomId
- resolved
- expiresAt

#### `ParticipantMetrics`
Tracks network stability for auto-host selection.

Fields:
- `id` (String, CUID, PK)
- `roomId` (String, FK → Room)
- `userId` (String)
- `avgLatencyMs` (Float, default: 0)
- `packetLossPercent` (Float, default: 0)
- `connectionUptime` (BigInt, default: 0) - in milliseconds
- `stabilityScore` (Float, default: 0) - computed score (lower is better)
- `lastUpdated` (DateTime)

Indexes:
- Unique: (roomId, userId)
- roomId
- userId

#### `ScheduledRoom`
Pre-scheduled rooms that activate at a specific time.

Fields:
- `id` (String, CUID, PK)
- `creatorId` (String)
- `scheduledFor` (DateTime)
- `timezone` (String, default: "UTC")
- `name` (String)
- `code` (String, unique) - Pre-generated invite code
- `maxParticipants` (Int, default: 5)
- `passwordHash` (String, nullable)
- `playbackControl` (String, default: "owner_only")
- `videoId` (String, nullable)
- `youtubeVideoId` (String, nullable)
- `externalUrl` (String, nullable)
- `status` (String, default: "scheduled") - scheduled | active | cancelled | expired
- `remindersSent` (Boolean, default: false)
- `invitedUsers` (JSON, default: "[]") - Array of user IDs
- `activatedRoomId` (String, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

Indexes:
- creatorId
- scheduledFor
- status
- code (unique)

#### `RoomHistory`
Tracks user watch sessions for history feature.

Fields:
- `id` (String, CUID, PK)
- `roomId` (String, FK → Room)
- `userId` (String)
- `roomName` (String)
- `sourceType` (String) - 'upload' | 'youtube' | 'external'
- `sourceData` (JSON) - Stores video metadata or URL
- `watchedAt` (DateTime)
- `watchDurationMs` (BigInt) - How long user watched
- `participants` (JSON) - Array of participant names/IDs
- `thumbnail` (String, nullable)
- `isVisible` (Boolean, default: true) - Privacy control

Indexes:
- (userId, watchedAt)
- roomId

#### `RoomTemplate`
User-created templates for quick room creation.

Fields:
- `id` (String, CUID, PK)
- `userId` (String)
- `name` (String)
- `isDefault` (Boolean, default: false)
- `settings` (JSON) - RoomSettings object
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

Indexes:
- userId
- (userId, isDefault)

## Background Jobs

The following background jobs are automatically started with the backend server:

1. **Idle Room Check** (every 1 minute)
   - Checks for rooms with no activity
   - Warns participants 5 minutes before closure
   - Closes rooms after 30 minutes of inactivity

2. **Scheduled Room Management** (every 1 minute)
   - Sends reminders 30 minutes before scheduled time
   - Activates scheduled rooms at their scheduled time
   - Expires old scheduled rooms (24+ hours past schedule)

3. **Session Cleanup** (every 5 minutes)
   - Removes expired temporary host sessions
   - Resolves expired votes

## Data Integrity

All new tables use `onDelete: Cascade` for foreign keys to `Room`, ensuring:
- When a room is deleted, all related records are automatically cleaned up
- No orphaned records remain in the database

## Rollback

To rollback these changes:

1. Stop the backend server
2. Drop the new tables in reverse order:
   ```sql
   DROP TABLE IF EXISTS "RoomTemplate";
   DROP TABLE IF EXISTS "RoomHistory";
   DROP TABLE IF EXISTS "ScheduledRoom";
   DROP TABLE IF EXISTS "ParticipantMetrics";
   DROP TABLE IF EXISTS "PlaybackVote";
   DROP TABLE IF EXISTS "TemporaryHost";
   ```
3. Remove added columns from Room:
   ```sql
   ALTER TABLE "Room" DROP COLUMN "ownerLock";
   ALTER TABLE "Room" DROP COLUMN "lastActivityAt";
   ```
4. Regenerate Prisma client

**Warning:** This will permanently delete all data in these tables!
