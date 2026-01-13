import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  console.log('Cleaning existing data...');
  await prisma.chatMessage.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.video.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  console.log('Creating test users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      username: 'alice',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      username: 'bob',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?img=2',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      username: 'charlie',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?img=3',
    },
  });

  console.log(`Created users: ${alice.username}, ${bob.username}, ${charlie.username}`);

  // Create friendships
  console.log('Creating friendships...');
  await prisma.friendship.create({
    data: {
      requesterId: alice.id,
      addresseeId: bob.id,
      status: 'accepted',
    },
  });

  await prisma.friendship.create({
    data: {
      requesterId: alice.id,
      addresseeId: charlie.id,
      status: 'pending',
    },
  });

  console.log('Created friendships');

  // Create test video
  console.log('Creating test video...');
  const video = await prisma.video.create({
    data: {
      uploaderId: alice.id,
      filename: 'test-video.mp4',
      originalSize: BigInt(10 * 1024 * 1024), // 10 MB
      mimeType: 'video/mp4',
      duration: 120, // 2 minutes
      status: 'ready',
      progress: 100,
      storageKey: 'videos/test-video.mp4',
      manifestUrl: 'https://example.com/videos/test-video/manifest.m3u8',
      width: 1920,
      height: 1080,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    },
  });

  console.log(`Created video: ${video.filename}`);

  // Create test rooms
  console.log('Creating test rooms...');
  const room1 = await prisma.room.create({
    data: {
      code: nanoid(8),
      name: "Alice's Movie Night",
      ownerId: alice.id,
      maxParticipants: 5,
      playbackControl: 'owner_only',
      videoId: video.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const room2 = await prisma.room.create({
    data: {
      code: nanoid(8),
      name: "Bob's Gaming Session",
      ownerId: bob.id,
      maxParticipants: 3,
      playbackControl: 'all',
      youtubeVideoId: 'dQw4w9WgXcQ',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    },
  });

  const room3 = await prisma.room.create({
    data: {
      code: nanoid(8),
      name: 'Public Watch Party',
      ownerId: charlie.id,
      maxParticipants: 5,
      playbackControl: 'selected',
      externalUrl: 'https://example.com/external-video.mp4',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    },
  });

  console.log(`Created rooms: ${room1.name}, ${room2.name}, ${room3.name}`);

  // Add participants to rooms
  console.log('Adding room participants...');
  await prisma.roomParticipant.create({
    data: {
      roomId: room1.id,
      userId: alice.id,
      role: 'owner',
      canControl: true,
    },
  });

  await prisma.roomParticipant.create({
    data: {
      roomId: room1.id,
      userId: bob.id,
      role: 'participant',
      canControl: false,
    },
  });

  await prisma.roomParticipant.create({
    data: {
      roomId: room2.id,
      userId: bob.id,
      role: 'owner',
      canControl: true,
    },
  });

  await prisma.roomParticipant.create({
    data: {
      roomId: room3.id,
      userId: charlie.id,
      role: 'owner',
      canControl: true,
    },
  });

  // Add a guest participant
  await prisma.roomParticipant.create({
    data: {
      roomId: room3.id,
      userId: null,
      guestName: 'Anonymous Viewer',
      role: 'guest',
      canControl: false,
    },
  });

  console.log('Added room participants');

  // Create chat messages
  console.log('Creating chat messages...');
  await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: null,
      type: 'system',
      content: 'Room created',
      metadata: {
        kind: 'room_created',
        data: { roomName: room1.name },
      },
    },
  });

  await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: alice.id,
      type: 'user',
      content: 'Welcome everyone! 🎬',
    },
  });

  await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: bob.id,
      type: 'user',
      content: 'Thanks for the invite!',
    },
  });

  await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: null,
      type: 'system',
      content: 'bob joined the room',
      metadata: {
        kind: 'user_joined',
        data: { username: 'bob' },
      },
    },
  });

  console.log('Created chat messages');

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
