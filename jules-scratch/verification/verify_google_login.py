import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:5173/")

        # Wait for the page to load and find the "Sign In with Google" button.
        # Using a user-facing role is best practice.
        google_button = page.get_by_role("button", name=re.compile("Sign In with Google", re.IGNORECASE))

        # Assert that the button is visible on the page.
        expect(google_button).to_be_visible()

        # Take a screenshot to visually verify the login page.
        page.screenshot(path="jules-scratch/verification/login_page_with_new_button.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
