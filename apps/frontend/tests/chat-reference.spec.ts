import { expect, test } from '@playwright/test';

test.describe('Chat Message Reference', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto('/e2e/study-interactions');
  });

  test('should show reply preview when reply button is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();

    const replyButton = page.getByTestId('reply-button-msg-1');
    await expect(replyButton).toBeVisible();
    await replyButton.click();

    await expect(page.getByTestId('reply-preview')).toBeVisible();
    await expect(page.getByTestId('reply-preview')).toContainText(
      'OtherUser : Hello, this is a message to reply to.',
    );
    await expect(page.getByTestId('replying-to')).toHaveText('msg-1');
    await expect(page.locator('#chat-input')).toBeFocused();
  });

  test('should clear reply preview when X is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();
    await page.getByTestId('reply-button-msg-1').click();

    await page.getByTestId('cancel-reply-button').click();

    await expect(page.getByTestId('reply-preview')).toBeHidden();
    await expect(page.getByTestId('replying-to')).toHaveText('-');
  });

  test('should highlight original message when reference is clicked', async ({ page }) => {
    await page.getByTestId('chat-reference-msg-2').click();

    const originalMessage = page.locator('#chat-msg-msg-1');
    await expect(originalMessage).toHaveClass(/ring-2/);
    await expect(originalMessage).not.toHaveClass(/ring-2/, { timeout: 4000 });
  });
});
