import { test, expect } from '@playwright/test';

test('should generate a thumbnail on save', async ({ page }) => {
    // NOTE: This test was temporarily disabled due to a Vitest/Playwright
    // runner conflict, which has now been resolved by excluding E2E tests
    // from the Vitest configuration in vite.config.js.

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`PAGE CONSOLE ERROR: ${msg.text()}`);
      }
    });

    await page.route('/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        }),
      });
    });

    await page.route('/api/settings', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('/api/personas', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/autores', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/palettes', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/campaigns', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('http://localhost:5173/');

    try {
      await expect(page.locator('h1:has-text("Campanhas")')).toBeVisible({ timeout: 15000 });
    } catch (error) {
      await page.screenshot({ path: '/home/jules/verification/render-failure.png' });
      throw error;
    }

    await page.getByRole('button', { name: 'Conjunto de Páginas' }).click();
    await expect(page.locator('h2:has-text("Conjuntos de Páginas")')).toBeVisible();

    await page.getByLabel('Criar Conjunto de Páginas').click();
    await page.getByLabel('Nome do Conjunto de Páginas').fill('Test Thumbnail PageSet');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.locator('h2:has-text("Editor de Páginas")')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar Página' }).click();

    await page.locator('.page-thumbnail-container').first().click();
    await expect(page.locator('h2:has-text("Editor de Página")')).toBeVisible();

    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.locator('h2:has-text("Editor de Páginas")')).toBeVisible();

    const thumbnail = page.locator('.page-thumbnail-container img').first();
    await expect(thumbnail).toBeVisible();
    const thumbnailUrl = await thumbnail.getAttribute('src');
    expect(thumbnailUrl).toContain('blob:http://localhost:5173/');

    await page.screenshot({ path: '/home/jules/verification/thumbnail-verification.png' });
  });
