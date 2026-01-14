# Testing Guide

This document provides comprehensive testing guidelines for SyncWatch, covering unit tests, integration tests, E2E tests, and browser compatibility testing.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Testing](#e2e-testing)
7. [Browser Compatibility](#browser-compatibility)
8. [Mobile Testing](#mobile-testing)
9. [Coverage Requirements](#coverage-requirements)
10. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

SyncWatch follows a comprehensive testing approach to ensure:

- **Reliability**: All critical paths are tested
- **Performance**: Tests run quickly to enable fast feedback
- **Maintainability**: Tests are clear and easy to update
- **Coverage**: 80% code coverage for critical components

**Testing Pyramid**:
- **70% Unit Tests**: Fast, isolated tests for business logic
- **20% Integration Tests**: Tests for API endpoints, database, WebSocket
- **10% E2E Tests**: Critical user flows in real browsers

---

## Test Pyramid

### Unit Tests (< 30 seconds total)
- Sync algorithm logic
- Room state management
- Authentication helpers
- Validation schemas
- UI components (React)
- Utility functions

### Integration Tests (< 2 minutes total)
- API endpoint tests with real database
- WebSocket connection tests
- Redis state management tests
- Authentication flow tests
- Room lifecycle tests

### E2E Tests (< 10 minutes total)
- Room creation and joining
- Video upload and playback
- Synchronized viewing
- Chat functionality
- Voice chat connections (basic)

---

## Running Tests

### All Tests
```bash
npm run test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npx playwright test
```

### Specific Workspace
```bash
npm run test --workspace=backend
npm run test --workspace=frontend
```

### Watch Mode (Development)
```bash
npm run test -- --watch
```

### Coverage Reports
```bash
npm run test:coverage
```

Open coverage reports:
- Backend: `backend/coverage/index.html`
- Frontend: `frontend/coverage/index.html`

---

## Unit Testing

### Framework: Vitest

**Backend Unit Tests**
```typescript
// backend/src/modules/auth/__tests__/auth.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should hash passwords correctly', async () => {
    const password = 'SecurePass123!';
    const hash = await authService.hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  it('should validate password against hash', async () => {
    const password = 'SecurePass123!';
    const hash = await authService.hashPassword(password);

    const isValid = await authService.comparePassword(password, hash);
    expect(isValid).toBe(true);
  });
});
```

**Frontend Unit Tests**
```typescript
// frontend/src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });
});
```

### Best Practices

- **Isolate tests**: Use mocks for external dependencies
- **Test behavior**: Focus on what the code does, not how
- **Clear names**: Describe what is being tested
- **Fast execution**: Unit tests should run in milliseconds
- **No database/network**: Mock external resources

---

## Integration Testing

### Setup

Integration tests use real PostgreSQL and Redis instances.

**Prerequisites**:
```bash
# Start test infrastructure
docker compose -f docker-compose.dev.yml up db redis -d

# Run database migrations
npm run db:migrate:test
```

### Example Integration Test

```typescript
// backend/src/modules/rooms/__tests__/rooms.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/prisma';

describe('Rooms API Integration', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();

    // Create test user and get auth token
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
    });

    authToken = response.json().token;
  });

  afterEach(async () => {
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('should create a new room', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: 'Test Room',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('id');
    expect(response.json().name).toBe('Test Room');
  });

  it('should join an existing room', async () => {
    // Create room
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const roomId = createResponse.json().id;

    // Join room
    const joinResponse = await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/join`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(joinResponse.statusCode).toBe(200);
  });
});
```

---

## E2E Testing

### Framework: Playwright

E2E tests run in real browsers and test complete user flows.

### Browser Matrix

Tests run on:
- **Chrome** (latest, latest-1)
- **Firefox** (latest, latest-1)
- **Safari/WebKit** (latest)
- **Mobile Chrome** (Pixel 5 emulation)
- **Mobile Safari** (iPhone 13 emulation)
- **iPad Safari**

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test file
npx playwright test e2e/room-creation.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

### E2E Test Structure

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should perform action successfully', async ({ page }) => {
    // Arrange
    const button = page.getByRole('button', { name: /click me/i });

    // Act
    await button.click();

    // Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

---

## Browser Compatibility

### Desktop Browsers

| Browser | Versions | Notes |
|---------|----------|-------|
| Chrome | Latest, Latest-1 | Full support |
| Firefox | Latest, Latest-1 | Full support |
| Safari | Latest | WebRTC quirks (see below) |
| Edge | Latest | Chromium-based, same as Chrome |

### Mobile Browsers

| Browser | Devices | Notes |
|---------|---------|-------|
| Mobile Chrome | Android 10+ | Full support |
| Mobile Safari | iOS 15+ | Special handling required |
| iPad Safari | iPadOS 15+ | Different from iPhone |

---

## Mobile Testing

### Safari/WebKit Quirks

**Issue 1: WebRTC addTrack vs addTransceiver**

Safari on iOS doesn't fully support `addTransceiver`. Use `addTrack` instead:

```typescript
// ❌ Don't use on iOS Safari
pc.addTransceiver('audio', { direction: 'sendrecv' });

// ✅ Use this instead
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const track = stream.getAudioTracks()[0];
pc.addTrack(track, stream);
```

**Issue 2: Explicit Audio Element**

Safari requires an explicit `<audio>` element for playback:

```typescript
// Create audio element for Safari
const audio = document.createElement('audio');
audio.srcObject = stream;
audio.autoplay = true;
document.body.appendChild(audio);
```

**Issue 3: User Gesture Requirement**

Safari blocks autoplay without user interaction. Implement audio unlock:

```typescript
// frontend/src/utils/audioUnlock.ts
export const unlockAudio = () => {
  const audio = new Audio();
  audio.play().catch(() => {
    // User hasn't interacted yet
  });
};

// Call on first user interaction
document.addEventListener('click', unlockAudio, { once: true });
```

### iOS Autoplay Restrictions

**Muted Autoplay**

Videos can autoplay if muted:

```html
<video
  src="video.mp4"
  autoplay
  muted
  playsinline
/>
```

**Playsinline Attribute**

Prevent fullscreen on play:

```html
<video playsinline />
```

**Manual Play After Interaction**

```typescript
button.addEventListener('click', async () => {
  await videoElement.play();
});
```

### Android Power Saving Mode

**Wake Lock API**

Prevent screen from sleeping during playback:

```typescript
// Request wake lock
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  try {
    wakeLock = await navigator.wakeLock.request('screen');

    wakeLock.addEventListener('release', () => {
      console.log('Wake lock released');
    });
  } catch (err) {
    console.error('Wake lock error:', err);
  }
};

// Release when done
const releaseWakeLock = async () => {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
};
```

**Visibility Change Handling**

Reduce sync frequency when app is backgrounded:

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Reduce sync frequency to save battery
    setSyncInterval(5000); // 5 seconds instead of 1 second
  } else {
    // Restore normal sync frequency
    setSyncInterval(1000);
  }
});
```

**Low Power Mode**

Detect and adapt to low power mode:

```typescript
// Check battery status
const battery = await navigator.getBattery?.();

if (battery) {
  battery.addEventListener('chargingchange', () => {
    if (!battery.charging && battery.level < 0.2) {
      // Enable low-power optimizations
      reduceSyncFrequency();
      disableNonEssentialFeatures();
    }
  });
}
```

---

## Coverage Requirements

### Coverage Thresholds

All critical code must maintain **80% coverage**:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Exclusions

The following are excluded from coverage:
- Test files (`*.test.ts`, `*.spec.ts`)
- Type definitions (`*.d.ts`)
- Build configuration files
- Entry points (`index.ts`, `main.tsx`)

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open frontend/coverage/index.html
open backend/coverage/index.html
```

### Critical Paths (100% coverage required)

- Authentication logic
- Sync algorithm (soft/hard resync)
- Room state management
- Payment processing (if applicable)
- Security validations

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- **Push** to `main` or `develop`
- **Pull Requests**

### Workflow Jobs

1. **Lint**: ESLint checks
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Backend + Frontend
4. **Integration Tests**: With PostgreSQL + Redis
5. **E2E Tests**: Playwright across browsers
6. **Coverage**: Upload to Codecov

### Local CI Simulation

Run the same checks as CI locally:

```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Tests
npm run test:ci

# Build
npm run build
```

### Performance Targets

- **Unit tests**: < 30 seconds
- **Integration tests**: < 2 minutes
- **E2E tests**: < 10 minutes (all browsers)
- **Total CI time**: < 15 minutes

---

## Best Practices

### 1. Test Naming

Use descriptive names:

```typescript
// ❌ Bad
it('test 1', () => {});

// ✅ Good
it('should create room when user is authenticated', () => {});
```

### 2. Arrange-Act-Assert

Structure tests clearly:

```typescript
it('should calculate sync offset correctly', () => {
  // Arrange
  const serverTime = 1000;
  const clientTime = 900;

  // Act
  const offset = calculateOffset(serverTime, clientTime);

  // Assert
  expect(offset).toBe(100);
});
```

### 3. Avoid Test Interdependence

Each test should be independent:

```typescript
// ❌ Don't rely on test order
let userId: string;
it('creates user', () => {
  userId = createUser(); // Other tests depend on this
});

// ✅ Create fresh data per test
it('updates user profile', () => {
  const userId = createUser();
  updateUser(userId, { name: 'New Name' });
});
```

### 4. Use Test Fixtures

Create reusable test data:

```typescript
// tests/fixtures/users.ts
export const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
};

export const createMockRoom = () => ({
  id: 'room-' + Math.random(),
  name: 'Test Room',
  ownerId: mockUser.id,
});
```

### 5. Clean Up After Tests

```typescript
afterEach(async () => {
  // Clean up database
  await prisma.room.deleteMany();

  // Close connections
  await closeRedis();

  // Reset mocks
  vi.clearAllMocks();
});
```

---

## Troubleshooting

### Tests Timing Out

Increase timeout for slow tests:

```typescript
test('slow operation', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

### Flaky E2E Tests

Add explicit waits:

```typescript
// ❌ Flaky
await button.click();
expect(page.getByText('Success')).toBeVisible();

// ✅ More reliable
await button.click();
await page.waitForLoadState('networkidle');
await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
```

### Database Connection Issues

Ensure test database is running:

```bash
docker compose -f docker-compose.dev.yml up db redis -d
npm run db:migrate:test
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [WebRTC Testing Guide](https://webrtc.org/testing/)

---

**Need Help?**

- Check existing tests for examples
- Review CI logs for failures
- Ask in GitHub Discussions
