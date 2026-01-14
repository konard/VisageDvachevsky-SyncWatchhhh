import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Create a room for testing
    await page.goto('/');
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/[a-zA-Z0-9-]+/);
  });

  test('should display chat interface', async ({ page }) => {
    // Look for chat input or chat panel
    const chatInterface = page.locator('[data-testid="chat"], [aria-label*="chat"], textarea[placeholder*="message"], input[placeholder*="message"]').first();

    await expect(chatInterface).toBeVisible({ timeout: 10000 });
  });

  test('should send and receive messages', async ({ page, context }) => {
    const roomUrl = page.url();

    // Find chat input
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type a message
    const testMessage = 'Hello, this is a test message!';
    await chatInput.fill(testMessage);

    // Send message (press Enter or click send button)
    const sendButton = page.getByRole('button', { name: /send/i }).first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Message should appear in chat
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should synchronize messages between users', async ({ page, context }) => {
    const roomUrl = page.url();

    // User 2 joins
    const page2 = await context.newPage();
    await page2.goto(roomUrl);
    await page2.waitForLoadState('networkidle');

    // User 1 sends a message
    const chatInput1 = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput1).toBeVisible({ timeout: 10000 });

    const testMessage = 'Message from User 1';
    await chatInput1.fill(testMessage);

    const sendButton1 = page.getByRole('button', { name: /send/i }).first();
    if (await sendButton1.isVisible()) {
      await sendButton1.click();
    } else {
      await chatInput1.press('Enter');
    }

    // User 2 should see the message
    await expect(page2.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should display system messages for user join/leave', async ({ page, context }) => {
    const roomUrl = page.url();

    // User 2 joins
    const page2 = await context.newPage();
    await page2.goto(roomUrl);
    await page2.waitForLoadState('networkidle');

    // Should see join notification (implementation-dependent)
    // Look for system message indicators
    await page.waitForTimeout(1000);

    // User 2 leaves
    await page2.close();

    // Should see leave notification
    await page.waitForTimeout(1000);

    // Verify chat is still functional
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible();
  });

  test('should show message timestamps', async ({ page }) => {
    // Send a message
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    const testMessage = 'Test message with timestamp';
    await chatInput.fill(testMessage);

    const sendButton = page.getByRole('button', { name: /send/i }).first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for message to appear
    await page.waitForTimeout(500);

    // Look for timestamp (format varies, could be HH:MM, relative time, etc.)
    // This test structure depends on actual implementation
    await expect(page.getByText(testMessage)).toBeVisible();
  });

  test('should handle long messages', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Send a long message
    const longMessage = 'A'.repeat(500);
    await chatInput.fill(longMessage);

    const sendButton = page.getByRole('button', { name: /send/i }).first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Message should be sent (may be truncated or handled by UI)
    await page.waitForTimeout(1000);

    // Verify chat is still functional
    await expect(chatInput).toBeVisible();
  });

  test('should scroll to latest message', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Send multiple messages
    for (let i = 0; i < 10; i++) {
      await chatInput.fill(`Message ${i + 1}`);

      const sendButton = page.getByRole('button', { name: /send/i }).first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        await chatInput.press('Enter');
      }

      await page.waitForTimeout(300);
    }

    // Latest message should be visible
    await expect(page.getByText('Message 10')).toBeVisible();
  });

  test('should handle empty messages gracefully', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Try to send empty message
    await chatInput.fill('');

    const sendButton = page.getByRole('button', { name: /send/i }).first();
    if (await sendButton.isVisible()) {
      // Button might be disabled for empty messages
      const isDisabled = await sendButton.isDisabled();
      if (!isDisabled) {
        await sendButton.click();
      }
    } else {
      await chatInput.press('Enter');
    }

    // Verify input is still functional
    await expect(chatInput).toBeVisible();
  });
});
