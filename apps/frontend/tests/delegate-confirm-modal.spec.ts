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
            role: 'OWNER', // My role
            members: [
              { userId: 1, nickname: 'OwnerUser', role: 'OWNER', profileImage: null, isOnline: true },
              { userId: 2, nickname: 'TargetUser', role: 'MEMBER', profileImage: null, isOnline: true },
            ],
            owner: { id: 1 }, // Owner info
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

    // Wait for page to load and API calls to complete
    await page.waitForLoadState('networkidle');

    // 3. Click on "참여자" tab to show participants panel
    const participantsTab = page.getByRole('button', { name: /참여자/ });
    await expect(participantsTab).toBeVisible({ timeout: 10000 });
    await participantsTab.click();

    // 4. Wait for TargetUser card to appear in participants panel
    const targetUserText = page.getByText('TargetUser');
    await expect(targetUserText).toBeVisible({ timeout: 10000 });

    // 5. Click Menu (MoreVertical) button - find it in the same card as TargetUser
    await targetUserText.evaluate((el) => {
      // Find the card container (has 'group' class or 'rounded-xl')
      let card = el.closest('[class*="group"]') || el.closest('div[class*="rounded-xl"]');
      if (!card) {
        // Traverse up to find card container
        let parent = el.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!parent) break;
          if (parent.classList.contains('group') || parent.classList.contains('rounded-xl')) {
            card = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
      if (card) {
        const btn = card.querySelector('button[aria-label="메뉴"]');
        if (btn) {
          (btn as HTMLButtonElement).click();
          return;
        }
      }
      throw new Error('Could not find menu button in TargetUser card');
    });

    // 6. Click "방장 넘기기"
    const delegateButton = page.getByRole('button', { name: '방장 넘기기' });
    await expect(delegateButton).toBeVisible();
    await delegateButton.click();

    // 7. Assert Modal Content
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('방장 위임');
    await expect(modal).toContainText('TargetUser님에게 방장을 위임하시겠습니까?');

    // 8. Verify Buttons
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
    await expect(page.getByRole('button', { name: '위임하기' })).toBeVisible();
  });
});
