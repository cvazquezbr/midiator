from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:5173/login")
        page.get_by_label("Email").fill("test@test.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()
        expect(page).to_have_url("http://localhost:5173/")

        # 2. Load a campaign
        page.get_by_role("button", name="Campanha de Teste").click()
        expect(page.get_by_role("heading", name="Editor de Página")).to_be_visible()

        # 3. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)