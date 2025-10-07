import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console logs to catch client-side errors
    page.on("console", lambda msg: print(f"CONSOLE LOG: {msg.text}"))

    try:
        # Navigate to the login page
        page.goto("http://localhost:5173/login")

        # Wait for the email input to be editable before trying to fill it
        email_input = page.get_by_label("Email")
        expect(email_input).to_be_editable(timeout=15000)
        email_input.fill("user@example.com")

        # Wait for the password input to be editable
        password_input = page.get_by_label("Senha")
        expect(password_input).to_be_editable()
        password_input.fill("user_password")

        page.get_by_role("button", name="Entrar").click()

        # Wait for navigation to the home page and for the "Briefings" button to be visible
        expect(page).to_have_url(re.compile(r".*/$"), timeout=15000)
        briefings_button = page.get_by_role("button", name="Briefings")
        expect(briefings_button).to_be_visible()
        briefings_button.click()

        # Verify that the "Novo Briefing" button is visible, which indicates the page has loaded
        novo_briefing_button = page.get_by_role("button", name="Novo Briefing")
        expect(novo_briefing_button).to_be_visible()

        # Take a screenshot of the briefings page
        page.screenshot(path="jules-scratch/verification/briefings_page.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        # Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)