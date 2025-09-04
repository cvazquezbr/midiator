import asyncio
from playwright.async_api import async_playwright, expect
import random
import string
import time

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        email = f"testuser_{int(time.time())}_{random_string()}@test.com"
        password = "password123"
        print(f"Using email: {email}")

        # Sign up
        await page.goto("http://localhost:5175/signup")
        await page.get_by_label("Full Name *").fill("Test User")
        await page.get_by_label("Email Address *").fill(email)
        await page.get_by_label("Password (min. 8 characters) *").fill(password)
        await page.get_by_role("button", name="SIGN UP").click()

        print("Waiting for 10 seconds after signup click...")
        await page.wait_for_timeout(10000)

        print("Taking screenshot and getting content...")
        await page.screenshot(path="jules-scratch/verification/debug_signup_final_state.png")
        print(await page.content())

        # Now, let's manually check if we are on the login page
        if "/login" in page.url:
            print("Successfully navigated to login page.")
        else:
            print(f"Failed to navigate to login page. Current URL is {page.url}")
            await browser.close()
            return

        # Log in
        await page.get_by_label("Email Address").fill(email)
        await page.get_by_label("Password").fill(password)
        await page.locator('button[type="submit"]:has-text("Sign In")').click()

        await page.wait_for_url("**/")

        # Upload a background image
        async with page.expect_file_chooser() as fc_info:
            await page.get_by_role("button", name="Adicionar Fundo").click()
        file_chooser = await fc_info.value
        await file_chooser.set_files("test/test.jpg")

        await page.wait_for_timeout(2000)

        # Select the background image
        await page.locator(".konvajs-content").click(position={"x": 10, "y": 10})

        await page.wait_for_timeout(1000)

        # Change background properties
        # Size
        await page.get_by_label("Largura").fill("800")
        # Position
        await page.get_by_label("X").fill("100")
        await page.get_by_label("Y").fill("50")
        # Rotation
        await page.get_by_label("Rotação").fill("15")

        # Shadow
        await page.get_by_label("Sombra").check()

        await page.wait_for_timeout(1000)

        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser.close()

asyncio.run(main())
