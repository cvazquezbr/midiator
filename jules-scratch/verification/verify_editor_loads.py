
import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")

        # Login
        page.get_by_label("Email").fill("test@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()

        # Wait for navigation to the campaigns page
        expect(page).to_have_url(re.compile(r".*\/campaigns"))
        page.wait_for_selector("text=Nova Campanha")

        # Open the first campaign
        page.get_by_role("button", name="Abrir Campanha").first.click()

        # Wait for the editor to load
        expect(page).to_have_url(re.compile(r".*\/campaigns\/.*"))
        page.wait_for_selector("text=Editor de Página")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
