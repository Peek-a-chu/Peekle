import { test, expect } from '@playwright/test';

// Skip all tests in this file - Reply button feature is not yet implemented in ChatMessageItem
test.describe.skip('Chat Message Reference', () => {
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

    // Mock Participants
    await page.route('**/api/study/1/participants', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nickname: 'Me', isOwner: true, isOnline: true },
          { id: 2, nickname: 'User2', isOwner: false, isOnline: true },
        ]),
      });
    });

    // Mock Chat History
    await page.route('**/api/study/1/chats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'msg-1',
            senderId: 2,
            senderName: 'User2',
            content: 'Hello, this is a message to reply to.',
            type: 'TALK',
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Problems
    await page.route('**/api/study/1/problems*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/study/1');
    await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {
      console.log('Room title not found. Current URL:', page.url());
    });
  });

  test('should show reply preview when reply button is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();

    const replyButton = messageItem.getByTitle('Reply');
    await expect(replyButton).toBeVisible();
    await replyButton.click();

    const replyPreview = page.locator('text=User2 : Hello, this is a message to reply to.');
    await expect(replyPreview).toBeVisible();

    await expect(page.locator('#chat-input')).toBeFocused();
  });

  test('should clear reply preview when X is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();
    await messageItem.getByTitle('Reply').click();

    const closeButton = page.locator('button:has(svg.lucide-x)');
    await closeButton.click();

    const replyPreview = page.locator('text=User2 : Hello, this is a message to reply to.');
    await expect(replyPreview).not.toBeVisible();
  });

  test('should highlight original message when reference is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();
    await messageItem.getByTitle('Reply').click();

    await page.route('**/api/study/1/chats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'msg-1',
            senderId: 2,
            senderName: 'User2',
            content: 'Hello, this is a message to reply to.',
            type: 'TALK',
            createdAt: new Date(Date.now() - 10000).toISOString(),
          },
          {
            id: 'msg-2',
            senderId: 1,
            senderName: 'Me',
            content: 'I am replying to you.',
            type: 'TALK',
            parentMessage: {
              id: 'msg-1',
              senderId: 2,
              senderName: 'User2',
              content: 'Hello, this is a message to reply to.',
              type: 'TALK',
            },
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.reload();

    const replyMsg = page.locator('#chat-msg-msg-2');
    const referenceBox = replyMsg.locator('text=User2: Hello, this is a message to reply to.');
    await expect(referenceBox).toBeVisible();

    await referenceBox.click();

    const originalMsg = page.locator('#chat-msg-msg-1');
    await expect(originalMsg).toHaveClass(/ring-2/);

    await expect(originalMsg).not.toHaveClass(/ring-2/, { timeout: 3000 });
  });
});
