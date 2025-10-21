
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:5173")

            # Click on the button to open the suggestions modal
            await page.get_by_role("button", name="Sugerir Problemas").click()

            # Wait for the suggestions to appear
            await expect(page.get_by_text("Alinhamento Estratégico e Comunicação com Stakeholders")).to_be_visible()

            await page.screenshot(path="jules-scratch/verification/verification.png")
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
