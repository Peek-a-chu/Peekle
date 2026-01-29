import { test, expect } from '@playwright/test';

test.describe('Whiteboard - User Colors', () => {
  const USER_COLORS = [
    '#E53935', // Red
    '#1E88E5', // Blue
    '#43A047', // Green
    '#FB8C00', // Orange
    '#8E24AA', // Purple
    '#00ACC1', // Cyan
    '#F4511E', // Deep Orange
    '#3949AB', // Indigo
    '#7CB342', // Light Green
    '#C0CA33', // Lime
  ];

  test('Different users should have different colors derived from their ID', async ({ browser }) => {
    // 1. Setup User A (ID: 1001)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    // Debug console
    pageA.on('console', msg => console.log(`PAGE A LOG: ${msg.text()}`));
    pageA.on('pageerror', err => console.log(`PAGE A ERROR: ${err.message}`));

    const userIdA = 1001;
    // Ensure we wait for the canvas to be ready
    await pageA.goto(`http://localhost:3001/study/999/whiteboard?userId=${userIdA}`);
    await pageA.waitForTimeout(3000); // Increased wait

    // Check if canvas exists
    const canvasEl = await pageA.$('canvas');
    if (!canvasEl) {
        console.error('Canvas element NOT FOUND on Page A');
        // Dump body
        const body = await pageA.content();
        console.log('Body content:', body.substring(0, 500));
    }

    // Check color for User A
    const colorA = await pageA.evaluate(async () => {
         const canvas = (window as any).fabricCanvas;
         if (!canvas) return 'CANVAS_NOT_FOUND_IN_WINDOW';
         return canvas.freeDrawingBrush?.color;
    });
    
    // 2. Setup User B (ID: 1002)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userIdB = 1002;
    await pageB.goto(`http://localhost:3001/study/999/whiteboard?userId=${userIdB}`);
    await pageB.waitForTimeout(3000);

     // Check color for User B
    const colorB = await pageB.evaluate(() => {
         const canvas = (window as any).fabricCanvas;
         return canvas?.freeDrawingBrush?.color;
    });

    console.log(`User ${userIdA} Color:`, colorA);
    console.log(`User ${userIdB} Color:`, colorB);

    // Assertions
    expect(USER_COLORS).toContain(colorA);
    expect(USER_COLORS).toContain(colorB);
    expect(colorA).not.toBe('#000000'); // Should not be default black
    expect(colorB).not.toBe('#000000');
    expect(colorA).not.toBe(colorB);
  });
});
