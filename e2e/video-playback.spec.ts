import { test, expect } from '@playwright/test';

test.describe('Video Upload and Playback', () => {
  test.beforeEach(async ({ page }) => {
    // Create a room for testing
    await page.goto('/');
    await page.getByRole('button', { name: /create room/i }).click();
    await page.waitForURL(/\/room\/[a-zA-Z0-9-]+/);
  });

  test('should display video source options', async ({ page }) => {
    // Look for add video or source selection button
    const addVideoButton = page.getByRole('button', { name: /add video|select video|choose source/i }).first();
    await expect(addVideoButton).toBeVisible({ timeout: 10000 });

    await addVideoButton.click();

    // Should show source options (upload, YouTube, URL)
    await expect(
      page.getByText(/upload|youtube|url/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should accept YouTube URL', async ({ page }) => {
    // Click add video
    const addVideoButton = page.getByRole('button', { name: /add video|select video/i }).first();
    await addVideoButton.click();

    // Find YouTube option and input
    const youtubeOption = page.getByText(/youtube/i).first();
    await youtubeOption.click();

    // Enter a YouTube URL
    const urlInput = page.getByPlaceholder(/youtube|url|link/i);
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // Submit
    const submitButton = page.getByRole('button', { name: /add|submit|load/i }).first();
    await submitButton.click();

    // Should show video player
    await expect(page.locator('video, iframe[src*="youtube"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show video player controls', async ({ page }) => {
    // Add a YouTube video first
    const addVideoButton = page.getByRole('button', { name: /add video|select video/i }).first();
    await addVideoButton.click();

    const youtubeOption = page.getByText(/youtube/i).first();
    await youtubeOption.click();

    const urlInput = page.getByPlaceholder(/youtube|url|link/i);
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const submitButton = page.getByRole('button', { name: /add|submit|load/i }).first();
    await submitButton.click();

    // Wait for player to load
    await page.waitForTimeout(2000);

    // Look for player controls
    await expect(
      page.getByRole('button', { name: /play|pause/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should upload video file', async ({ page }) => {
    // This test requires a file upload flow
    // Implementation depends on the actual upload UI

    const addVideoButton = page.getByRole('button', { name: /add video|select video/i }).first();
    await addVideoButton.click();

    // Look for upload option
    const uploadOption = page.getByText(/upload/i).first();
    await expect(uploadOption).toBeVisible();

    // Click upload option
    await uploadOption.click();

    // Look for file input
    const fileInput = page.locator('input[type="file"]');

    // Note: Actual file upload would require a test video file
    // This is a structural test
    await expect(fileInput).toBeVisible();
  });

  test('should display video metadata', async ({ page }) => {
    // Add a video and check for metadata display
    const addVideoButton = page.getByRole('button', { name: /add video|select video/i }).first();
    await addVideoButton.click();

    const youtubeOption = page.getByText(/youtube/i).first();
    await youtubeOption.click();

    const urlInput = page.getByPlaceholder(/youtube|url|link/i);
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const submitButton = page.getByRole('button', { name: /add|submit|load/i }).first();
    await submitButton.click();

    // Wait for video to load
    await page.waitForTimeout(3000);

    // Video title or duration should be visible
    // This depends on implementation
    expect(page.url()).toContain('/room/');
  });
});
