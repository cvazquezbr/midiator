import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:5173/")

            # 1. Click the gear icon and take a screenshot of the modal
            settings_button = page.get_by_label("Configurações")
            await expect(settings_button).to_be_visible()
            await settings_button.click()

            await page.wait_for_selector('div[role="dialog"]')
            await page.screenshot(path="jules-scratch/verification/setup_modal.png")

            # 2. Click the close button
            close_button = page.get_by_role("button", name="Fechar")
            await expect(close_button).to_be_visible()
            await close_button.click()

            # 3. Click the "..." menu and take a screenshot
            more_actions_button = page.get_by_label("Mais ações")
            await expect(more_actions_button).to_be_visible()
            await more_actions_button.click()

            await page.wait_for_selector('ul[role="menu"]')
            await page.screenshot(path="jules-scratch/verification/more_actions_menu.png")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

asyncio.run(main())
