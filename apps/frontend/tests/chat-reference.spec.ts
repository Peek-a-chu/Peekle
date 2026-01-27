import { test, expect } from '@playwright/test';

test.describe('Chat Message Reference', () => {
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
    // Wait for the room title or some indicator that the room is loaded
    await page.waitForSelector('text=Test Study Room', { timeout: 10000 }).catch(() => {
      console.log('Room title not found. Current URL:', page.url());
    });
  });

  test('should show reply preview when reply button is clicked', async ({ page }) => {
    // Debug: list all div IDs
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('div[id]')).map(d => d.id));
    console.log('Available IDs:', ids.filter(id => id.startsWith('chat-msg')));

    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();

    const replyButton = messageItem.getByTitle('답장');
    await expect(replyButton).toBeVisible();
    await replyButton.click();

    // Check if reply preview appears in input area
    const replyPreview = page.locator('text=User2 : Hello, this is a message to reply to.');
    await expect(replyPreview).toBeVisible();

    // Check if input is focused
    await expect(page.locator('#chat-input')).toBeFocused();
  });

  test('should clear reply preview when X is clicked', async ({ page }) => {
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();
    await messageItem.getByTitle('답장').click();

    const closeButton = page.locator('button:has(svg.lucide-x)');
    await closeButton.click();

    const replyPreview = page.locator('text=User2 : Hello, this is a message to reply to.');
    await expect(replyPreview).not.toBeVisible();
  });

  test('should highlight original message when reference is clicked', async ({ page }) => {
    // 1. Click reply
    const messageItem = page.locator('#chat-msg-msg-1');
    await messageItem.hover();
    await messageItem.getByTitle('답장').click();

    // 2. Type and send (This would trigger socket emit in real app, but we can check if it adds to UI if we mock socket)
    // For this test, let's assume we want to check the handleParentClick logic.
    // We can simulate a message with a parentMessage already in history.
    
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
              type: 'TALK'
            },
            createdAt: new Date().toISOString(),
          }
        ]),
      });
    });
    
    await page.reload();

    const replyMsg = page.locator('#chat-msg-msg-2');
    const referenceBox = replyMsg.locator('text=User2: Hello, this is a message to reply to.');
    await expect(referenceBox).toBeVisible();

    // Click reference
    await referenceBox.click();

    // Check if original message gets highlighted (ring-2 class)
    const originalMsg = page.locator('#chat-msg-msg-1');
    await expect(originalMsg).toHaveClass(/ring-2/);

    // Wait for highlight to disappear
    await expect(originalMsg).not.toHaveClass(/ring-2/, { timeout: 3000 });
  });
});
