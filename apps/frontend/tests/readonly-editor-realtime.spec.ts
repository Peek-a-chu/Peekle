import { expect, test } from '@playwright/test';

test.describe('Readonly realtime editor', () => {
  test('keeps Monaco mounted while readonly packets update', async ({ page }) => {
    await page.goto('/e2e/readonly-editor');

    await expect(page.getByTestId('mount-count')).toHaveText('1', { timeout: 30000 });
    await expect(page.getByTestId('observed-editor-value')).toHaveText('print("a")');

    await page.getByTestId('apply-packet-1').click();
    await expect(page.getByTestId('incoming-packet')).toHaveText('print("ab")');
    await expect(page.getByTestId('observed-editor-value')).toHaveText('print("ab")');
    await expect(page.getByTestId('mount-count')).toHaveText('1');

    await page.getByTestId('apply-packet-2').click();
    await expect(page.getByTestId('incoming-packet')).toHaveText('print("abc")');
    await expect(page.getByTestId('observed-editor-value')).toHaveText('print("abc")');
    await expect(page.getByTestId('mount-count')).toHaveText('1');

    await page.getByTestId('apply-packet-3').click();
    await expect(page.getByTestId('incoming-packet')).toHaveText('print("abcd")');
    await expect(page.getByTestId('observed-editor-value')).toHaveText('print("abcd")');
    await expect(page.getByTestId('mount-count')).toHaveText('1');
  });
});
