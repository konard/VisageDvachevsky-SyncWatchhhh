# SyncWatch Code Style Guide

This document defines the coding standards and best practices for the SyncWatch project. Consistent code style makes the codebase easier to read, maintain, and collaborate on.

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript](#typescript)
3. [React & Frontend](#react--frontend)
4. [Backend & API](#backend--api)
5. [Naming Conventions](#naming-conventions)
6. [File Organization](#file-organization)
7. [Comments & Documentation](#comments--documentation)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Git & Commits](#git--commits)

---

## General Principles

### Code Quality

- **DRY (Don't Repeat Yourself)**: Extract reusable logic into functions or modules
- **KISS (Keep It Simple, Stupid)**: Prefer simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until it's needed
- **Single Responsibility**: Each function/class should do one thing well

### Readability

- Write code for humans, not just machines
- Use descriptive names over comments
- Keep functions small (<50 lines ideal, <100 max)
- Limit nesting depth (max 3-4 levels)

### Performance

- Optimize only when necessary (measure first)
- Use appropriate data structures
- Avoid premature optimization
- Cache expensive operations

---

## TypeScript

### General TypeScript

**Use TypeScript for all code:**
```typescript
// ✅ Good
function calculateDrift(clientTime: number, serverTime: number): number {
  return Math.abs(clientTime - serverTime);
}

// ❌ Bad
function calculateDrift(clientTime, serverTime) {
  return Math.abs(clientTime - serverTime);
}
```

**Enable strict mode in tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Definitions

**Prefer interfaces for objects:**
```typescript
// ✅ Good
interface User {
  id: string;
  username: string;
  email: string;
}

// ❌ Avoid (unless you need union/intersection types)
type User = {
  id: string;
  username: string;
  email: string;
};
```

**Use types for unions, primitives, and utilities:**
```typescript
// ✅ Good
type PlaybackState = 'playing' | 'paused' | 'buffering';
type Nullable<T> = T | null;
```

**Avoid `any`, use `unknown` when type is truly unknown:**
```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}
```

**Use const assertions for literal types:**
```typescript
// ✅ Good
const SYNC_COMMANDS = ['PLAY', 'PAUSE', 'SEEK'] as const;
type SyncCommand = typeof SYNC_COMMANDS[number]; // 'PLAY' | 'PAUSE' | 'SEEK'
```

### Variables & Constants

**Use const by default, let when reassignment needed:**
```typescript
// ✅ Good
const maxParticipants = 5;
let currentCount = 0;

// ❌ Bad
var maxParticipants = 5; // Never use var
let pi = 3.14159; // Should be const
```

**Constants in UPPER_SNAKE_CASE:**
```typescript
// ✅ Good
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024 * 1024; // 8GB
const DEFAULT_PLAYBACK_RATE = 1.0;

// ❌ Bad
const maxUploadSize = 8589934592;
```

### Functions

**Use arrow functions for short callbacks:**
```typescript
// ✅ Good
const doubled = numbers.map(n => n * 2);
const filtered = users.filter(u => u.isActive);

// ✅ Also good for async
const fetchUser = async (id: string) => {
  return await api.get(`/users/${id}`);
};
```

**Use function declarations for top-level functions:**
```typescript
// ✅ Good
export function calculateMediaTime(state: PlaybackState): number {
  if (state.isPaused) return state.mediaTime;
  const elapsed = (Date.now() - state.lastUpdatedAt) / 1000;
  return state.mediaTime + elapsed * state.rate;
}
```

**Always specify return types for public functions:**
```typescript
// ✅ Good
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ❌ Bad (implicit return type)
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
```

### Async/Await

**Prefer async/await over .then():**
```typescript
// ✅ Good
async function getUser(id: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

// ❌ Bad
function getUser(id: string): Promise<User> {
  return db.user.findUnique({ where: { id } }).then(user => {
    if (!user) throw new NotFoundError('User not found');
    return user;
  });
}
```

**Handle errors explicitly:**
```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw new AppError('Failed to complete operation');
}
```

---

## React & Frontend

### Component Structure

**Functional components with hooks:**
```tsx
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}
```

**Component file structure:**
```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Types/Interfaces
interface RoomCardProps {
  room: Room;
  onJoin: (code: string) => void;
}

// 3. Component
export function RoomCard({ room, onJoin }: RoomCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    // JSX
  );
}

// 4. Styled components or styles (if any)
```

### Hooks

**Custom hooks start with `use`:**
```typescript
// ✅ Good
export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoom(roomCode).then(setRoom).finally(() => setLoading(false));
  }, [roomCode]);

  return { room, loading };
}
```

**Dependencies in useEffect:**
```typescript
// ✅ Good - all dependencies listed
useEffect(() => {
  syncPlayback(mediaTime, rate);
}, [mediaTime, rate]);

// ❌ Bad - missing dependencies
useEffect(() => {
  syncPlayback(mediaTime, rate);
}, []); // ESLint will warn
```

### State Management

**Use Zustand for global state:**
```typescript
// ✅ Good
interface RoomStore {
  currentRoom: Room | null;
  participants: Participant[];
  setRoom: (room: Room) => void;
  addParticipant: (participant: Participant) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  currentRoom: null,
  participants: [],
  setRoom: (room) => set({ currentRoom: room }),
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants, participant]
  })),
}));
```

**Use useState for local component state:**
```typescript
// ✅ Good - local UI state
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');
```

### JSX

**Self-closing tags when no children:**
```tsx
// ✅ Good
<Avatar src={user.avatarUrl} />
<br />

// ❌ Bad
<Avatar src={user.avatarUrl}></Avatar>
```

**Conditional rendering:**
```tsx
// ✅ Good - ternary for if/else
{isLoading ? <Spinner /> : <Content />}

// ✅ Good - && for show/hide
{error && <ErrorMessage message={error} />}

// ❌ Bad - don't render booleans
{isLoading && <Spinner />} ✅
{isLoading} ❌
```

**Props spread:**
```tsx
// ✅ Good - spread remaining props
function Input({ label, ...inputProps }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...inputProps} />
    </div>
  );
}
```

---

## Backend & API

### Route Handlers

**Use Fastify route structure:**
```typescript
// ✅ Good
export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      body: registerSchema,
    },
    handler: async (request, reply) => {
      const { email, username, password } = request.body;
      const result = await authService.register(email, username, password);
      return reply.code(201).send(result);
    },
  });
}
```

**Validate with Zod schemas:**
```typescript
// ✅ Good
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

### Services

**Separate business logic into services:**
```typescript
// ✅ Good
export class AuthService {
  async register(email: string, username: string, password: string) {
    // Check if user exists
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new ConflictError('Email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: { email, username, passwordHash },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return { user, ...tokens };
  }
}
```

### Database Queries

**Use Prisma's type-safe queries:**
```typescript
// ✅ Good
const user = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    username: true,
    email: true,
    // Don't select passwordHash unless needed
  },
});

// ❌ Bad - selecting everything including password
const user = await db.user.findUnique({
  where: { id: userId },
});
```

**Use transactions for multi-step operations:**
```typescript
// ✅ Good
const result = await db.$transaction(async (tx) => {
  const room = await tx.room.create({ data: roomData });
  const participant = await tx.roomParticipant.create({
    data: { roomId: room.id, userId, role: 'owner' },
  });
  return { room, participant };
});
```

### Error Handling

**Use custom error classes:**
```typescript
// ✅ Good
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Usage
if (!user) {
  throw new NotFoundError('User not found');
}
```

**Centralized error handling:**
```typescript
// ✅ Good - error handler middleware
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }

  logger.error('Unhandled error', { error });
  return reply.code(500).send({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
});
```

---

## Naming Conventions

### Variables & Functions

```typescript
// camelCase for variables and functions
const userName = 'john_doe';
const currentRoom = { ... };
function calculateMediaTime() { }
async function fetchUserById() { }

// PascalCase for classes and components
class AuthService { }
class RoomManager { }
function UserProfile() { }

// UPPER_SNAKE_CASE for constants
const MAX_FILE_SIZE = 8_000_000_000;
const API_BASE_URL = 'http://localhost:4000';

// Prefix booleans with is/has/can/should
const isAuthenticated = true;
const hasPermission = false;
const canControl = user.role === 'owner';
```

### Files & Directories

```
// kebab-case for file names
auth-service.ts
room-card.tsx
sync-protocol.ts

// PascalCase for React components
UserProfile.tsx
RoomCard.tsx
VideoPlayer.tsx

// lowercase for directories
components/
services/
utils/
hooks/
```

### Interfaces & Types

```typescript
// PascalCase, descriptive names
interface User { }
interface RoomParticipant { }
type PlaybackCommand = 'PLAY' | 'PAUSE' | 'SEEK';

// Props interfaces end with Props
interface ButtonProps { }
interface RoomCardProps { }

// Event handler props start with on
interface ButtonProps {
  onClick: () => void;
  onHover?: () => void;
}
```

---

## File Organization

### Import Order

```typescript
// 1. External libraries
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 2. Internal absolute imports
import { db } from '@/database/prisma';
import { redis } from '@/database/redis';

// 3. Relative imports (same module)
import { AuthService } from './auth.service';
import { registerSchema } from './schemas';

// 4. Types
import type { User } from '@prisma/client';
```

### File Size

- Keep files under 300 lines
- Split large files into smaller modules
- Extract reusable logic into utilities

---

## Comments & Documentation

### When to Comment

**Do comment:**
- Complex algorithms or business logic
- Non-obvious workarounds
- Public APIs and exported functions
- Regex patterns

**Don't comment:**
- Obvious code (`// increment i` ❌)
- What the code does (use descriptive names instead)

### JSDoc for Public APIs

```typescript
/**
 * Calculate the current media time based on playback state and elapsed time.
 *
 * @param state - Current playback state
 * @returns Current media time in seconds
 */
export function calculateMediaTime(state: PlaybackState): number {
  if (state.isPaused) return state.mediaTime;
  const elapsed = (Date.now() - state.lastUpdatedAt) / 1000;
  return state.mediaTime + elapsed * state.rate;
}
```

### TODO Comments

```typescript
// TODO: Add rate limiting
// FIXME: Handle edge case when room owner leaves
// HACK: Workaround for Safari WebRTC bug (remove when fixed)
```

---

## Error Handling

### Frontend

```typescript
// ✅ Good - user-friendly error handling
async function joinRoom(code: string, password?: string) {
  try {
    const room = await api.joinRoom(code, password);
    navigate(`/room/${code}`);
  } catch (error) {
    if (error.code === 'ROOM_NOT_FOUND') {
      toast.error('Room does not exist');
    } else if (error.code === 'INCORRECT_PASSWORD') {
      toast.error('Incorrect password');
    } else {
      toast.error('Failed to join room');
    }
  }
}
```

### Backend

```typescript
// ✅ Good - log errors with context
try {
  await transcodingService.processVideo(videoId);
} catch (error) {
  logger.error('Video transcoding failed', {
    videoId,
    error: error.message,
    stack: error.stack,
  });
  throw new AppError('Transcoding failed');
}
```

---

## Testing

### Test Structure

```typescript
// ✅ Good - descriptive test names
describe('AuthService', () => {
  describe('register', () => {
    it('creates a new user with hashed password', async () => {
      const result = await authService.register('test@example.com', 'testuser', 'password123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).not.toBe('password123');
    });

    it('throws ConflictError when email already exists', async () => {
      await authService.register('test@example.com', 'user1', 'pass');
      await expect(
        authService.register('test@example.com', 'user2', 'pass')
      ).rejects.toThrow(ConflictError);
    });
  });
});
```

### Test Naming

```typescript
// ✅ Good - describes behavior
it('returns 401 when token is invalid')
it('sends sync command to all room participants')
it('debounces seek commands to prevent spam')

// ❌ Bad - vague or implementation-focused
it('works correctly')
it('test auth')
it('checks the thing')
```

---

## Git & Commits

### Commit Messages

See [CONTRIBUTING.md](CONTRIBUTING.md#commit-guidelines) for full guidelines.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**
```bash
feat(sync): add playback rate control
fix(auth): prevent token expiry race condition
docs: update API documentation for rooms endpoint
refactor(voice): extract WebRTC connection logic
test(rooms): add integration tests for join flow
```

---

## Linting & Formatting

### ESLint

Run before committing:
```bash
npm run lint
npm run lint -- --fix
```

### Auto-format on Save (VS Code)

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

---

## Summary Checklist

Before submitting code:

- [ ] TypeScript strict mode enabled, no `any`
- [ ] Descriptive variable/function names
- [ ] Functions are small and focused
- [ ] Error handling is explicit
- [ ] Tests are added for new functionality
- [ ] Code is linted and formatted
- [ ] No console.log or debug code
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

---

Following this style guide ensures consistency and quality across the SyncWatch codebase. Thank you for maintaining these standards!
