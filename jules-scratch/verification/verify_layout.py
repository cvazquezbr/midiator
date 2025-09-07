import asyncio
from playwright.async_api import async_playwright, expect
import random
import string

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:5173/")

            # Go to Sign Up page
            await page.get_by_role("link", name="Sign Up").click()

            # Register a new user
            email = f"testuser_{random_string()}@example.com"
            password = "password123"
            await page.get_by_label("Name").fill("Test User")
            await page.get_by_label("Email Address").fill(email)
            await page.get_by_label("Password", exact=True).fill(password)
            await page.get_by_label("Confirm Password").fill(password)
            await page.get_by_role("button", name="Sign Up").click()

            # Wait for navigation after registration
            await page.wait_for_load_state('networkidle')
            await page.screenshot(path="jules-scratch/verification/after_signup.png")
            print("Signed up and took screenshot.")

            # Now, on the "My Campaigns" page, find and click "Nova Campanha"
            await page.get_by_role("button", name="Nova Campanha").click()
            print("Clicked 'Nova Campanha'.")

            # Step 2: Content -> Standards
            await page.get_by_role("button", name="Avançar").click()
            print("Clicked 'Avançar' 1.")

            # Step 3: Standards -> Image
            await page.get_by_role("button", name="Avançar").click()
            print("Clicked 'Avançar' 2.")

            # Now at Step 4: Imagem e Formatação
            await expect(page.get_by_role("heading", name="Editor de Página")).to_be_visible()
            print("On image step.")

            # Take final screenshot
            await page.screenshot(path="jules-scratch/verification/verification.png")

            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

asyncio.run(main())
