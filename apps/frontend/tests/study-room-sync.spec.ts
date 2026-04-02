import { expect, test } from '@playwright/test';

test.describe('Study room bootstrap and presence sync', () => {
  test('hydrates from one bootstrap snapshot and dedupes concurrent fallback refreshes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await page.goto('/e2e/study-room-sync');

    await expect(page.getByTestId('sync-phase')).toHaveText('COMPLETE', { timeout: 30000 });
    await expect(page.getByTestId('bootstrap-request-count')).toHaveText('1');
    await expect(page.getByTestId('total-room-request-count')).toHaveText('2');
    await expect(page.getByTestId('refresh-invocation-count')).toHaveText('2');
    await expect(page.getByTestId('fallback-network-request-count')).toHaveText('1');
    await expect(page.getByTestId('dedupe-result')).toHaveText('DEDUPED');
    await expect(page.getByTestId('participant-count')).toHaveText('3');
    await expect(page.getByTestId('owner-name')).toHaveText('OtherUser');
    await expect(page.getByTestId('hydrated-third-user')).toHaveText('Charlie');
    await expect(page.getByTestId('participant-name-3')).toHaveText('Charlie');

    await expect(page.getByTestId('flow-log')).toContainText(
      'Concurrent fallback completed with 1 network request',
    );

    await page.screenshot({
      path: 'output/playwright/study-room-sync-e2e.png',
      fullPage: true,
    });
  });
});
