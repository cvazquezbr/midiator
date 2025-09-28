import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})

        try:
            # --- Step 1: Navigate directly to the page ---
            # With mock data, we don't need to log in.
            await page.goto("http://localhost:5173/")

            # --- Step 2: Verify the Campaign List Page ---
            # The main heading should be visible
            await expect(page.locator('h1:has-text("Minhas Campanhas")')).to_be_visible(timeout=15000)

            # Wait for the mocked campaign cards to be rendered
            # We check for the first campaign's name.
            await expect(page.get_by_text("Cyber-Security Week")).to_be_visible(timeout=10000)

            # Hover over one of the cards to activate the featured view
            await page.hover('text=Q4 Product Launch')

            # Wait for a moment to ensure all styles, reflections, and the
            # featured background image are fully rendered.
            await page.wait_for_timeout(2000)

            # Capture the screenshot
            await page.screenshot(path="jules-scratch/verification/verification.png")

            print("Screenshot captured successfully: jules-scratch/verification/verification.png")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
            print("Error screenshot saved to jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())