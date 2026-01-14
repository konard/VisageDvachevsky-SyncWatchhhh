# E2E Tests

End-to-end tests for SyncWatch using Playwright.

## Overview

This directory contains E2E tests that verify complete user flows across multiple browsers. Tests are organized by feature and run in parallel across different browser engines.

## Test Structure

```
e2e/
├── room-creation.spec.ts      # Room creation and joining flows
├── video-playback.spec.ts     # Video upload and playback
├── synchronized-viewing.spec.ts # Sync verification tests
├── chat.spec.ts               # Chat functionality
└── README.md                  # This file
```

## Running Tests

### All Tests (All Browsers)

```bash
npm run test:e2e
```

### Specific Browser

```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Mobile Tests

```bash
npm run test:e2e:mobile
```

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### Specific Test File

```bash
npx playwright test e2e/room-creation.spec.ts
```

### Specific Test

```bash
npx playwright test -g "should create a new room"
```

## Browser Matrix

Tests automatically run on:

### Desktop
- **Chromium** (Chrome, Edge)
- **Firefox**
- **WebKit** (Safari)

### Mobile
- **Mobile Chrome** (Pixel 5 emulation)
- **Mobile Safari** (iPhone 13 emulation)
- **iPad Safari**

## Test Configuration

Configuration is in `playwright.config.ts` at the project root.

### Key Settings

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Parallel execution**: Yes (except on CI)
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 30 seconds per test
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Writing Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
    const button = page.getByRole('button', { name: /click/i });
    await button.click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Semantic Selectors**

```typescript
// ✅ Good - semantic and resilient
page.getByRole('button', { name: /submit/i })
page.getByLabel('Email')
page.getByText('Welcome')

// ❌ Avoid - brittle
page.locator('.btn-submit')
page.locator('#email-input')
```

2. **Wait for Network Idle**

```typescript
await page.waitForLoadState('networkidle');
```

3. **Explicit Waits**

```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

4. **Clean Up**

```typescript
test.afterEach(async ({ page }) => {
  // Clean up if needed
});
```

## Multi-User Testing

Many tests require simulating multiple users. Use browser contexts:

```typescript
test('should sync between users', async ({ page, context }) => {
  // User 1 (already has page)
  await page.goto('/room/123');

  // User 2 (new page in same context)
  const page2 = await context.newPage();
  await page2.goto('/room/123');

  // Test sync behavior
  await page.getByRole('button', { name: /play/i }).click();
  // Verify page2 sees the change
});
```

## Debugging Tests

### Run in Headed Mode

See the browser while tests run:

```bash
npm run test:e2e:headed
```

### Debug Mode

Step through tests with Playwright Inspector:

```bash
npm run test:e2e:debug
```

### Pause Test Execution

Add `await page.pause()` to pause at a specific point:

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Opens Playwright Inspector
  // Continue with test
});
```

### View Trace

After a test failure, view the trace:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

### Parallel Execution

Tests run in parallel across browser matrix:
- 3 jobs for desktop browsers (chromium, firefox, webkit)
- 1 job for mobile browsers

### Artifacts

Test results are uploaded as artifacts:
- Test results JSON
- Screenshots (on failure)
- Videos (on failure)
- Traces (on retry)

## Common Issues

### Port Already in Use

If port 3000 is in use:

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

Or set custom port:

```bash
BASE_URL=http://localhost:3001 npm run test:e2e
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
});
```

Or per test:

```typescript
test('slow test', async ({ page }) => {
  // test
}, { timeout: 60000 });
```

### Flaky Tests

Add explicit waits:

```typescript
// Wait for network to stabilize
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => document.querySelector('video')?.readyState === 4);
```

### Database Issues

Ensure test database is running:

```bash
docker compose -f docker-compose.dev.yml up db redis -d
npm run db:migrate:test
```

## Mobile-Specific Tests

### Device Emulation

Mobile tests use device emulation:

```typescript
// In playwright.config.ts
{
  name: 'Mobile Chrome',
  use: {
    ...devices['Pixel 5'],
  },
}
```

### Touch Interactions

Use tap instead of click for mobile:

```typescript
// Works on both desktop and mobile
await element.tap();
```

### Orientation

Test both orientations:

```typescript
test('works in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  // Test in landscape
});
```

## Performance Testing

### Measure Load Time

```typescript
test('page loads quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - start;

  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

### Network Conditions

Simulate slow network:

```typescript
test('works on slow connection', async ({ page, context }) => {
  // Simulate 3G
  await context.route('**/*', (route) => {
    return route.continue();
  });

  await page.goto('/');
  // Test behavior on slow connection
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-test)

## Support

For issues with E2E tests:
1. Check the test output and screenshots
2. Run in headed/debug mode
3. Review Playwright docs
4. Ask in GitHub Discussions
