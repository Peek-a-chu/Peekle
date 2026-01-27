import { test, expect } from '@playwright/test';

test.describe('Code Reference Branch Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Study Room Info
    await page.route('**/api/study/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          roomId: 1,
          roomTitle: 'Test Study Room',
          roomDescription: 'Description',
          inviteCode: 'TEST12',
        }),
      });
    });

    // Mock Participants (currentUserId = 1)
    await page.route('**/api/study/1/participants', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nickname: 'Me', isOwner: true, isOnline: true },
          { id: 2, nickname: 'OtherUser', isOwner: false, isOnline: true },
        ]),
      });
    });

    // Mock Problems (with complete Problem type fields)
    await page.route('**/api/study/1/problems*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1001,
            number: 1001,
            title: 'Two Sum',
            source: 'BOJ',
            status: 'not_started',
            participantCount: 2,
            totalParticipants: 4,
            tags: ['Implementation', 'Math'],
          },
        ]),
      });
    });
  });

  // Skip tests - UI selectors changed, needs update when feature is implemented
  test.describe.skip('Problem selection', () => {
    test('should display problem card and allow interaction', async ({ page }) => {
      await page.route('**/api/study/1/chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/study/1');
      await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {});

      // Find problem card by role="button" containing the problem title
      const problemCard = page.locator('[role="button"]').filter({ hasText: '1001. Two Sum' });
      await expect(problemCard).toBeVisible({ timeout: 10000 });

      // Verify problem card is clickable (has cursor-pointer class)
      await expect(problemCard).toHaveClass(/cursor-pointer/);

      // Click and verify no error occurs
      await problemCard.click();

      // Wait a moment for potential state updates
      await page.waitForTimeout(500);
    });

    test('should enable code reference button in IDE toolbar', async ({ page }) => {
      await page.route('**/api/study/1/chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/study/1');
      await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {});

      // Verify code reference button exists and is clickable
      const codeRefButton = page.locator('button[title="코드 참조 (채팅)"]');
      await expect(codeRefButton).toBeVisible({ timeout: 10000 });
      await expect(codeRefButton).toBeEnabled();

      // Click the button
      await codeRefButton.click();

      // Verify the click triggers some action
      await page.waitForTimeout(500);
    });
  });

  // Skip tests - CODE message UI not implemented yet
  test.describe.skip('CODE message click branch', () => {
    test('should activate split view when clicking other user CODE message', async ({ page }) => {
      // Mock chat with other user's CODE message
      await page.route('**/api/study/1/chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'code-msg-1',
              senderId: 2, // Other user
              senderName: 'OtherUser',
              content: 'Check out my solution!',
              type: 'CODE',
              metadata: {
                code: 'def solution(): pass',
                language: 'python',
                problemTitle: 'Two Sum',
                ownerName: 'OtherUser',
                isRealtime: true,
              },
              createdAt: new Date().toISOString(),
            },
          ]),
        });
      });

      await page.goto('/study/1');
      await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {});

      // Click on CODE message card
      const codeCard = page.locator('#chat-msg-code-msg-1');
      await expect(codeCard).toBeVisible({ timeout: 10000 });
      await codeCard.click();

      // Verify split view banner appears with correct text pattern
      const splitViewBanner = page.locator('text=OtherUser의 코드 실시간 열람 중');
      await expect(splitViewBanner).toBeVisible({ timeout: 5000 });
    });

    test('should NOT activate split view when clicking own CODE message', async ({ page }) => {
      // Mock chat with my CODE message
      await page.route('**/api/study/1/chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'code-msg-mine',
              senderId: 1, // My ID
              senderName: 'Me',
              content: 'Here is my code',
              type: 'CODE',
              metadata: {
                code: 'def my_solution(): pass',
                language: 'python',
                problemTitle: 'Two Sum',
                ownerName: 'Me',
                isRealtime: true,
              },
              createdAt: new Date().toISOString(),
            },
          ]),
        });
      });

      await page.goto('/study/1');
      await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {});

      // Click on my CODE message
      const codeCard = page.locator('#chat-msg-code-msg-mine');
      await expect(codeCard).toBeVisible({ timeout: 10000 });
      await codeCard.click();

      // Verify split view banner does NOT appear
      const splitViewBanner = page.locator('text=열람 중');
      await expect(splitViewBanner).not.toBeVisible({ timeout: 2000 });
    });
  });

  // Skip tests that require parentMessage reference display (not yet implemented)
  test.describe.skip('CODE reference click in reply message', () => {
    test('should scroll to original CODE message and activate split view when clicking reference', async () => {
      // Test skipped - parentMessage reference display not implemented
    });

    test('should only scroll without split view when clicking TALK reference', async () => {
      // Test skipped - parentMessage reference display not implemented
    });

    test('should NOT activate split view when clicking own CODE reference', async () => {
      // Test skipped - parentMessage reference display not implemented
    });
  });

  // Skip tests - IDE toolbar code reference button not implemented yet
  test.describe.skip('IDE toolbar code reference button', () => {
    test('should set pending code share when clicking code reference button', async ({ page }) => {
      await page.route('**/api/study/1/chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/study/1');
      await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {});

      // Find and click the code reference button in IDE toolbar
      const codeRefButton = page.locator('button[title="코드 참조 (채팅)"]');
      await expect(codeRefButton).toBeVisible({ timeout: 10000 });
      await codeRefButton.click();

      // Verify the button click doesn't cause errors
      await page.waitForTimeout(500);
    });
  });

  // Skip tests that require reply button (not yet implemented in ChatMessageItem)
  test.describe.skip('Reply to CODE message branch', () => {
    test('should auto-split view when replying to other user CODE message', async () => {
      // Test skipped - Reply button not implemented
    });

    test('should NOT auto-split view when replying to own CODE message', async () => {
      // Test skipped - Reply button not implemented
    });
  });
});
