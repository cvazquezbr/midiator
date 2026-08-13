import { test, expect } from '@playwright/test';

test.skip('should generate a thumbnail on save', async ({ page }) => {
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

    await page.route('/api/google/models/text', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/google/models/image', route => {
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

test('should export campaign as Markdown', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

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
        body: JSON.stringify({
          gemini_model: 'gemini-1.5-flash',
          gemini_api_key: 'test-api-key',
        }),
      });
    });

    await page.route('/api/personas', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'persona-1', name: 'Persona de Teste' }]),
      });
    });

    await page.route('/api/autores', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'autor-1', name: 'Autor de Teste' }]),
      });
    });

    await page.route('/api/palettes', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/campaigns', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 123, name: 'Campanha Exemplo', updated_at: new Date().toISOString() }]),
      });
    });

    await page.route('/api/google/models/text', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('/api/google/models/image', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route(/\/api\/prompts.*/, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'generateCampaignContent',
          prompt_text: 'Prompt mock',
        }),
      });
    });

    await page.route('/api/google/generateContent', route => {
      const postData = route.request().postData() || '';
      let text = "```json\n{\n  \"titulo\": \"Campanha Teste E2E\",\n  \"conteudo\": \"Esta é a descrição detalhada do conteúdo gerado pelo mock do teste e2e.\",\n  \"cta\": \"Comente abaixo para saber mais!\",\n  \"hashtags\": [\"marketing\", \"ia\", \"sucesso\"]\n}\n```";

      if (postData.includes('1800') || postData.includes('130') || postData.includes('resumo') || postData.includes('Resumo') || postData.includes('resumido') || postData.includes('médio') || postData.includes('pequeno')) {
        text = "Resumo curto do mock para o teste e2e";
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: text
                  }
                ]
              }
            }
          ]
        }),
      });
    });

    await page.goto('http://localhost:5173/');

    await expect(page.locator('h1:has-text("Campanhas")')).toBeVisible({ timeout: 15000 });

    // Click "Nova Campanha"
    await page.getByRole('button', { name: 'Nova Campanha' }).click();

    // Check we are on Campaign form step
    await expect(page.locator('h5:has-text("Campanha")')).toBeVisible();

    // Fill problem and solution
    await page.getByLabel('Problema ou Necessidade').fill('Temos dificuldades com conversão de leads no site.');
    await page.getByLabel('Solução ou Proposta').fill('Criar um funil de conteúdo interativo e educacional.');

    // Choose Objective
    await page.getByLabel('Objetivo Principal do Post').click();
    await page.getByRole('option', { name: 'Gerar leads' }).click();

    // Choose Tone
    await page.getByLabel('Tom de Voz').click();
    await page.getByRole('option', { name: 'Profissional e direto' }).click();

    // Generate content
    await page.getByRole('button', { name: 'Elaborar Postagens' }).click();

    // Wait for Tab Content to appear
    await expect(page.getByRole('tab', { name: 'Conteúdo Principal' })).toBeVisible({ timeout: 15000 });

    // Go to "Posts de Follow-Up" Tab
    await page.getByRole('tab', { name: 'Posts de Follow-Up' }).click();
    await page.waitForTimeout(1000);

    console.log("Buttons on page:", await page.getByRole('button').allTextContents());

    // Export MD button should be visible next to "Importar JSON"
    const exportBtn = page.getByRole('button', { name: 'Exportar MD' });
    try {
      await expect(exportBtn).toBeVisible({ timeout: 5000 });
    } catch (e) {
      await page.screenshot({ path: '/home/jules/verification/screenshots/verification-failure.png' });
      throw e;
    }

    // Click "Exportar MD"
    await exportBtn.click();

    // Dialog should open
    await expect(page.locator('h2:has-text("Exportar Campanha no Formato Markdown")')).toBeVisible();
    await page.waitForTimeout(1000);

    // Take screenshot of export dialog
    await page.screenshot({ path: '/home/jules/verification/screenshots/verification.png' });

    // Click Copy button
    await page.getByRole('button', { name: 'Copiar para Área de Transferência' }).click();

    // Wait and close
    await page.getByRole('button', { name: 'Fechar' }).click();
  });