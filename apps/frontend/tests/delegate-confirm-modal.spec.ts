import { test, expect } from '@playwright/test';

test.describe('Delegate Confirm Modal', () => {
  test('should open delegate modal and show correct content', async ({ page }) => {
    // 1. Mock API Responses
    // User info (Me = Owner)
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            nickname: 'OwnerUser',
            email: 'owner@example.com',
            role: 'USER',
            profileImage: null,
          },
        }),
      });
    });

    // Study Room Info (including members)
    await page.route('**/api/studies/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            title: 'Test Study Room',
            description: 'Description',
            inviteCode: 'TEST12',
            managerId: 1, // I am manager
            members: [
              { userId: 1, nickname: 'OwnerUser', role: 'OWNER', profileImage: null },
              { userId: 2, nickname: 'TargetUser', role: 'MEMBER', profileImage: null },
            ],
          },
        }),
      });
    });

    // Mock other calls with standardized response format
    await page.route('**/api/studies/1/chats', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: { content: [] } }),
      });
    });

    await page.route('**/api/problems**', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.route('**/api/studies/1/problems**', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.route('**/api/studies/1/submissions**', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
    });

    // 2. Navigate to Study Room
    await page.goto('/study/1');

    // 3. Wait for TargetUser card
    const targetUserText = page.getByText('TargetUser');
    await expect(targetUserText).toBeVisible({ timeout: 10000 });

    // 4. Click Menu (MoreVertical)
    // Use robust JS traversal to find the menu button associated with this user
    await targetUserText.evaluate((el) => {
      let parent = el.parentElement;
      // Traverse up to find the card container.
      // We identify it by looking for a button with SVG inside (the menu button)
      // OR by looking for the 'group' class if present.
      // Let's go up 6 levels max
      for (let i = 0; i < 6; i++) {
        if (!parent) break;
        // Check if this parent has the menu button
        const btn = parent.querySelector('button');
        if (btn) {
          // Verify it is the right button (e.g. has SVG or is the only button in this scope)
          // The menu button is usually the only button in the card in collapsed state
          // But owner has no other buttons?
          btn.click();
          return;
        }
        parent = parent.parentElement;
      }
      throw new Error('Could not find menu button in ancestors');
    });

    // 5. Click "방장 넘기기"
    const delegateButton = page.getByRole('button', { name: '방장 넘기기' });
    await expect(delegateButton).toBeVisible();
    await delegateButton.click();

    // 6. Assert Modal Content
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('방장 위임');
    await expect(modal).toContainText('TargetUser님에게 방장을 위임하시겠습니까?');

    // 7. Verify Buttons
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await expect(page.getByRole('button', { name: '위임하기' })).toBeVisible();
  });
});
