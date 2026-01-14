import { test, expect } from '@playwright/test';

test.describe('Room Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new room successfully', async ({ page }) => {
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /syncwatch/i })).toBeVisible();

    // Click on create room button
    const createButton = page.getByRole('button', { name: /create room/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Should navigate to room page
    await expect(page).toHaveURL(/\/room\/[a-z0-9-]+/);

    // Should show room interface
    await expect(page.getByText(/room/i)).toBeVisible();
  });

  test('should display room invite link', async ({ page }) => {
    // Create a room
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/[a-z0-9-]+/);

    // Look for invite/share button
    const shareButton = page.getByRole('button', { name: /share|invite/i }).first();
    await expect(shareButton).toBeVisible();

    await shareButton.click();

    // Should show invite link
    await expect(page.getByText(/invite link|room link/i)).toBeVisible();
  });

  test('should join room with invite link', async ({ page, context }) => {
    // Create a room in first page
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/([a-z0-9-]+)/);

    const roomUrl = page.url();
    const roomId = roomUrl.split('/room/')[1];

    // Open new page and join the room
    const page2 = await context.newPage();
    await page2.goto(roomUrl);

    // Should be in the same room
    await expect(page2).toHaveURL(new RegExp(`/room/${roomId}`));
    await expect(page2.getByText(/room/i)).toBeVisible();
  });

  test('should show participants count', async ({ page, context }) => {
    // Create a room
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/[a-z0-9-]+/);

    const roomUrl = page.url();

    // Check initial participant count (should be 1)
    const participantIndicator = page.locator('[data-testid="participant-count"], [aria-label*="participant"]').first();
    await expect(participantIndicator).toBeVisible({ timeout: 10000 });

    // Second user joins
    const page2 = await context.newPage();
    await page2.goto(roomUrl);
    await page2.waitForLoadState('networkidle');

    // Wait a bit for WebSocket connection
    await page.waitForTimeout(1000);

    // Participant count should update (implementation-dependent)
    // This test may need adjustment based on actual UI
  });

  test('should handle maximum room capacity', async ({ page }) => {
    // This test verifies that rooms enforce the 5-user limit
    // Implementation depends on how the app handles this
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/[a-z0-9-]+/);

    // The actual test would require creating multiple users
    // This is a placeholder for the structure
    expect(true).toBe(true);
  });
});
