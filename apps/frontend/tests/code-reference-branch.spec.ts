import { expect, test } from '@playwright/test';

test.describe('Code Reference Branch Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto('/e2e/study-interactions');
  });

  test.describe('Problem selection', () => {
    test('should display problem card and allow interaction', async ({ page }) => {
      const problemCard = page.locator('[data-testid="problem-card-1001"] [role="button"]');
      await expect(problemCard).toBeVisible();
      await expect(problemCard).toHaveClass(/cursor-pointer/);

      await problemCard.click();

      await expect(page.getByTestId('selected-problem')).toHaveText('1001. Two Sum');
      await expect(page.getByTestId('selected-problem-id')).toHaveText('1001');
    });

    test('should enable code reference button in IDE toolbar', async ({ page }) => {
      await page.locator('[data-testid="problem-card-1001"] [role="button"]').click();

      const codeRefButton = page.getByTestId('ide-share-code-button');
      await expect(codeRefButton).toBeVisible({ timeout: 30000 });
      await expect(codeRefButton).toBeEnabled();
    });
  });

  test.describe('CODE message click branch', () => {
    test('should activate split view when clicking other user CODE message', async ({ page }) => {
      await page.locator('#chat-msg-code-msg-1').click();

      await expect(page.getByTestId('view-mode')).toHaveText('SPLIT_REALTIME');
      await expect(page.getByTestId('viewing-user')).toHaveText('OtherUser');
      await expect(page.getByTestId('selected-problem')).toHaveText('1001. Two Sum');
    });

    test('should NOT activate split view when clicking own CODE message', async ({ page }) => {
      await page.locator('#chat-msg-code-msg-mine').click();

      await expect(page.getByTestId('view-mode')).toHaveText('ONLY_MINE');
      await expect(page.getByTestId('viewing-user')).toHaveText('-');
    });
  });

  test.describe('CODE reference click in reply message', () => {
    test('should scroll to original CODE message and activate split view when clicking reference', async ({
      page,
    }) => {
      await page.getByTestId('chat-reference-msg-ref-code-other').click();

      await expect(page.locator('#chat-msg-code-msg-1')).toHaveClass(/ring-2/);
      await expect(page.getByTestId('view-mode')).toHaveText('SPLIT_REALTIME');
      await expect(page.getByTestId('viewing-user')).toHaveText('OtherUser');
    });

    test('should only scroll without split view when clicking TALK reference', async ({ page }) => {
      await page.getByTestId('chat-reference-msg-ref-talk').click();

      await expect(page.locator('#chat-msg-msg-1')).toHaveClass(/ring-2/);
      await expect(page.getByTestId('view-mode')).toHaveText('ONLY_MINE');
      await expect(page.getByTestId('viewing-user')).toHaveText('-');
    });

    test('should NOT activate split view when clicking own CODE reference', async ({ page }) => {
      await page.getByTestId('chat-reference-msg-ref-code-mine').click();

      await expect(page.locator('#chat-msg-code-msg-mine')).toHaveClass(/ring-2/);
      await expect(page.getByTestId('view-mode')).toHaveText('ONLY_MINE');
      await expect(page.getByTestId('viewing-user')).toHaveText('-');
    });
  });

  test.describe('IDE toolbar code reference button', () => {
    test('should set pending code share when clicking code reference button', async ({ page }) => {
      await page.locator('[data-testid="problem-card-1001"] [role="button"]').click();
      await page.getByTestId('ide-share-code-button').click();

      await expect(page.getByTestId('pending-code-share')).toBeVisible();
      await expect(page.getByTestId('pending-share-owner')).toHaveText('Me');
      await expect(page.getByTestId('pending-code-share')).toContainText('Two Sum');
      await expect(page.locator('#chat-input')).toBeFocused();
    });
  });

  test.describe('Reply to CODE message branch', () => {
    test('should auto-split view when replying to other user CODE message', async ({ page }) => {
      const codeMessage = page.locator('#chat-msg-code-msg-1');
      await codeMessage.hover();
      await page.getByTestId('reply-button-code-msg-1').click();

      await expect(page.getByTestId('reply-preview')).toContainText(
        'OtherUser : Check out my solution!',
      );
      await expect(page.getByTestId('replying-to')).toHaveText('code-msg-1');
      await expect(page.getByTestId('view-mode')).toHaveText('SPLIT_REALTIME');
      await expect(page.getByTestId('viewing-user')).toHaveText('OtherUser');
    });

    test('should NOT auto-split view when replying to own CODE message', async ({ page }) => {
      const codeMessage = page.locator('#chat-msg-code-msg-mine');
      await codeMessage.hover();
      await page.getByTestId('reply-button-code-msg-mine').click();

      await expect(page.getByTestId('reply-preview')).toContainText('Me : Here is my code.');
      await expect(page.getByTestId('replying-to')).toHaveText('code-msg-mine');
      await expect(page.getByTestId('view-mode')).toHaveText('ONLY_MINE');
      await expect(page.getByTestId('viewing-user')).toHaveText('-');
    });
  });
});
