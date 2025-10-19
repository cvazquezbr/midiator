
import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:5173")

    # Login
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Login").click()

    # Load a campaign
    page.get_by_role("button", name="Load Campaign").first.click()
    page.get_by_text("Test Campaign").click()

    # Open the page editor
    page.get_by_role("button", name="Edit Page").first.click()

    # Open the text editor
    page.get_by_role("button", name="Edit Content").click()

    # Verify the title
    expect(page.get_by_role("heading", name=re.compile("Editar.*"))).to_be_visible()

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
